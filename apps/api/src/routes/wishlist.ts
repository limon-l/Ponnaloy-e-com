import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const wishlistRoutes: FastifyPluginAsync = async (app) => {
  // Get wishlist
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;

    const rawItems = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { orderBy: { position: "asc" } },
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true } },
            variants: { select: { id: true, price: true, stock: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = rawItems.map((w) => ({
      ...w,
      product: w.product ? { ...w.product, images: w.product.images.slice(0, 1) } : w.product,
    }));

    return { success: true, data: items };
  });

  // Toggle wishlist item
  app.post("/toggle", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { productId } = request.body as { productId: string };

    if (!productId) {
      return reply.code(400).send({
        success: false,
        error: "Product ID is required",
      });
    }

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      return { success: true, data: { added: false } };
    }

    await prisma.wishlist.create({
      data: { userId, productId },
    });

    return { success: true, data: { added: true } };
  });

  // Check if product is in wishlist
  app.get("/check/:productId", { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;
    const { productId } = request.params as { productId: string };

    const item = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    return { success: true, data: { isWishlisted: !!item } };
  });
};
