import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { paginationSchema, createProductSchema, updateProductSchema } from "../validators";
import { invalidateProductCache } from "../lib/redis";

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // All admin routes require admin role
  app.addHook("preHandler", requireAdmin);

  // Dashboard stats
  app.get("/stats", async () => {
    const [
      totalProducts,
      totalUsers,
      totalOrders,
      totalRevenue,
      recentOrders,
      lowStockProducts,
      pendingOrders,
      monthlyRevenue,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true } }),
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
          variants: { some: { stock: { lt: 10 } } },
        },
        include: {
          variants: { select: { stock: true } },
          images: { orderBy: { position: "asc" } },
        },
        take: 10,
      }).then((products) => products.map((p) => ({ ...p, images: p.images.slice(0, 1) }))),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.groupBy({
        by: ["createdAt"],
        _sum: { total: true },
        _count: { id: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);

    return {
      success: true,
      data: {
        totalProducts,
        totalUsers,
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        pendingOrders,
        recentOrders,
        lowStockProducts,
        monthlyRevenue,
      },
    };
  });

  // List all products (admin)
  app.get("/products", async (request) => {
    const { page = 1, limit = 20, search, status, categoryId } = request.query as {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      categoryId?: string;
    };

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { position: "asc" } },
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          _count: { select: { variants: true, reviews: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }).then((products) => products.map((p) => ({ ...p, images: p.images.slice(0, 1) }))),
      prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  // List all orders (admin)
  app.get("/orders", async (request) => {
    const { page = 1, limit = 20, status, search } = request.query as {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    };

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          items: { include: { product: { select: { name: true } } } },
          payments: { select: { status: true, method: true } },
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
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  // Update order status
  app.put("/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, note, trackingNumber, carrier } = request.body as {
      status: string;
      note?: string;
      trackingNumber?: string;
      carrier?: string;
    };

    const validStatuses = [
      "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED",
      "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED", "REFUNDED",
    ];

    if (!validStatuses.includes(status)) {
      return reply.code(400).send({ success: false, error: "Invalid status" });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return reply.code(404).send({ success: false, error: "Order not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: status as never },
      });

      await tx.orderStatusLog.create({
        data: {
          orderId: id,
          status: status as never,
          note,
        },
      });

      // If shipped, create shipment
      if (status === "SHIPPED" && trackingNumber) {
        await tx.shipment.create({
          data: {
            orderId: id,
            trackingNumber,
            carrier,
            status: "shipped",
          },
        });
      }
    });

    return { success: true, message: "Order status updated" };
  });

  // List all users (admin)
  app.get("/users", async (request) => {
    const { page = 1, limit = 20, search, role } = request.query as {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
    };

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
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
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  // Update user role
  app.put("/users/:id/role", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role } = request.body as { role: string };

    if (!["CUSTOMER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
      return reply.code(400).send({ success: false, error: "Invalid role" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return reply.code(404).send({ success: false, error: "User not found" });
    }

    // Prevent self-demotion
    if (id === request.user!.id && role !== request.user!.role) {
      return reply.code(400).send({
        success: false,
        error: "Cannot change your own role",
      });
    }

    await prisma.user.update({
      where: { id },
      data: { role: role as never },
    });

    return { success: true, message: "User role updated" };
  });

  // Toggle user active status
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
      });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    return { success: true, message: `User ${user.isActive ? "deactivated" : "activated"}` };
  });
};
