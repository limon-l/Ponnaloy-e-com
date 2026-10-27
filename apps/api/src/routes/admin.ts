import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { paginationSchema } from "../validators";
import { invalidateProductCache } from "../lib/redis";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
] as const;

type OrderStatusValue = (typeof ORDER_STATUSES)[number];

const ROLES = ["CUSTOMER", "ADMIN", "SUPER_ADMIN"] as const;
type RoleValue = (typeof ROLES)[number];

/**
 * Permitted forward transitions. Anything else requires an explicit `force`
 * override with a mandatory note, which is recorded in the audit log.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURNED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED", "REFUNDED"],
  CANCELLED: [],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
};

const RESTOCK_STATUSES: OrderStatusValue[] = ["CANCELLED", "RETURNED"];

function isOrderStatus(value: unknown): value is OrderStatusValue {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

function isRole(value: unknown): value is RoleValue {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function parsePagination(query: unknown) {
  const parsed = paginationSchema.safeParse(query);
  if (parsed.success) {
    return { page: parsed.data.page, limit: parsed.data.limit };
  }
  return { page: 1, limit: 20 };
}

function startOfUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * MongoDB transactions can abort with a write conflict when two admins act on
 * the same order simultaneously. Those are safe to retry; the conditional
 * status update then reports the conflict explicitly.
 */
function isRetryableTransactionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  if (code === "P2034") return true;
  const message = (error as { message?: string }).message ?? "";
  return /writeconflict|write conflict|deadlock/i.test(message);
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // All admin routes require admin role. Authorization is enforced server-side;
  // the web guard is only a UX convenience.
  app.addHook("preHandler", requireAdmin);

  // ───────────────────────────── Dashboard ─────────────────────────────
  app.get("/stats", async () => {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - 29);

    const [
      totalProducts,
      totalUsers,
      totalOrders,
      revenueAggregate,
      recentOrders,
      lowStockCandidates,
      pendingFulfillment,
      chartOrders,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      prisma.order.findMany({
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.product.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { variants: { some: { stock: { lt: 10 } } } },
            // Products without variants use their own stock field.
            { variants: { none: {} }, stock: { lt: 10 } },
          ],
        },
        include: {
          variants: { select: { stock: true } },
          images: { orderBy: { position: "asc" }, take: 1 },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.order.count({
        where: { status: { in: ["CONFIRMED", "PROCESSING"] } },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: since },
          status: { not: "CANCELLED" },
        },
        select: { createdAt: true, total: true },
      }),
    ]);

    const lowStockProducts = lowStockCandidates.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      image: product.images[0]?.url ?? null,
      effectiveStock:
        product.variants.length > 0
          ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
          : product.stock,
    }));

    // Daily revenue for the last 30 days (real aggregation, not a groupBy on
    // exact timestamps).
    const byDay = new Map<string, { date: string; revenue: number; orders: number }>();
    for (let offset = 0; offset < 30; offset += 1) {
      const day = new Date(since);
      day.setUTCDate(since.getUTCDate() + offset);
      const key = startOfUtcDay(day);
      byDay.set(key, { date: key, revenue: 0, orders: 0 });
    }
    for (const order of chartOrders) {
      const key = startOfUtcDay(order.createdAt);
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.revenue += order.total;
        bucket.orders += 1;
      }
    }

    return {
      success: true,
      data: {
        totalProducts,
        totalUsers,
        totalOrders,
        totalRevenue: revenueAggregate._sum.total ?? 0,
        pendingOrders: await prisma.order.count({ where: { status: "PENDING" } }),
        pendingFulfillment,
        recentOrders,
        lowStockProducts,
        revenueByDay: Array.from(byDay.values()),
      },
    };
  });

  // ───────────────────────────── Products ──────────────────────────────
  app.get("/products", async (request) => {
    const { page, limit } = parsePagination(request.query);
    const { search, status, categoryId } = request.query as {
      search?: string;
      status?: string;
      categoryId?: string;
    };

    const where: Record<string, unknown> = {};
    if (status && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
      where.status = status;
    }
    if (categoryId) where.categoryId = categoryId;
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { position: "asc" } },
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          variants: { select: { id: true, name: true, stock: true } },
          _count: { select: { variants: true, reviews: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data: products.map((product) => ({
        ...product,
        effectiveStock:
          product.variants.length > 0
            ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
            : product.stock,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  });

  // ────────────────────────────── Orders ───────────────────────────────
  app.get("/orders", async (request) => {
    const { page, limit } = parsePagination(request.query);
    const { status, search } = request.query as {
      status?: string;
      search?: string;
    };

    const where: Record<string, unknown> = {};
    if (status && isOrderStatus(status)) where.status = status;
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: "insensitive" } },
        { user: { email: { contains: term, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          items: { include: { product: { select: { id: true, name: true } } } },
          payments: { select: { status: true, method: true, amount: true } },
          shipments: {
            select: {
              carrier: true,
              trackingNumber: true,
              status: true,
              actualDelivery: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  });

  app.get("/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        items: { include: { product: { select: { id: true, name: true } } } },
        payments: true,
        shipments: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) {
      return reply.code(404).send({ success: false, error: "Order not found" });
    }

    return { success: true, data: order };
  });

  // Update order status. Stock is returned exactly once when an order is
  // cancelled or returned, guarded by `restockedAt`.
  app.put("/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status?: string;
      note?: string;
      trackingNumber?: string;
      carrier?: string;
      force?: boolean;
    };

    if (!isOrderStatus(body.status)) {
      return reply.code(400).send({
        success: false,
        error: "Invalid status",
        code: "INVALID_STATUS",
      });
    }
    const nextStatus = body.status;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      return reply.code(404).send({ success: false, error: "Order not found" });
    }

    const previousStatus = order.status as OrderStatusValue;

    if (previousStatus === nextStatus) {
      return reply.code(400).send({
        success: false,
        error: `Order is already ${nextStatus}`,
        code: "SAME_STATUS",
      });
    }

    if (
      !body.force &&
      !ALLOWED_TRANSITIONS[previousStatus].includes(nextStatus)
    ) {
      return reply.code(409).send({
        success: false,
        error: `Cannot move an order from ${previousStatus} to ${nextStatus}.`,
        code: "INVALID_TRANSITION",
      });
    }

    if (body.force && !body.note?.trim()) {
      return reply.code(400).send({
        success: false,
        error: "A note is required when overriding the normal order flow.",
        code: "NOTE_REQUIRED",
      });
    }

    const noteParts = [body.note?.trim()].filter(Boolean) as string[];
    if (body.force) {
      noteParts.push(`(forced from ${previousStatus} by admin)`);
    }

    // Restock only when inventory has never been returned for this order.
    // `restockedAt` is written in the same conditional update as the status, so
    // concurrent cancellation/return attempts cannot double-restock.
    const shouldRestock =
      RESTOCK_STATUSES.includes(nextStatus) && order.restockedAt === null;

    const applyTransition = () =>
      prisma.$transaction(async (tx) => {
        // Conditional update makes concurrent admin actions safe: only the
        // transition that observed the current status can proceed.
        const claim = await tx.order.updateMany({
          where: { id, status: previousStatus },
          data: {
            status: nextStatus as never,
            ...(shouldRestock ? { restockedAt: new Date() } : {}),
          },
        });

        if (claim.count === 0) return { conflict: true as const };

        await tx.orderStatusLog.create({
          data: {
            orderId: id,
            status: nextStatus as never,
            note: noteParts.length > 0 ? noteParts.join(" ") : null,
            actorId: request.user!.id,
            actorRole: request.user!.role,
          },
        });

        if (nextStatus === "SHIPPED") {
          const shipment = await tx.shipment.findFirst({
            where: { orderId: id },
          });
          const data = {
            carrier: body.carrier?.trim() || null,
            trackingNumber: body.trackingNumber?.trim() || null,
            status: "shipped",
          };
          if (shipment) {
            await tx.shipment.update({ where: { id: shipment.id }, data });
          } else {
            await tx.shipment.create({ data: { orderId: id, ...data } });
          }
        }

        if (nextStatus === "OUT_FOR_DELIVERY") {
          await tx.shipment.updateMany({
            where: { orderId: id },
            data: { status: "out_for_delivery" },
          });
        }

        if (nextStatus === "DELIVERED") {
          await tx.shipment.updateMany({
            where: { orderId: id },
            data: { status: "delivered", actualDelivery: new Date() },
          });
        }

        if (shouldRestock) {
          for (const item of order.items) {
            if (item.variantId) {
              await tx.productVariant.updateMany({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              });
            } else {
              await tx.product.updateMany({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });
            }
            await tx.product.update({
              where: { id: item.productId },
              data: { totalSold: { decrement: item.quantity } },
            });
          }
        }

        return { conflict: false as const };
      });

    let transition: { conflict: boolean } | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        transition = await applyTransition();
        break;
      } catch (error) {
        if (attempt < 2 && isRetryableTransactionError(error)) continue;

        // If the write conflict means another actor already moved the order,
        // report a deterministic conflict instead of a 500.
        const latest = await prisma.order.findUnique({
          where: { id },
          select: { status: true },
        });
        if (latest && latest.status !== previousStatus) {
          return reply.code(409).send({
            success: false,
            error:
              "The order was updated by someone else. Reload and try again.",
            code: "CONCURRENT_UPDATE",
          });
        }
        throw error;
      }
    }

    if (!transition) {
      return reply.code(409).send({
        success: false,
        error: "Could not apply the status change. Please retry.",
        code: "CONCURRENT_UPDATE",
      });
    }

    if (transition.conflict) {
      return reply.code(409).send({
        success: false,
        error: "The order was updated by someone else. Reload and try again.",
        code: "CONCURRENT_UPDATE",
      });
    }

    await invalidateProductCache();

    return {
      success: true,
      message: "Order status updated",
      data: { id, status: nextStatus },
    };
  });

  // ────────────────────────────── Users ────────────────────────────────
  app.get("/users", async (request) => {
    const { page, limit } = parsePagination(request.query);
    const { search, role } = request.query as {
      search?: string;
      role?: string;
    };

    const where: Record<string, unknown> = {};
    if (role && isRole(role)) where.role = role;
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  });

  app.put("/users/:id/role", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role } = request.body as { role?: string };

    if (!isRole(role)) {
      return reply.code(400).send({ success: false, error: "Invalid role" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.code(404).send({ success: false, error: "User not found" });
    }

    if (id === request.user!.id && role !== request.user!.role) {
      return reply.code(400).send({
        success: false,
        error: "Cannot change your own role",
        code: "SELF_ROLE_CHANGE",
      });
    }

    // Never leave the platform without a super administrator.
    if (user.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
      const superAdmins = await prisma.user.count({
        where: { role: "SUPER_ADMIN", isActive: true },
      });
      if (superAdmins <= 1) {
        return reply.code(409).send({
          success: false,
          error: "Cannot demote the last active super administrator.",
          code: "LAST_SUPER_ADMIN",
        });
      }
    }

    await prisma.user.update({
      where: { id },
      data: { role: role as never },
    });

    return { success: true, message: "User role updated" };
  });

  app.put("/users/:id/toggle", async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.code(404).send({ success: false, error: "User not found" });
    }

    if (id === request.user!.id) {
      return reply.code(400).send({
        success: false,
        error: "Cannot deactivate yourself",
        code: "SELF_DEACTIVATION",
      });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    return {
      success: true,
      message: `User ${user.isActive ? "deactivated" : "activated"}`,
    };
  });
};
