import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { getCache, setCache } from "../lib/redis";
import { slugify, CACHE_TTL } from "@ponnaloy/shared";
import { createBrandSchema } from "../validators";
import { requireAdmin } from "../middleware/auth";

export const brandRoutes: FastifyPluginAsync = async (app) => {
  // Get all brands
  app.get("/", async (_request, reply) => {
    const cacheKey = "brands:list";
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });

    const result = { success: true, data: brands };
    await setCache(cacheKey, result, CACHE_TTL.LONG);
    return result;
  });

  // Get brand by slug
  app.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const brand = await prisma.brand.findUnique({
      where: { slug },
      include: { _count: { select: { products: true } } },
    });

    if (!brand) {
      return reply.code(404).send({ success: false, error: "Brand not found" });
    }

    return { success: true, data: brand };
  });

  // Create brand (admin)
  app.post("/", { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createBrandSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid brand data",
        details: parsed.error.flatten(),
      });
    }

    const data = parsed.data;
    const slug = data.slug || slugify(data.name);

    const existing = await prisma.brand.findUnique({ where: { slug } });
    if (existing) {
      return reply.code(409).send({
        success: false,
        error: "Brand with this slug already exists",
      });
    }

    const brand = await prisma.brand.create({
      data: {
        name: data.name,
        slug,
        logo: data.logo,
        description: data.description,
        website: data.website,
        isActive: data.isActive,
      },
    });

    return reply.code(201).send({ success: true, data: brand });
  });

  // Update brand (admin)
  app.put("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = createBrandSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid brand data",
        details: parsed.error.flatten(),
      });
    }

    const existing = await prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: "Brand not found" });
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: parsed.data,
    });

    return { success: true, data: brand };
  });

  // Delete brand (admin)
  app.delete("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return reply.code(404).send({ success: false, error: "Brand not found" });
    }

    if (existing._count.products > 0) {
      return reply.code(400).send({
        success: false,
        error: "Cannot delete brand with existing products",
      });
    }

    await prisma.brand.delete({ where: { id } });
    return { success: true, message: "Brand deleted" };
  });
};
