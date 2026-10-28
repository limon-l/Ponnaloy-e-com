import { FastifyPluginAsync } from "fastify";
import type { OrderStatus } from "@prisma/client";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  requireSeller,
  requireSellerMembership,
  requireSellerPermission,
} from "../middleware/seller";
import { PERMISSIONS } from "../lib/permissions";
import {
  sellerApplicationSchema,
  sellerProductSchema,
  updateProductSchema,
  sellerOrderStatusSchema,
  storefrontUpdateSchema,
} from "../validators";
import { slugify } from "@ponnaloy/shared";
import { invalidateProductCache } from "../lib/redis";
import { indexProduct, removeProduct } from "../lib/meili";

const SELLER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
  REFUNDED: [],
};

async function uniqueSellerSlug(name: string): Promise<string> {
  const base = slugify(name) || `seller-${Date.now()}`;
  let slug = base;
  let counter = 1;
  while (await prisma.sellerOrganization.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

async function uniqueProductSlug(name: string): Promise<string> {
  const base = slugify(name) || `product-${Date.now()}`;
  let slug = base;
  let counter = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

/**
 * Recompute the parent order status from seller partitions. This only runs
 * when every item belongs to a seller order; mixed platform/seller orders keep
 * the parent status under admin control.
 */
async function recomputeParentOrderStatus(
  orderId: string,
  actorId: string,
  actorRole: string
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      items: { select: { sellerOrderId: true } },
      sellerOrders: { select: { status: true } },
    },
  });

  if (!order || order.sellerOrders.length === 0) return;
  if (order.items.some((item) => !item.sellerOrderId)) return;

  const statuses = order.sellerOrders.map((item) => item.status);
  const terminal = ["CANCELLED", "RETURNED", "REFUNDED"];
  const active = statuses.filter((status) => !terminal.includes(status));
  const all = (allowed: string[], list = statuses) =>
    list.every((status) => allowed.includes(status));

  let next: OrderStatus;
  if (statuses.every((status) => status === "CANCELLED")) {
    next = "CANCELLED";
  } else if (active.length === 0) {
    // Every partition reached a terminal non-cancelled state (returned or
    // refunded) without any outstanding fulfilment work.
    next = "REFUNDED";
  } else if (all(["DELIVERED"], active)) {
    next = "DELIVERED";
  } else if (all(["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"], active)) {
    next = active.some((status) => status === "OUT_FOR_DELIVERY")
      ? "OUT_FOR_DELIVERY"
      : "SHIPPED";
  } else if (all(["PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"], active)) {
    next = "PROCESSING";
  } else if (
    all(["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"], active)
  ) {
    next = "CONFIRMED";
  } else {
    next = "PENDING";
  }

  if (next === order.status) return;

  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: order.status },
    data: { status: next },
  });
  if (updated.count === 0) return;

  await prisma.orderStatusLog.create({
    data: {
      orderId,
      status: next,
      note: "Aggregated from seller fulfillment",
      actorId,
      actorRole,
    },
  });
}

