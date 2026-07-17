import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const userRoutes: FastifyPluginAsync = async (app) => {
  // Get current user profile
  app.get("/profile", { preHandler: [requireAuth] }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
            wishlist: true,
          },
        },
      },
    });

    return { success: true, data: user };
  });

  // Update profile
  app.put("/profile", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { firstName, lastName, phone } = request.body as {
      firstName?: string;
      lastName?: string;
      phone?: string;
    };

    const updateData: Record<string, string> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
      },
    });

    return { success: true, data: user };
  });

  // Get dashboard data
  app.get("/dashboard", { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;

    const [recentOrders, orderStats, wishlistCount, addressCount] =
      await Promise.all([
        prisma.order.findMany({
          where: { userId },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: { orderBy: { position: "asc" } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }).then((orders) => orders.map((o) => ({
          ...o,
          items: o.items.map((i) => ({
            ...i,
            product: i.product ? { ...i.product, images: i.product.images.slice(0, 1) } : i.product,
          })),
        }))),
        prisma.order.aggregate({
          where: { userId },
          _count: { id: true },
          _sum: { total: true },
        }),
        prisma.wishlist.count({ where: { userId } }),
        prisma.address.count({ where: { userId } }),
      ]);

    return {
      success: true,
      data: {
        recentOrders,
        stats: {
          totalOrders: orderStats._count.id,
          totalSpent: orderStats._sum.total || 0,
          wishlistItems: wishlistCount,
          savedAddresses: addressCount,
        },
      },
    };
  });
};
