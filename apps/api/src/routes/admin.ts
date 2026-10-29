import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { invalidateAuthCache } from "../lib/auth-cache";
import { paginationSchema } from "../validators";
import { invalidateProductCache } from "../lib/redis";
import { indexProduct, removeProduct } from "../lib/meili";
import { productModerationSchema } from "../validators";
import { createStripeRefund, isStripeConfigured } from "../lib/stripe";

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
      sellerStatusCounts,
      pendingSellerApplications,
      sellerOrderAggregate,
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
      prisma.sellerOrganization.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.sellerApplication.count({
        where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      }),
      prisma.sellerOrder.aggregate({
        where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
        _sum: { total: true, commissionAmount: true },
        _count: { _all: true },
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

    const sellerCounts = Object.fromEntries(
      sellerStatusCounts.map((row) => [row.status, row._count._all])
    );

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
        sellers: {
          total: Object.values(sellerCounts).reduce(
            (sum, value) => sum + Number(value),
            0
          ),
          approved: sellerCounts.APPROVED ?? 0,
          pending: sellerCounts.PENDING ?? 0,
          suspended: sellerCounts.SUSPENDED ?? 0,
          rejected: sellerCounts.REJECTED ?? 0,
          pendingApplications: pendingSellerApplications,
        },
        marketplace: {
          sellerOrders: sellerOrderAggregate._count._all,
          sellerGmv: sellerOrderAggregate._sum.total ?? 0,
          commissionRevenue: sellerOrderAggregate._sum.commissionAmount ?? 0,
        },
      },
    };
  });

  // ───────────────────────────── Products ──────────────────────────────
  app.get("/products", async (request) => {
    const { page, limit } = parsePagination(request.query);
    const { search, status, categoryId, moderationStatus } = request.query as {
      search?: string;
      status?: string;
      categoryId?: string;
      moderationStatus?: string;
    };

    const where: Record<string, unknown> = {};
    if (status && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) {
      where.status = status;
    }
    if (
      moderationStatus &&
      ["PENDING", "APPROVED", "REJECTED"].includes(moderationStatus)
    ) {
      where.moderationStatus = moderationStatus;
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
          seller: { select: { id: true, name: true, slug: true, status: true } },
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

  // Approve or reject a seller product. Approval publishes an active listing;
  // rejection keeps the product as a draft with a moderation note.
  app.put("/products/:id/moderation", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = productModerationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid moderation payload",
        details: parsed.error.flatten(),
      });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return reply.code(404).send({ success: false, error: "Product not found" });
    }
    if (!product.sellerId) {
      return reply.code(400).send({
        success: false,
        error: "Platform products do not require seller moderation.",
        code: "NOT_SELLER_PRODUCT",
      });
    }

    const { status, note } = parsed.data;
    if (status === "REJECTED" && !note?.trim()) {
      return reply.code(400).send({
        success: false,
        error: "A rejection reason is required.",
        code: "NOTE_REQUIRED",
      });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        moderationStatus: status,
        moderationNote: status === "REJECTED" ? note?.trim() ?? null : null,
        status:
          status === "APPROVED"
            ? product.status === "ARCHIVED"
              ? "ARCHIVED"
              : "ACTIVE"
            : "DRAFT",
      },
      include: {
        images: { orderBy: { position: "asc" } },
        seller: { select: { id: true, name: true, slug: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: request.user!.id,
        action: `product.moderation.${status.toLowerCase()}`,
        entity: "Product",
        entityId: id,
        details: { sellerId: product.sellerId, note: note ?? null },
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      },
    });

    if (status === "APPROVED") {
      await indexProduct({
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        description: updated.description || "",
        price: updated.price,
        categoryId: updated.categoryId,
        brandId: updated.brandId,
        status: updated.status,
        isFeatured: updated.isFeatured,
        isTrending: updated.isTrending,
        isNewArrival: updated.isNewArrival,
        avgRating: updated.avgRating,
        totalSold: updated.totalSold,
        createdAt: updated.createdAt.toISOString(),
      });
    } else {
      await removeProduct(id);
    }

    await invalidateProductCache();

    return { success: true, data: updated };
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
          sellerOrders: {
            select: {
              id: true,
              status: true,
              total: true,
              commissionAmount: true,
              seller: { select: { id: true, name: true } },
            },
          },
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
        sellerOrders: {
          include: {
            seller: { select: { id: true, name: true, slug: true, status: true } },
            statusHistory: { orderBy: { createdAt: "asc" } },
            items: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                total: true,
                product: { select: { id: true, name: true } },
              },
            },
          },
        },
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
      include: {
        items: {
          include: { sellerOrder: { select: { restockedAt: true } } },
        },
      },
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

        // Keep seller partitions consistent when an administrator cancels or
        // returns a parent order. `restockedAt` is set here so neither the
        // seller nor a later admin action can restock the items again.
        if (RESTOCK_STATUSES.includes(nextStatus)) {
          const openPartitions = await tx.sellerOrder.findMany({
            where: {
              orderId: id,
              status: { notIn: ["CANCELLED", "RETURNED", "REFUNDED"] },
            },
            select: { id: true },
          });
          if (openPartitions.length > 0) {
            const now = new Date();
            await tx.sellerOrder.updateMany({
              where: {
                orderId: id,
                status: { notIn: ["CANCELLED", "RETURNED", "REFUNDED"] },
              },
              data: { status: nextStatus as never, restockedAt: now },
            });
            for (const partition of openPartitions) {
              await tx.sellerOrderStatusLog.create({
                data: {
                  sellerOrderId: partition.id,
                  status: nextStatus as never,
                  note: `Parent order ${nextStatus.toLowerCase()} by admin`,
                  actorId: request.user!.id,
                  actorRole: request.user!.role,
                },
              });
            }
          }
        }

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
            // Items belonging to a seller partition that already restocked
            // (for example a seller cancellation) must not be returned twice.
            if (item.sellerOrder?.restockedAt) continue;
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

        // A write conflict after all retries means another actor is modifying
        // the same order. Report a deterministic conflict instead of a 500.
        if (isRetryableTransactionError(error)) {
          return reply.code(409).send({
            success: false,
            error:
              "The order was updated by someone else. Reload and try again.",
            code: "CONCURRENT_UPDATE",
          });
        }

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

    invalidateAuthCache(id);

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

    invalidateAuthCache(id);

    return {
      success: true,
      message: `User ${user.isActive ? "deactivated" : "activated"}`,
    };
  });

  // ── Payments: gateway refunds ──────────────────────────────────────────────
  /**
   * Executes a card refund through Stripe for a collected payment.
   *
   * The amount is capped at the persisted payment amount; the caller supplies
   * an idempotency key so a retried request cannot refund twice. Cash and bank
   * transfer payments are intentionally rejected here because no gateway can
   * execute them — those remain a manual finance process.
   */
  app.post("/payments/:id/refund", async (request, reply) => {
    if (!isStripeConfigured()) {
      return reply.code(503).send({
        success: false,
        error: "Card refunds are not configured on this platform.",
        code: "STRIPE_NOT_CONFIGURED",
      });
    }

    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as {
      amount?: number;
      reason?: string;
      idempotencyKey?: string;
    };

    const headerKey = request.headers["idempotency-key"];
    const idempotencyKey =
      body.idempotencyKey || (typeof headerKey === "string" ? headerKey : "");

    if (!idempotencyKey || idempotencyKey.length < 8) {
      return reply.code(400).send({
        success: false,
        error: "An idempotency key of at least 8 characters is required for refunds.",
        code: "IDEMPOTENCY_KEY_REQUIRED",
      });
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { order: { select: { id: true, orderNumber: true, status: true } } },
    });

    if (!payment) {
      return reply.code(404).send({ success: false, error: "Payment not found" });
    }

    if (payment.method !== "STRIPE") {
      return reply.code(409).send({
        success: false,
        error:
          "Only card payments can be refunded through the gateway. Cash and bank transfer refunds require the manual finance process.",
        code: "REFUND_NOT_GATEWAY_SUPPORTED",
      });
    }

    if (payment.status !== "SUCCEEDED" || !payment.transactionId) {
      return reply.code(409).send({
        success: false,
        error: `This payment cannot be refunded. Current status: ${payment.status}.`,
        code: "PAYMENT_NOT_REFUNDABLE",
      });
    }

    const amount = body.amount ?? payment.amount;
    if (!Number.isInteger(amount) || amount <= 0 || amount > payment.amount) {
      return reply.code(400).send({
        success: false,
        error: `Refund amount must be a whole number of cents between 1 and ${payment.amount}.`,
        code: "REFUND_AMOUNT_INVALID",
      });
    }

    const refundKey = `admin-refund:${payment.id}:${idempotencyKey}`;
    const existingEvent = await prisma.paymentEvent.findUnique({
      where: { eventId: refundKey },
    });
    if (existingEvent) {
      return reply.code(200).send({
        success: true,
        message: "This refund request was already processed.",
        data: existingEvent.payload,
        idempotent: true,
      });
    }

    let refund;
    try {
      refund = await createStripeRefund({
        paymentIntentId: payment.transactionId,
        amount: amount === payment.amount ? undefined : amount,
        reason: body.reason,
        idempotencyKey: refundKey,
      });
    } catch (error) {
      request.log.error({ err: error, paymentId: payment.id }, "Stripe refund failed");
      return reply.code(502).send({
        success: false,
        error: "The payment provider rejected the refund. No funds were moved.",
        code: "STRIPE_REFUND_FAILED",
      });
    }

    const isFullRefund = amount === payment.amount && refund.status === "succeeded";
    const summary = {
      refundId: refund.id,
      paymentId: payment.id,
      orderId: payment.orderId,
      amount,
      currency: payment.currency,
      status: refund.status,
      full: isFullRefund,
    };

    await prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: {
          eventId: refundKey,
          type: "refund.created",
          provider: "stripe",
          orderId: payment.orderId,
          paymentId: payment.id,
          payload: summary,
        },
      });

      const metadata =
        typeof payment.metadata === "object" && payment.metadata !== null
          ? (payment.metadata as Record<string, unknown>)
          : {};
      const refunds = Array.isArray(metadata.refunds) ? metadata.refunds : [];

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isFullRefund ? "REFUNDED" : payment.status,
          metadata: {
            ...metadata,
            refunds: [...refunds, summary],
          },
        },
      });

      if (isFullRefund) {
        const transition = await tx.order.updateMany({
          where: {
            id: payment.orderId,
            status: { notIn: ["CANCELLED", "REFUNDED"] },
          },
          data: { status: "REFUNDED" },
        });
        if (transition.count > 0) {
          await tx.orderStatusLog.create({
            data: {
              orderId: payment.orderId,
              status: "REFUNDED",
              note: `Full card refund ${refund.id} processed by ${request.user!.email}`,
              actorId: request.user!.id,
              actorRole: request.user!.role,
            },
          });
        }
      }

      await tx.activityLog.create({
        data: {
          userId: request.user!.id,
          action: "payment.refund",
          entity: "Payment",
          entityId: payment.id,
          details: summary as never,
          ip: request.ip,
          userAgent: request.headers["user-agent"] ?? null,
        },
      });
    });

    return reply.code(201).send({
      success: true,
      message: isFullRefund
        ? "Full refund processed."
        : "Partial refund submitted. The order remains active.",
      data: summary,
    });
  });
};
