import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { getCache, setCache, invalidateProductCache } from "../lib/redis";
import { indexProduct, removeProduct, searchProducts } from "../lib/meili";
import { slugify, CACHE_TTL, CACHE_KEYS } from "@ponnaloy/shared";
import {
  productFilterSchema,
  createProductSchema,
  updateProductSchema,
} from "../validators";
import { requireAuth, requireAdmin, optionalAuth } from "../middleware/auth";

export const productRoutes: FastifyPluginAsync = async (app) => {
  // List products with filters
  app.get("/", async (request, reply) => {
    const parsed = productFilterSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid query parameters",
        details: parsed.error.flatten(),
      });
    }

    const {
      q,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      minRating,
      isFeatured,
      isTrending,
      isNewArrival,
      inStock,
      status,
      page,
      limit,
      sort,
      order,
    } = parsed.data;

    const cacheKey = `${CACHE_KEYS.PRODUCTS}:${JSON.stringify(parsed.data)}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    } else {
      where.status = "ACTIVE";
    }

    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (isTrending !== undefined) where.isTrending = isTrending;
    if (isNewArrival !== undefined) where.isNewArrival = isNewArrival;
    if (minRating !== undefined) where.avgRating = { gte: minRating };

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) (where.price as Record<string, number>).gte = minPrice;
      if (maxPrice !== undefined) (where.price as Record<string, number>).lte = maxPrice;
    }

    if (inStock) {
      where.variants = { some: { stock: { gt: 0 } } };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const orderBy: Record<string, string> = {};
    if (sort) {
      orderBy[sort] = order;
    } else {
      orderBy.createdAt = "desc";
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true, logo: true } },
          variants: { select: { id: true, price: true, stock: true, options: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const result = {
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await setCache(cacheKey, result, CACHE_TTL.SHORT);
    return result;
  });

  // Get featured products
  app.get("/featured", async (_request, reply) => {
    const cacheKey = `${CACHE_KEYS.FEATURED}:list`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const products = await prisma.product.findMany({
      where: { isFeatured: true, status: "ACTIVE" },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    const result = { success: true, data: products };
    await setCache(cacheKey, result, CACHE_TTL.MEDIUM);
    return result;
  });

  // Get trending products
  app.get("/trending", async (_request, reply) => {
    const cacheKey = `${CACHE_KEYS.TRENDING}:list`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const products = await prisma.product.findMany({
      where: { isTrending: true, status: "ACTIVE" },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { totalSold: "desc" },
      take: 12,
    });

    const result = { success: true, data: products };
    await setCache(cacheKey, result, CACHE_TTL.MEDIUM);
    return result;
  });

  // Get new arrivals
  app.get("/new-arrivals", async (_request, reply) => {
    const products = await prisma.product.findMany({
      where: { isNewArrival: true, status: "ACTIVE" },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    return { success: true, data: products };
  });

  // Get deals (products with compareAtPrice > price)
  app.get("/deals", async (_request, reply) => {
    const cacheKey = `${CACHE_KEYS.DEALS}:list`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        compareAtPrice: { not: null },
        price: { lt: prisma.product.fields?.price || 0 },
      },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    const result = { success: true, data: products };
    await setCache(cacheKey, result, CACHE_TTL.MEDIUM);
    return result;
  });

  // Get product by slug
  app.get("/:slug", { preHandler: [optionalAuth] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const cacheKey = `${CACHE_KEYS.PRODUCT}:${slug}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: true,
        specifications: { orderBy: { position: "asc" } },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true, logo: true } },
        reviews: {
          where: { isVisible: true },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        relatedProducts: {
          include: {
            target: {
              include: {
                images: { orderBy: { position: "asc" }, take: 1 },
              },
            },
          },
          take: 8,
        },
      },
    });

    if (!product) {
      return reply.code(404).send({
        success: false,
        error: "Product not found",
      });
    }

    // Check if user has wishlisted this product
    let isWishlisted = false;
    if (request.user) {
      const wishlistItem = await prisma.wishlist.findUnique({
        where: {
          userId_productId: {
            userId: request.user.id,
            productId: product.id,
          },
        },
      });
      isWishlisted = !!wishlistItem;
    }

    const result = {
      success: true,
      data: { ...product, isWishlisted },
    };

    await setCache(cacheKey, result, CACHE_TTL.SHORT);
    return result;
  });

  // Create product (admin)
  app.post("/", { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createProductSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid product data",
        details: parsed.error.flatten(),
      });
    }

    const data = parsed.data;
    const slug = data.slug || slugify(data.name);

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return reply.code(409).send({
        success: false,
        error: "A product with this name already exists",
      });
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        shortDescription: data.shortDescription,
        sku: data.sku,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        costPrice: data.costPrice,
        barcode: data.barcode,
        status: data.status,
        isFeatured: data.isFeatured,
        isTrending: data.isTrending,
        isNewArrival: data.isNewArrival,
        weight: data.weight,
        categoryId: data.categoryId,
        brandId: data.brandId,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        images: data.images
          ? { create: data.images }
          : undefined,
        variants: data.variants
          ? { create: data.variants }
          : undefined,
        specifications: data.specifications
          ? { create: data.specifications }
          : undefined,
      },
      include: {
        images: true,
        variants: true,
        specifications: true,
        category: true,
        brand: true,
      },
    });

    // Index in Meilisearch
    await indexProduct({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      price: product.price,
      categoryId: product.categoryId,
      brandId: product.brandId,
      status: product.status,
      isFeatured: product.isFeatured,
      isTrending: product.isTrending,
      isNewArrival: product.isNewArrival,
      avgRating: product.avgRating,
      totalSold: product.totalSold,
      createdAt: product.createdAt.toISOString(),
    });

    await invalidateProductCache();

    return reply.code(201).send({ success: true, data: product });
  });

  // Update product (admin)
  app.put("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateProductSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid product data",
        details: parsed.error.flatten(),
      });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: "Product not found" });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
      if (!data.slug) {
        updateData.slug = slugify(data.name);
      }
    }

    for (const key of [
      "description", "shortDescription", "sku", "price", "compareAtPrice",
      "costPrice", "barcode", "status", "isFeatured", "isTrending",
      "isNewArrival", "weight", "categoryId", "brandId", "metaTitle", "metaDescription",
    ]) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    if (data.slug) updateData.slug = data.slug;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        images: true,
        variants: true,
        specifications: true,
        category: true,
        brand: true,
      },
    });

    // Update search index
    await indexProduct({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      price: product.price,
      categoryId: product.categoryId,
      brandId: product.brandId,
      status: product.status,
      isFeatured: product.isFeatured,
      isTrending: product.isTrending,
      isNewArrival: product.isNewArrival,
      avgRating: product.avgRating,
      totalSold: product.totalSold,
      createdAt: product.createdAt.toISOString(),
    });

    await invalidateProductCache();

    return { success: true, data: product };
  });

  // Delete product (admin)
  app.delete("/:id", { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: "Product not found" });
    }

    await prisma.product.delete({ where: { id } });
    await removeProduct(id);
    await invalidateProductCache();

    return { success: true, message: "Product deleted" };
  });
};
