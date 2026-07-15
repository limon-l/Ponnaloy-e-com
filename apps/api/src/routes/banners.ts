import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { createBannerSchema } from "../validators";

export const bannerRoutes: FastifyPluginAsync = async (app) => {
  // Get active banners
  app.get("/", async (request) => {
    const { position } = request.query as { position?: string };

    const where: Record<string, unknown> = { isActive: true };
    if (position) where.position = position;

    const banners = await prisma.banner.findMany({
      where,
      orderBy: { positionOrder: "asc" },
    });

    return { success: true, data: banners };
  });

  // List all banners (admin)
  app.get("/admin", { preHandler: [requireAdmin] }, async () => {
    const banners = await prisma.banner.findMany({
      orderBy: { positionOrder: "asc" },
    });

    return { success: true, data: banners };
  });

  // Create banner (admin)
  app.post("/", { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createBannerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid banner data",
        details: parsed.error.flatten(),
      });
    }

    const banner = await prisma.banner.create({
      data: parsed.data,
    });

    return reply.code(201).send({ success: true, data: banner });
  });

  // Update banner (admin)
  app.put("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = createBannerSchema.partial().safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid banner data",
        details: parsed.error.flatten(),
      });
    }

    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: "Banner not found" });
    }

    const banner = await prisma.banner.update({
      where: { id },
      data: parsed.data,
    });

    return { success: true, data: banner };
  });

  // Delete banner (admin)
  app.delete("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: "Banner not found" });
    }

    await prisma.banner.delete({ where: { id } });
    return { success: true, message: "Banner deleted" };
  });
};
