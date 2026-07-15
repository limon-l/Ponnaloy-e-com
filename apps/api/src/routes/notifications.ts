import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  // Get user notifications
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;
    const { page = 1, limit = 20, unreadOnly } = request.query as {
      page?: number;
      limit?: number;
      unreadOnly?: string;
    };

    const where: Record<string, unknown> = { userId };
    if (unreadOnly === "true") where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  });

  // Mark notification as read
  app.put("/:id/read", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return reply.code(404).send({ success: false, error: "Notification not found" });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return { success: true, message: "Notification marked as read" };
  });

  // Mark all as read
  app.put("/read-all", { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true, message: "All notifications marked as read" };
  });

  // Delete notification
  app.delete("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return reply.code(404).send({ success: false, error: "Notification not found" });
    }

    await prisma.notification.delete({ where: { id } });

    return { success: true, message: "Notification deleted" };
  });
};
