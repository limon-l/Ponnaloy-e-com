import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { slugify } from "@ponnaloy/shared";
import { requireAdmin } from "../middleware/auth";

export const collectionRoutes: FastifyPluginAsync = async (app) => {
  // Get all active collections
  app.get("/", async () => {
    const rawCollections = await prisma.collection.findMany({
      where: { isActive: true },
      include: {
        products: {
          include: {
            product: {
              include: {
                images: { orderBy: { position: "asc" } },
                category: { select: { id: true, name: true, slug: true } },
              },
            },
          },
          orderBy: { position: "asc" },
          take: 12,
        },
      },
      orderBy: { position: "asc" },
    });

    const collections = rawCollections.map((c) => ({
      ...c,
      products: c.products.map((p) => ({
        ...p,
        product: p.product ? { ...p.product, images: p.product.images.slice(0, 1) } : p.product,
      })),
    }));

    return { success: true, data: collections };
  });

  // Get collection by slug
  app.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };

    const rawCollection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        products: {
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
          orderBy: { position: "asc" },
          skip: (page - 1) * limit,
          take: limit,
        },
        _count: { select: { products: true } },
      },
    });

    if (!rawCollection) {
      return reply.code(404).send({ success: false, error: "Collection not found" });
    }

    const collection = {
      ...rawCollection,
      products: rawCollection.products.map((p) => ({
        ...p,
        product: p.product ? { ...p.product, images: p.product.images.slice(0, 1) } : p.product,
      })),
    };

    return { success: true, data: collection };
  });

  // Create collection (admin)
  app.post("/", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { name, description, image, position, startDate, endDate } = request.body as {
      name: string;
      description?: string;
      image?: string;
      position?: number;
      startDate?: string;
      endDate?: string;
    };

    if (!name) {
      return reply.code(400).send({ success: false, error: "Name is required" });
    }

    const slug = slugify(name);
    const existing = await prisma.collection.findUnique({ where: { slug } });
    if (existing) {
      return reply.code(409).send({ success: false, error: "Collection already exists" });
    }

    const collection = await prisma.collection.create({
      data: {
        name,
        slug,
        description,
        image,
        position: position || 0,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });

    return reply.code(201).send({ success: true, data: collection });
  });

  // Add product to collection (admin)
  app.post("/:id/products", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { productId, position } = request.body as { productId: string; position?: number };

    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) {
      return reply.code(404).send({ success: false, error: "Collection not found" });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return reply.code(404).send({ success: false, error: "Product not found" });
    }

    const existing = await prisma.productCollection.findUnique({
      where: { productId_collectionId: { productId, collectionId: id } },
    });

    if (existing) {
      return reply.code(409).send({ success: false, error: "Product already in collection" });
    }

    const item = await prisma.productCollection.create({
      data: {
        productId,
        collectionId: id,
        position: position || 0,
      },
    });

    return reply.code(201).send({ success: true, data: item });
  });

  // Remove product from collection (admin)
  app.delete("/:id/products/:productId", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id, productId } = request.params as { id: string; productId: string };

    const existing = await prisma.productCollection.findUnique({
      where: { productId_collectionId: { productId, collectionId: id } },
    });

    if (!existing) {
      return reply.code(404).send({ success: false, error: "Product not in collection" });
    }

    await prisma.productCollection.delete({ where: { id: existing.id } });

    return { success: true, message: "Product removed from collection" };
  });

  // Delete collection (admin)
  app.delete("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: "Collection not found" });
    }

    await prisma.collection.delete({ where: { id } });
    return { success: true, message: "Collection deleted" };
  });
};