export const sellerRoutes: FastifyPluginAsync = async (app) => {
  // ── Onboarding ───────────────────────────────────────────────────────────

  app.post("/apply", { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = sellerApplicationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid seller application",
        details: parsed.error.flatten(),
      });
    }

    const userId = request.user!.id;
    const existing = await prisma.sellerMembership.findFirst({
      where: { userId, isActive: true },
      include: { seller: { select: { status: true } } },
    });

    if (existing && ["PENDING", "APPROVED", "SUSPENDED"].includes(existing.seller.status)) {
      return reply.code(409).send({
        success: false,
        error: "You already have a seller account or pending application.",
        code: "SELLER_ALREADY_REGISTERED",
        data: { status: existing.seller.status },
      });
    }

    const pendingApplication = await prisma.sellerApplication.findFirst({
      where: { userId, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      select: { id: true },
    });
    if (pendingApplication) {
      return reply.code(409).send({
        success: false,
        error: "Your application is already under review.",
        code: "SELLER_APPLICATION_PENDING",
      });
    }

    const data = parsed.data;
    const slug = await uniqueSellerSlug(data.businessName);

    try {
      const result = await prisma.$transaction(async (tx) => {
        const seller = await tx.sellerOrganization.create({
          data: {
            name: data.businessName,
            slug,
            description: data.description,
            status: "PENDING",
            supportEmail: data.contactEmail,
            supportPhone: data.contactPhone,
            businessAddress: data.address,
            ownerId: userId,
          },
        });

        await tx.sellerMembership.create({
          data: { sellerId: seller.id, userId, role: "OWNER" },
        });

        const application = await tx.sellerApplication.create({
          data: {
            userId,
            sellerId: seller.id,
            businessName: data.businessName,
            businessType: data.businessType,
            registrationNumber: data.registrationNumber,
            taxId: data.taxId,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            address: data.address,
            description: data.description,
            status: "SUBMITTED",
          },
        });

        await tx.activityLog.create({
          data: {
            userId,
            action: "seller.application.submitted",
            entity: "SellerApplication",
            entityId: application.id,
            details: { sellerId: seller.id, businessName: data.businessName },
            ip: request.ip,
            userAgent: request.headers["user-agent"],
          },
        });

        return { seller, application };
      });

      return reply.code(201).send({
        success: true,
        data: result,
        message: "Seller application submitted for review.",
      });
    } catch (error) {
      app.log.error({ err: error, userId }, "Failed to submit seller application");
      return reply.code(500).send({
        success: false,
        error: "Could not submit the seller application. Please try again.",
      });
    }
  });

  app.get("/application", { preHandler: [requireAuth] }, async (request) => {
    const application = await prisma.sellerApplication.findFirst({
      where: { userId: request.user!.id },
      include: {
        seller: { select: { id: true, name: true, slug: true, status: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: application };
  });

  app.get("/me", { preHandler: [requireAuth] }, async (request) => {
    const [memberships, applications] = await Promise.all([
      prisma.sellerMembership.findMany({
        where: { userId: request.user!.id, isActive: true },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              logo: true,
              commissionRate: true,
              approvedAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.sellerApplication.findMany({
        where: { userId: request.user!.id },
        select: {
          id: true,
          businessName: true,
          status: true,
          reviewNote: true,
          submittedAt: true,
          reviewedAt: true,
          sellerId: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { success: true, data: { memberships, applications } };
  });

  // ── Dashboard and analytics ─────────────────────────────────────────────

  app.get("/dashboard", { preHandler: [requireSeller] }, async (request) => {
    const sellerId = request.sellerContext!.sellerId;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - 29);

    const [orders, products, lowStockProducts, recentOrders] = await Promise.all([
      prisma.sellerOrder.findMany({
        where: { sellerId },
        select: {
          status: true,
          subtotal: true,
          discount: true,
          shippingFee: true,
          total: true,
          commissionAmount: true,
          createdAt: true,
        },
      }),
      prisma.product.count({ where: { sellerId, status: "ACTIVE" } }),
      prisma.product.findMany({
        where: { sellerId, status: "ACTIVE" },
        select: { stock: true, variants: { select: { stock: true } } },
      }),
      prisma.sellerOrder.findMany({
        where: { sellerId },
        include: {
          order: { select: { orderNumber: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Effective stock lives on variants when a product has them; counting the
    // product-level field alone would overstate availability.
    const lowStock = lowStockProducts.filter((product) => {
      const stock =
        product.variants.length > 0
          ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
          : product.stock;
      return stock < 10;
    }).length;

    const nonCancelled = orders.filter(
      (order) => !["CANCELLED", "REFUNDED"].includes(order.status)
    );
    const grossSales = nonCancelled.reduce((sum, order) => sum + order.subtotal, 0);
    const netSales = nonCancelled.reduce((sum, order) => sum + order.total, 0);
    const commission = nonCancelled.reduce(
      (sum, order) => sum + order.commissionAmount,
      0
    );
    const statusCounts = orders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    }, {});

    const byDay = new Map<string, { date: string; revenue: number; orders: number }>();
    for (let offset = 0; offset < 30; offset += 1) {
      const day = new Date(since);
      day.setUTCDate(since.getUTCDate() + offset);
      const key = day.toISOString().slice(0, 10);
      byDay.set(key, { date: key, revenue: 0, orders: 0 });
    }
    for (const order of nonCancelled) {
      const key = order.createdAt.toISOString().slice(0, 10);
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.revenue += order.total;
        bucket.orders += 1;
      }
    }

    return {
      success: true,
      data: {
        grossSales,
        netSales,
        commission,
        netEarnings: netSales - commission,
        totalOrders: orders.length,
        pendingOrders: (statusCounts.PENDING ?? 0) + (statusCounts.CONFIRMED ?? 0),
        processingOrders: statusCounts.PROCESSING ?? 0,
        shippedOrders:
          (statusCounts.SHIPPED ?? 0) + (statusCounts.OUT_FOR_DELIVERY ?? 0),
        deliveredOrders: statusCounts.DELIVERED ?? 0,
        cancelledOrders: statusCounts.CANCELLED ?? 0,
        activeProducts: products,
        lowStockProducts: lowStock,
        statusCounts,
        recentOrders,
        revenueByDay: Array.from(byDay.values()),
      },
    };
  });

  app.get(
    "/analytics",
    { preHandler: [requireSellerPermission(PERMISSIONS.ANALYTICS_READ_OWN)] },
    async (request) => {
      const sellerId = request.sellerContext!.sellerId;
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      since.setUTCDate(since.getUTCDate() - 29);

      const [orders, items] = await Promise.all([
        prisma.sellerOrder.findMany({
          where: { sellerId, createdAt: { gte: since } },
          select: { status: true, total: true, commissionAmount: true, createdAt: true },
        }),
        prisma.orderItem.findMany({
          where: {
            sellerOrder: {
              sellerId,
              createdAt: { gte: since },
              status: { notIn: ["CANCELLED", "REFUNDED"] },
            },
          },
          include: { product: { select: { id: true, name: true, slug: true } } },
        }),
      ]);

      const byDay = new Map<string, { date: string; revenue: number; orders: number }>();
      for (let offset = 0; offset < 30; offset += 1) {
        const day = new Date(since);
        day.setUTCDate(since.getUTCDate() + offset);
        const key = day.toISOString().slice(0, 10);
        byDay.set(key, { date: key, revenue: 0, orders: 0 });
      }
      for (const order of orders) {
        if (["CANCELLED", "REFUNDED"].includes(order.status)) continue;
        const bucket = byDay.get(order.createdAt.toISOString().slice(0, 10));
        if (bucket) {
          bucket.revenue += order.total;
          bucket.orders += 1;
        }
      }

      const productTotals = new Map<
        string,
        { productId: string; name: string; slug: string; quantity: number; revenue: number }
      >();
      for (const item of items) {
        const existing = productTotals.get(item.productId) ?? {
          productId: item.productId,
          name: item.product.name,
          slug: item.product.slug,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.total;
        productTotals.set(item.productId, existing);
      }

      const statusCounts = orders.reduce<Record<string, number>>((acc, order) => {
        acc[order.status] = (acc[order.status] ?? 0) + 1;
        return acc;
      }, {});

      return {
        success: true,
        data: {
          revenueByDay: Array.from(byDay.values()),
          statusCounts,
          topProducts: Array.from(productTotals.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10),
        },
      };
    }
  );

  // ── Seller product CRUD ─────────────────────────────────────────────────

  app.get(
    "/products",
    { preHandler: [requireSellerPermission(PERMISSIONS.PRODUCT_READ_OWN)] },
    async (request) => {
      const sellerId = request.sellerContext!.sellerId;
      const query = request.query as {
        page?: string;
        limit?: string;
        search?: string;
        status?: string;
        moderationStatus?: string;
      };
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
      const where: Record<string, unknown> = { sellerId };

      if (query.status && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(query.status)) {
        where.status = query.status;
      }
      if (
        query.moderationStatus &&
        ["PENDING", "APPROVED", "REJECTED"].includes(query.moderationStatus)
      ) {
        where.moderationStatus = query.moderationStatus;
      }
      if (query.search?.trim()) {
        const term = query.search.trim();
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
            _count: { select: { orderItems: true, reviews: true } },
          },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);

      return {
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
  );

  app.post(
    "/products",
    { preHandler: [requireSellerPermission(PERMISSIONS.PRODUCT_CREATE_OWN)] },
    async (request, reply) => {
      const parsed = sellerProductSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "Invalid product data",
          details: parsed.error.flatten(),
        });
      }

      const data = parsed.data;
      const sellerId = request.sellerContext!.sellerId;
      const slug = data.slug ? slugify(data.slug) : await uniqueProductSlug(data.name);

      if (await prisma.product.findUnique({ where: { slug } })) {
        return reply.code(409).send({
          success: false,
          error: "A product with this slug already exists.",
        });
      }

      if (data.categoryId) {
        const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
        if (!category) {
          return reply.code(400).send({ success: false, error: "Invalid category." });
        }
      }
      if (data.brandId) {
        const brand = await prisma.brand.findUnique({ where: { id: data.brandId } });
        if (!brand) {
          return reply.code(400).send({ success: false, error: "Invalid brand." });
        }
      }

      const product = await prisma.product.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          shortDescription: data.shortDescription,
          sku: data.sku,
          price: data.price,
          compareAtPrice: data.compareAtPrice,
          costPrice: data.costPrice,
          barcode: data.barcode,
          stock: data.stock,
          weight: data.weight,
          categoryId: data.categoryId,
          brandId: data.brandId,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          sellerId,
          // Seller products always start as drafts pending moderation, even if
          // the seller requested ACTIVE. Admin approval publishes them.
          status: "DRAFT",
          moderationStatus: "PENDING",
          images: data.images ? { create: data.images } : undefined,
          variants: data.variants ? { create: data.variants } : undefined,
          specifications: data.specifications
            ? { create: data.specifications }
            : undefined,
        },
        include: {
          images: true,
          variants: true,
          specifications: true,
          category: true,
          brand: true,
        },
      });

      await invalidateProductCache();

      return reply.code(201).send({
        success: true,
        data: product,
        message: "Product submitted for moderation.",
      });
    }
  );

  app.put(
    "/products/:id",
    { preHandler: [requireSellerPermission(PERMISSIONS.PRODUCT_UPDATE_OWN)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const sellerId = request.sellerContext!.sellerId;
      const parsed = updateProductSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "Invalid product data",
          details: parsed.error.flatten(),
        });
      }

      const existing = await prisma.product.findFirst({ where: { id, sellerId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: "Product not found" });
      }

      const data = parsed.data;
      const updateData: Record<string, unknown> = {};
      const materialKeys = [
        "name",
        "description",
        "shortDescription",
        "price",
        "compareAtPrice",
        "categoryId",
        "brandId",
        "images",
        "variants",
        "specifications",
      ] as const;
      const materialChange = materialKeys.some((key) => data[key] !== undefined);

      for (const key of [
        "name",
        "description",
        "shortDescription",
        "sku",
        "price",
        "compareAtPrice",
        "costPrice",
        "barcode",
        "weight",
        "categoryId",
        "brandId",
        "metaTitle",
        "metaDescription",
        "stock",
      ] as const) {
        if (data[key] !== undefined) updateData[key] = data[key];
      }

      if (data.name !== undefined && !data.slug) {
        updateData.slug = await uniqueProductSlug(data.name);
      } else if (data.slug) {
        updateData.slug = slugify(data.slug);
      }

      if (data.images !== undefined) {
        updateData.images = { deleteMany: {}, create: data.images };
      }
      if (data.variants !== undefined) {
        updateData.variants = { deleteMany: {}, create: data.variants };
      }
      if (data.specifications !== undefined) {
        updateData.specifications = { deleteMany: {}, create: data.specifications };
      }

      if (materialChange) {
        updateData.moderationStatus = "PENDING";
        updateData.moderationNote = null;
        updateData.status = "DRAFT";
      } else if (data.status !== undefined) {
        if (data.status === "ARCHIVED" || data.status === "DRAFT") {
          updateData.status = data.status;
        } else if (data.status === "ACTIVE") {
          updateData.status =
            existing.moderationStatus === "APPROVED" ? "ACTIVE" : "DRAFT";
        }
      }

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          images: true,
          variants: true,
          specifications: true,
          category: true,
          brand: true,
        },
      });

      await invalidateProductCache();

      // Only moderated, active listings may remain in the public search index.
      if (product.status === "ACTIVE" && product.moderationStatus === "APPROVED") {
        await indexProduct({
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description || "",
          price: product.price,
          categoryId: product.categoryId,
          brandId: product.brandId,
          status: product.status,
          isFeatured: product.isFeatured,
          isTrending: product.isTrending,
          isNewArrival: product.isNewArrival,
          avgRating: product.avgRating,
          totalSold: product.totalSold,
          createdAt: product.createdAt.toISOString(),
        });
      } else {
        await removeProduct(product.id);
      }

      return {
        success: true,
        data: product,
        message: materialChange
          ? "Changes submitted for moderation."
          : "Product updated.",
      };
    }
  );

  app.delete(
    "/products/:id",
    { preHandler: [requireSellerPermission(PERMISSIONS.PRODUCT_DELETE_OWN)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const sellerId = request.sellerContext!.sellerId;
      const existing = await prisma.product.findFirst({ where: { id, sellerId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: "Product not found" });
      }

      const [orderReferences, reviewReferences] = await Promise.all([
        prisma.orderItem.count({ where: { productId: id } }),
        prisma.review.count({ where: { productId: id } }),
      ]);

      if (orderReferences > 0 || reviewReferences > 0) {
        await prisma.product.update({
          where: { id },
          data: { status: "ARCHIVED" },
        });
        await invalidateProductCache();
        await removeProduct(id);
        return {
          success: true,
          archived: true,
          message: "Product archived because it is referenced by orders or reviews.",
        };
      }

      await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { productId: id } }),
        prisma.wishlist.deleteMany({ where: { productId: id } }),
        prisma.productRelation.deleteMany({
          where: { OR: [{ sourceId: id }, { targetId: id }] },
        }),
        prisma.productImage.deleteMany({ where: { productId: id } }),
        prisma.productVariant.deleteMany({ where: { productId: id } }),
        prisma.productSpec.deleteMany({ where: { productId: id } }),
        prisma.product.delete({ where: { id } }),
      ]);

      await invalidateProductCache();
      await removeProduct(id);
      return { success: true, archived: false, message: "Product deleted" };
    }
  );

  // ── Seller order operations ─────────────────────────────────────────────

  app.get(
    "/orders",
    { preHandler: [requireSellerPermission(PERMISSIONS.ORDER_READ_ASSIGNED)] },
    async (request) => {
      const sellerId = request.sellerContext!.sellerId;
      const query = request.query as {
        page?: string;
        limit?: string;
        status?: string;
        search?: string;
      };
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
      const where: Record<string, unknown> = { sellerId };

      if (query.status && Object.keys(SELLER_TRANSITIONS).includes(query.status)) {
        where.status = query.status;
      }
      if (query.search?.trim()) {
        where.order = {
          orderNumber: { contains: query.search.trim(), mode: "insensitive" },
        };
      }

      const [orders, total] = await Promise.all([
        prisma.sellerOrder.findMany({
          where,
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                createdAt: true,
              },
            },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    sku: true,
                    images: { take: 1, orderBy: { position: "asc" } },
                  },
                },
              },
            },
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.sellerOrder.count({ where }),
      ]);

      return {
        success: true,
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
  );

  app.get(
    "/orders/:id",
    { preHandler: [requireSellerPermission(PERMISSIONS.ORDER_READ_ASSIGNED)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const sellerId = request.sellerContext!.sellerId;

      const order = await prisma.sellerOrder.findFirst({
        where: { id, sellerId },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              createdAt: true,
              notes: true,
              shippingAddress: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sku: true,
                  images: { take: 1, orderBy: { position: "asc" } },
                },
              },
            },
          },
          statusHistory: { orderBy: { createdAt: "asc" } },
          shipments: true,
        },
      });

      if (!order) {
        return reply.code(404).send({ success: false, error: "Seller order not found" });
      }

      return { success: true, data: order };
    }
  );

  app.put(
    "/orders/:id/status",
    { preHandler: [requireSellerPermission(PERMISSIONS.ORDER_FULFILL_ASSIGNED)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const sellerId = request.sellerContext!.sellerId;
      const parsed = sellerOrderStatusSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "Invalid status update",
          details: parsed.error.flatten(),
        });
      }

      const { status: nextStatus, note, carrier, trackingNumber } = parsed.data;
      const sellerOrder = await prisma.sellerOrder.findFirst({
        where: { id, sellerId },
        include: { items: true },
      });
      if (!sellerOrder) {
        return reply.code(404).send({ success: false, error: "Seller order not found" });
      }

      if (sellerOrder.status === nextStatus) {
        return reply.code(400).send({
          success: false,
          error: `Seller order is already ${nextStatus}`,
          code: "SAME_STATUS",
        });
      }

      if (!SELLER_TRANSITIONS[sellerOrder.status]?.includes(nextStatus)) {
        return reply.code(409).send({
          success: false,
          error: `Cannot move a seller order from ${sellerOrder.status} to ${nextStatus}.`,
          code: "INVALID_TRANSITION",
        });
      }

      const shouldRestock =
        nextStatus === "CANCELLED" && sellerOrder.restockedAt === null;

      let conflict = false;
      try {
        await prisma.$transaction(async (tx) => {
          const claim = await tx.sellerOrder.updateMany({
            where: { id, sellerId, status: sellerOrder.status },
            data: {
              status: nextStatus as OrderStatus,
              ...(shouldRestock ? { restockedAt: new Date() } : {}),
            },
          });
          if (claim.count === 0) {
            conflict = true;
            return;
          }

          await tx.sellerOrderStatusLog.create({
            data: {
              sellerOrderId: id,
              status: nextStatus as OrderStatus,
              note: note?.trim() || null,
              actorId: request.user!.id,
              actorRole: request.sellerContext!.membershipRole,
            },
          });

          if (nextStatus === "SHIPPED") {
            const shipment = await tx.shipment.findFirst({
              where: { sellerOrderId: id },
            });
            const shipmentData = {
              carrier: carrier?.trim() || null,
              trackingNumber: trackingNumber?.trim() || null,
              status: "shipped",
            };
            if (shipment) {
              await tx.shipment.update({ where: { id: shipment.id }, data: shipmentData });
            } else {
              await tx.shipment.create({
                data: {
                  orderId: sellerOrder.orderId,
                  sellerOrderId: id,
                  ...shipmentData,
                },
              });
            }
          }

          if (nextStatus === "OUT_FOR_DELIVERY") {
            await tx.shipment.updateMany({
              where: { sellerOrderId: id },
              data: { status: "out_for_delivery" },
            });
          }

          if (nextStatus === "DELIVERED") {
            await tx.shipment.updateMany({
              where: { sellerOrderId: id },
              data: { status: "delivered", actualDelivery: new Date() },
            });
          }

          if (shouldRestock) {
            for (const item of sellerOrder.items) {
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
              await tx.product.updateMany({
                where: { id: item.productId },
                data: { totalSold: { decrement: item.quantity } },
              });
            }
          }
        });
      } catch (error) {
        app.log.error({ err: error, sellerOrderId: id }, "Seller order transition failed");
        return reply.code(409).send({
          success: false,
          error: "The seller order was updated by someone else. Reload and try again.",
          code: "CONCURRENT_UPDATE",
        });
      }

      if (conflict) {
        return reply.code(409).send({
          success: false,
          error: "The seller order was updated by someone else. Reload and try again.",
          code: "CONCURRENT_UPDATE",
        });
      }

      await recomputeParentOrderStatus(
        sellerOrder.orderId,
        request.user!.id,
        request.sellerContext!.membershipRole
      );
      await invalidateProductCache();

      return {
        success: true,
        message: "Seller order status updated",
        data: { id, status: nextStatus },
      };
    }
  );

  // ── Storefront ──────────────────────────────────────────────────────────

  app.get("/storefront", { preHandler: [requireSeller] }, async (request) => {
    return { success: true, data: request.sellerContext!.seller };
  });

  app.put(
    "/storefront",
    { preHandler: [requireSellerPermission(PERMISSIONS.STOREFRONT_UPDATE_OWN)] },
    async (request, reply) => {
      const parsed = storefrontUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "Invalid storefront data",
          details: parsed.error.flatten(),
        });
      }

      const sellerId = request.sellerContext!.sellerId;
      const seller = await prisma.sellerOrganization.update({
        where: { id: sellerId },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description }
            : {}),
          ...(parsed.data.logo !== undefined ? { logo: parsed.data.logo } : {}),
          ...(parsed.data.banner !== undefined ? { banner: parsed.data.banner } : {}),
          ...(parsed.data.supportEmail !== undefined
            ? { supportEmail: parsed.data.supportEmail }
            : {}),
          ...(parsed.data.supportPhone !== undefined
            ? { supportPhone: parsed.data.supportPhone }
            : {}),
          ...(parsed.data.policies !== undefined
            ? { policies: parsed.data.policies }
            : {}),
        },
      });

      return { success: true, data: seller };
    }
  );

  // Expose membership resolution for the web shell without requiring an
  // approved store (so pending sellers can see their status).
  app.get(
    "/context",
    {
      preHandler: [
        async (request, reply) => {
          await requireSellerMembership(request, reply, { allowUnapproved: true });
        },
      ],
    },
    async (request) => ({
      success: true,
      data: {
        sellerId: request.sellerContext!.sellerId,
        role: request.sellerContext!.membershipRole,
        seller: request.sellerContext!.seller,
      },
    })
  );
};
