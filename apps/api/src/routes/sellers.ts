import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { publicProductVisibility } from "../lib/marketplace";

/**
 * Public, unauthenticated seller storefront endpoints.
 * Only APPROVED sellers and moderated, active products are exposed.
 */
export const sellerStorefrontRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      search?: string;
    };
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));

    const where: Record<string, unknown> = { status: "APPROVED" };
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ];
    }

    const [sellers, total] = await Promise.all([
      prisma.sellerOrganization.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logo: true,
          banner: true,
          approvedAt: true,
          _count: {
            select: {
              products: {
                where: {
                  status: "ACTIVE",
                  moderationStatus: "APPROVED",
                },
              },
            },
          },
        },
        orderBy: { approvedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sellerOrganization.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: sellers.map((seller) => ({
        id: seller.id,
        name: seller.name,
        slug: seller.slug,
        description: seller.description,
        logo: seller.logo,
        banner: seller.banner,
        approvedAt: seller.approvedAt,
        productCount: seller._count.products,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  });

  app.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const seller = await prisma.sellerOrganization.findFirst({
      where: { slug, status: "APPROVED" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        banner: true,
        supportEmail: true,
        supportPhone: true,
        policies: true,
        approvedAt: true,
        createdAt: true,
      },
    });

    if (!seller) {
      return reply.code(404).send({ success: false, error: "Seller not found" });
    }

    const products = await prisma.product.findMany({
      where: {
        sellerId: seller.id,
        status: "ACTIVE",
        moderationStatus: "APPROVED",
        ...publicProductVisibility(),
      },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        variants: { select: { id: true, price: true, stock: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    return reply.send({
      success: true,
      data: {
        seller,
        products: products.map((product) => ({
          ...product,
          effectiveStock:
            product.variants.length > 0
              ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
              : product.stock,
        })),
      },
    });
  });
};
