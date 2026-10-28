import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "./auth";
import {
  PERMISSIONS,
  type Permission,
  roleHasPermission,
  sellerMemberHasPermission,
} from "../lib/permissions";

export interface SellerContext {
  sellerId: string;
  membershipId: string;
  membershipRole: string;
  seller: {
    id: string;
    name: string;
    slug: string;
    status: string;
    commissionRate: number;
    ownerId: string;
    logo: string | null;
    banner: string | null;
    description: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
    businessAddress: unknown;
    policies: unknown;
    approvedAt: Date | null;
    suspendedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

declare module "fastify" {
  interface FastifyRequest {
    sellerContext?: SellerContext;
  }
}

const SELLER_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  commissionRate: true,
  ownerId: true,
  logo: true,
  banner: true,
  description: true,
  supportEmail: true,
  supportPhone: true,
  businessAddress: true,
  policies: true,
  approvedAt: true,
  suspendedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function requestedSellerId(request: FastifyRequest): string | undefined {
  const header = request.headers["x-seller-id"];
  if (typeof header === "string" && header.trim()) return header.trim();

  const query = request.query as Record<string, unknown> | undefined;
  if (query && typeof query.sellerId === "string" && query.sellerId.trim()) {
    return query.sellerId.trim();
  }

  const body = request.body as Record<string, unknown> | undefined;
  if (body && typeof body.sellerId === "string" && body.sellerId.trim()) {
    return body.sellerId.trim();
  }

  return undefined;
}

/**
 * Resolve the authenticated user's seller membership. A user may belong to
 * more than one seller organization, in which case the caller must select one
 * explicitly with the `x-seller-id` header (or a sellerId query/body field).
 */
export async function requireSellerMembership(
  request: FastifyRequest,
  reply: FastifyReply,
  options: { allowUnapproved?: boolean } = {}
): Promise<void> {
  await requireAuth(request, reply);
  if (reply.sent) return;

  const memberships = await prisma.sellerMembership.findMany({
    where: { userId: request.user!.id, isActive: true },
    include: { seller: { select: SELLER_SELECT } },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    return reply.code(403).send({
      success: false,
      error: "Seller access required. Apply to become a seller first.",
      code: "SELLER_ACCESS_REQUIRED",
    });
  }

  const selectedId = requestedSellerId(request);
  let membership = selectedId
    ? memberships.find((item) => item.sellerId === selectedId)
    : memberships.length === 1
      ? memberships[0]
      : undefined;

  if (!membership) {
    if (selectedId) {
      // Do not reveal whether the seller exists; simply deny access.
      return reply.code(403).send({
        success: false,
        error: "You do not have access to this seller organization.",
        code: "SELLER_ACCESS_DENIED",
      });
    }

    return reply.code(400).send({
      success: false,
      error: "Multiple seller organizations found. Select one with the x-seller-id header.",
      code: "SELLER_CONTEXT_REQUIRED",
      data: memberships.map((item) => ({
        sellerId: item.sellerId,
        name: item.seller.name,
        role: item.role,
      })),
    });
  }

  if (!options.allowUnapproved && membership.seller.status !== "APPROVED") {
    return reply.code(403).send({
      success: false,
      error:
        membership.seller.status === "PENDING"
          ? "Your seller application is still awaiting approval."
          : `This seller organization is ${membership.seller.status.toLowerCase()} and cannot operate.`,
      code: "SELLER_NOT_APPROVED",
      data: { status: membership.seller.status },
    });
  }

  request.sellerContext = {
    sellerId: membership.sellerId,
    membershipId: membership.id,
    membershipRole: membership.role,
    seller: membership.seller,
  };
}

/** Require an approved seller organization. */
export async function requireSeller(request: FastifyRequest, reply: FastifyReply) {
  await requireSellerMembership(request, reply);
}

/** Require an approved seller organization and a specific seller permission. */
export function requireSellerPermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSeller(request, reply);
    if (reply.sent) return;

    if (!sellerMemberHasPermission(request.sellerContext?.membershipRole, permission)) {
      return reply.code(403).send({
        success: false,
        error: "Your seller role does not permit this action.",
        code: "SELLER_PERMISSION_DENIED",
        requiredPermission: permission,
      });
    }
  };
}

/** Require a platform permission on the authenticated user's global role. */
export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;

    if (!roleHasPermission(request.user?.role, permission)) {
      return reply.code(403).send({
        success: false,
        error: "You do not have permission to perform this action.",
        code: "PERMISSION_DENIED",
        requiredPermission: permission,
      });
    }
  };
}

export { PERMISSIONS };
