import { FastifyPluginAsync, FastifyRequest } from "fastify";
import type { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { requirePermission } from "../middleware/seller";
import { PERMISSIONS } from "../lib/permissions";
import { removeProduct, indexProduct } from "../lib/meili";
import {
  sellerApplicationReviewSchema,
  sellerCommissionSchema,
  sellerStatusUpdateSchema,
} from "../validators";

const SELLER_STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
const APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
] as const;

function parsePagination(query: unknown) {
  const raw = (query ?? {}) as { page?: string; limit?: string };
  const page = Math.max(1, Number(raw.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(raw.limit) || 20));
  return { page, limit };
}

export const adminSellerRoutes: FastifyPluginAsync = async (app) => {
  // Platform administration only. Individual routes add fine-grained
  // permissions so a future restricted admin role cannot inherit everything.
  app.addHook("preHandler", requireAdmin);

  async function audit(
    request: FastifyRequest,
    action: string,
    entityId: string,
    details: Prisma.InputJsonValue
  ) {
    await prisma.activityLog.create({
      data: {
        userId: request.user!.id,
        action,
        entity: "SellerOrganization",
        entityId,
        details,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      },
    });
  }

  // ── Seller list ──────────────────────────────────────────────────────────
  app.get(
    "/",
    { preHandler: [requirePermission(PERMISSIONS.SELLER_READ_PLATFORM)] },
    async (request) => {
      const { page, limit } = parsePagination(request.query);
      const { status, search } = request.query as {
        status?: string;
        search?: string;
      };

      const where: Record<string, unknown> = {};
      if (status && (SELLER_STATUSES as readonly string[]).includes(status)) {
        where.status = status;
      }
      if (search?.trim()) {
        const term = search.trim();
        where.OR = [
          { name: { contains: term, mode: "insensitive" } },
          { slug: { contains: term, mode: "insensitive" } },
          { supportEmail: { contains: term, mode: "insensitive" } },
        ];
      }

      const [sellers, total, orderTotals] = await Promise.all([
        prisma.sellerOrganization.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            commissionRate: true,
            logo: true,
            approvedAt: true,
            suspendedAt: true,
            createdAt: true,
            owner: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            _count: { select: { products: true, memberships: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.sellerOrganization.count({ where }),
        prisma.sellerOrder.groupBy({
          by: ["sellerId"],
          _sum: { total: true, commissionAmount: true },
          _count: { _all: true },
        }),
      ]);

      const totalsBySeller = new Map(
        orderTotals.map((row) => [
          row.sellerId,
          {
            grossSales: row._sum.total ?? 0,
            commission: row._sum.commissionAmount ?? 0,
            orders: row._count._all,
          },
        ])
      );

      return {
        success: true,
        data: sellers.map((seller) => ({
          ...seller,
          metrics: totalsBySeller.get(seller.id) ?? {
            grossSales: 0,
            commission: 0,
            orders: 0,
          },
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    }
  );

  // ── Applications ─────────────────────────────────────────────────────────
  app.get(
    "/applications",
    { preHandler: [requirePermission(PERMISSIONS.SELLER_READ_PLATFORM)] },
    async (request) => {
      const { page, limit } = parsePagination(request.query);
      const { status } = request.query as { status?: string };

      const where: Record<string, unknown> = {};
      if (
        status &&
        (APPLICATION_STATUSES as readonly string[]).includes(status)
      ) {
        where.status = status;
      }

      const [applications, total] = await Promise.all([
        prisma.sellerApplication.findMany({
          where,
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
            seller: { select: { id: true, name: true, slug: true, status: true } },
            reviewedBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { submittedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.sellerApplication.count({ where }),
      ]);

      return {
        success: true,
        data: applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    }
  );

  app.put(
    "/applications/:id/review",
    { preHandler: [requirePermission(PERMISSIONS.SELLER_APPROVE_PLATFORM)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = sellerApplicationReviewSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "Invalid review payload",
          details: parsed.error.flatten(),
        });
      }

      const application = await prisma.sellerApplication.findUnique({
        where: { id },
      });
      if (!application) {
        return reply.code(404).send({
          success: false,
          error: "Seller application not found",
        });
      }

      const { status, note } = parsed.data;
      const now = new Date();

      try {
        await prisma.$transaction(async (tx) => {
          await tx.sellerApplication.update({
            where: { id },
            data: {
              status,
              reviewNote: note ?? null,
              reviewedById: request.user!.id,
              reviewedAt: now,
            },
          });

          if (application.sellerId) {
            if (status === "APPROVED") {
              await tx.sellerOrganization.update({
                where: { id: application.sellerId },
                data: { status: "APPROVED", approvedAt: now, suspendedAt: null },
              });
              // The applicant must always retain owner access to the store.
              const membership = await tx.sellerMembership.findFirst({
                where: { sellerId: application.sellerId, userId: application.userId },
              });
              if (membership) {
                await tx.sellerMembership.update({
                  where: { id: membership.id },
                  data: { isActive: true, role: "OWNER" },
                });
              } else {
                await tx.sellerMembership.create({
                  data: {
                    sellerId: application.sellerId,
                    userId: application.userId,
                    role: "OWNER",
                  },
                });
              }
            }

            if (status === "REJECTED") {
              await tx.sellerOrganization.update({
                where: { id: application.sellerId },
                data: { status: "REJECTED" },
              });
            }
          }
        });
      } catch (error) {
        app.log.error({ err: error, applicationId: id }, "Failed to review application");
        return reply.code(500).send({
          success: false,
          error: "Could not review the seller application",
        });
      }

      if (application.sellerId) {
        await audit(request, `seller.application.${status.toLowerCase()}`, application.sellerId, {
          applicationId: id,
          note: note ?? null,
          applicantId: application.userId,
        });
      }

      return {
        success: true,
        message: `Application ${status.toLowerCase().replace("_", " ")}`,
      };
    }
  );

  // ── Seller detail ────────────────────────────────────────────────────────
  app.get(
    "/:id",
    { preHandler: [requirePermission(PERMISSIONS.SELLER_READ_PLATFORM)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const seller = await prisma.sellerOrganization.findUnique({
        where: { id },
        include: {
          owner: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          memberships: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
            },
          },
          applications: {
            orderBy: { submittedAt: "desc" },
            take: 5,
            select: {
              id: true,
              businessName: true,
              status: true,
              reviewNote: true,
              submittedAt: true,
              reviewedAt: true,
            },
          },
        },
      });

      if (!seller) {
        return reply.code(404).send({ success: false, error: "Seller not found" });
      }

      const [productCounts, orderTotals, recentOrders] = await Promise.all([
        prisma.product.groupBy({
          by: ["status"],
          where: { sellerId: id },
          _count: { _all: true },
        }),
        prisma.sellerOrder.aggregate({
          where: { sellerId: id, status: { notIn: ["CANCELLED", "REFUNDED"] } },
          _sum: { total: true, commissionAmount: true },
          _count: { _all: true },
        }),
        prisma.sellerOrder.findMany({
          where: { sellerId: id },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                createdAt: true,
                user: { select: { email: true } },
              },
            },
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

      return {
        success: true,
        data: {
          ...seller,
          metrics: {
            products: Object.fromEntries(
              productCounts.map((row) => [row.status, row._count._all])
            ),
            grossSales: orderTotals._sum.total ?? 0,
            commission: orderTotals._sum.commissionAmount ?? 0,
            orders: orderTotals._count._all,
            payable: (orderTotals._sum.total ?? 0) - (orderTotals._sum.commissionAmount ?? 0),
          },
          recentOrders,
        },
      };
    }
  );

  // ── Status transitions ───────────────────────────────────────────────────
  app.put(
    "/:id/status",
    { preHandler: [requirePermission(PERMISSIONS.SELLER_SUSPEND_PLATFORM)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = sellerStatusUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "Invalid seller status",
          details: parsed.error.flatten(),
        });
      }

      const seller = await prisma.sellerOrganization.findUnique({ where: { id } });
      if (!seller) {
        return reply.code(404).send({ success: false, error: "Seller not found" });
      }

      const { status, note } = parsed.data;
      if (status === "APPROVED" && !seller.approvedAt) {
        return reply.code(409).send({
          success: false,
          error: "A seller must complete application review before activation.",
          code: "APPLICATION_REQUIRED",
        });
      }

      const now = new Date();
      const updated = await prisma.sellerOrganization.update({
        where: { id },
        data: {
          status,
          ...(status === "APPROVED"
            ? { approvedAt: seller.approvedAt ?? now, suspendedAt: null }
            : {}),
          ...(status === "SUSPENDED" ? { suspendedAt: now } : {}),
        },
      });

      // A suspended/rejected seller's listings must disappear from the public
      // search index immediately, not only after the next reindex. Reinstating
      // a seller restores their moderated, active listings.
      const products = await prisma.product.findMany({
        where: { sellerId: id },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          categoryId: true,
          brandId: true,
          status: true,
          moderationStatus: true,
          isFeatured: true,
          isTrending: true,
          isNewArrival: true,
          avgRating: true,
          totalSold: true,
          createdAt: true,
        },
      });
      for (const product of products) {
        if (
          status === "APPROVED" &&
          product.status === "ACTIVE" &&
          product.moderationStatus === "APPROVED"
        ) {
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
        } else if (status !== "APPROVED") {
          await removeProduct(product.id);
        }
      }

      await audit(request, `seller.status.${status.toLowerCase()}`, id, {
        previousStatus: seller.status,
        status,
        note: note ?? null,
      });

      return { success: true, data: updated };
    }
  );

  app.put(
    "/:id/commission",
    { preHandler: [requirePermission(PERMISSIONS.SELLER_COMMISSION_PLATFORM)] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = sellerCommissionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "Invalid commission rate",
          details: parsed.error.flatten(),
        });
      }

      const seller = await prisma.sellerOrganization.findUnique({ where: { id } });
      if (!seller) {
        return reply.code(404).send({ success: false, error: "Seller not found" });
      }

      const updated = await prisma.sellerOrganization.update({
        where: { id },
        data: { commissionRate: parsed.data.commissionRate },
      });

      await audit(request, "seller.commission.updated", id, {
        previousRate: seller.commissionRate,
        commissionRate: parsed.data.commissionRate,
        note: parsed.data.note ?? null,
      });

      return { success: true, data: updated };
    }
  );
};
