import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { createReviewSchema } from "../validators";

export const reviewRoutes: FastifyPluginAsync = async (app) => {
  // Get reviews for a product
  app.get("/product/:productId", async (request) => {
    const { productId } = request.params as { productId: string };
    const { page = 1, limit = 10, rating } = request.query as {
      page?: number;
      limit?: number;
      rating?: number;
    };

    const where: Record<string, unknown> = {
      productId,
      isVisible: true,
    };

    if (rating) where.rating = rating;

    const [reviews, total, stats] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({
        where: { productId, isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const distribution = await prisma.review.groupBy({
      by: ["rating"],
      where: { productId, isVisible: true },
      _count: { rating: true },
      orderBy: { rating: "desc" },
    });

    return {
      success: true,
      data: {
        reviews,
        stats: {
          averageRating: stats._avg.rating || 0,
          totalReviews: stats._count.rating || 0,
          distribution: distribution.map((d) => ({
            rating: d.rating,
            count: d._count.rating,
          })),
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  });

  // Create review
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const parsed = createReviewSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid review data",
        details: parsed.error.flatten(),
      });
    }

    const { rating, title, comment, images } = parsed.data;
    const { productId } = request.body as { productId: string };

    if (!productId) {
      return reply.code(400).send({
        success: false,
        error: "Product ID is required",
      });
    }

    // Check product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return reply.code(404).send({ success: false, error: "Product not found" });
    }

    // Check if user already reviewed
    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      // Update existing review
      const updated = await prisma.review.update({
        where: { id: existing.id },
        data: { rating, title, comment, images },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      });

      // Recalculate product rating
      const stats = await prisma.review.aggregate({
        where: { productId, isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await prisma.product.update({
        where: { id: productId },
        data: {
          avgRating: Math.round((stats._avg.rating || 0) * 10) / 10,
          reviewCount: stats._count.rating || 0,
        },
      });

      return { success: true, data: updated };
    }

    // Create new review
    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating,
        title,
        comment,
        images: images || [],
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    // Recalculate product rating
    const stats = await prisma.review.aggregate({
      where: { productId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: Math.round((stats._avg.rating || 0) * 10) / 10,
        reviewCount: stats._count.rating || 0,
      },
    });

    return reply.code(201).send({ success: true, data: review });
  });

  // Delete review
  app.delete("/:reviewId", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { reviewId } = request.params as { reviewId: string };

    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) {
      return reply.code(404).send({ success: false, error: "Review not found" });
    }

    if (review.userId !== userId) {
      return reply.code(403).send({ success: false, error: "Not authorized" });
    }

    await prisma.review.delete({ where: { id: reviewId } });

    // Recalculate product rating
    const stats = await prisma.review.aggregate({
      where: { productId: review.productId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: review.productId },
      data: {
        avgRating: Math.round((stats._avg.rating || 0) * 10) / 10,
        reviewCount: stats._count.rating || 0,
      },
    });

    return { success: true, message: "Review deleted" };
  });
};
