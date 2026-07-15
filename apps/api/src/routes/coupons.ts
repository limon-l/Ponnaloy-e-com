import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { createCouponSchema } from "../validators";

export const couponRoutes: FastifyPluginAsync = async (app) => {
  // Validate coupon (authenticated)
  app.post("/validate", { preHandler: [requireAuth] }, async (request, reply) => {
    const { code, subtotal } = request.body as { code: string; subtotal: number };

    if (!code) {
      return reply.code(400).send({ success: false, error: "Coupon code is required" });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return reply.code(404).send({ success: false, error: "Invalid coupon code" });
    }

    if (!coupon.isActive) {
      return reply.code(400).send({ success: false, error: "Coupon is inactive" });
    }

    if (coupon.endDate && new Date(coupon.endDate) < new Date()) {
      return reply.code(400).send({ success: false, error: "Coupon has expired" });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return reply.code(400).send({ success: false, error: "Coupon usage limit reached" });
    }

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return reply.code(400).send({
        success: false,
        error: `Minimum order amount is $${(coupon.minOrderAmount / 100).toFixed(2)}`,
      });
    }

    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else if (coupon.discountType === "FIXED") {
      discount = coupon.discountValue;
    }

    return {
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount,
        description: coupon.description,
      },
    };
  });

  // List all coupons (admin)
  app.get("/", { preHandler: [requireAdmin] }, async (request) => {
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.coupon.count(),
    ]);

    return {
      success: true,
      data: coupons,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  // Create coupon (admin)
  app.post("/", { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createCouponSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid coupon data",
        details: parsed.error.flatten(),
      });
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: parsed.data.code },
    });

    if (existing) {
      return reply.code(409).send({
        success: false,
        error: "Coupon with this code already exists",
      });
    }

    const coupon = await prisma.coupon.create({
      data: parsed.data,
    });

    return reply.code(201).send({ success: true, data: coupon });
  });

  // Update coupon (admin)
  app.put("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = createCouponSchema.partial().safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid coupon data",
        details: parsed.error.flatten(),
      });
    }

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: "Coupon not found" });
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: parsed.data,
    });

    return { success: true, data: coupon };
  });

  // Delete coupon (admin)
  app.delete("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: "Coupon not found" });
    }

    await prisma.coupon.delete({ where: { id } });
    return { success: true, message: "Coupon deleted" };
  });
};
