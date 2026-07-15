import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { getCache, setCache } from "../lib/redis";
import { slugify, CACHE_TTL } from "@ponnaloy/shared";
import { createCategorySchema } from "../validators";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const categoryRoutes: FastifyPluginAsync = async (app) => {
  // Get all categories (tree structure)
  app.get("/", async (_request, reply) => {
    const cacheKey = "categories:tree";
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
              select: { id: true, name: true, slug: true, image: true },
            },
          },
          orderBy: { position: "asc" },
        },
        _count: { select: { products: true } },
      },
      where: { parentId: null },
      orderBy: { position: "asc" },
    });

    const result = { success: true, data: categories };
    await setCache(cacheKey, result, CACHE_TTL.LONG);
    return result;
  });

  // Get category by slug
  app.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true, image: true },
          orderBy: { position: "asc" },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return reply.code(404).send({ success: false, error: "Category not found" });
    }

    return { success: true, data: category };
  });

  // Create category (admin)
  app.post("/", { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid category data",
        details: parsed.error.flatten(),
      });
    }

    const data = parsed.data;
    const slug = data.slug || slugify(data.name);

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return reply.code(409).send({
        success: false,
        error: "Category with this slug already exists",
      });
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        image: data.image,
        isActive: data.isActive,
        parentId: data.parentId,
        position: data.position,
      },
    });

    return reply.code(201).send({ success: true, data: category });
  });

  // Update category (admin)
  app.put("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = createCategorySchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid category data",
        details: parsed.error.flatten(),
      });
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: "Category not found" });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (data.name) updateData.name = data.name;
    if (data.slug) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.position !== undefined) updateData.position = data.position;

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return { success: true, data: category };
  });

  // Delete category (admin)
  app.delete("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });

    if (!existing) {
      return reply.code(404).send({ success: false, error: "Category not found" });
    }

    if (existing._count.products > 0) {
      return reply.code(400).send({
        success: false,
        error: "Cannot delete category with existing products",
      });
    }

    if (existing._count.children > 0) {
      return reply.code(400).send({
        success: false,
        error: "Cannot delete category with subcategories",
      });
    }

    await prisma.category.delete({ where: { id } });
    return { success: true, message: "Category deleted" };
  });
};
