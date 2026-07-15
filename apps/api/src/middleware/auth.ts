import { FastifyRequest, FastifyReply } from "fastify";
import prisma from "../lib/prisma";

export interface AuthUser {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return reply.code(401).send({
      success: false,
      error: "Authentication required",
    });
  }

  const token = authHeader.slice(7);

  try {
    // Verify the Clerk JWT token
    const { verifyToken } = await import("@clerk/fastify");
    const payload = await verifyToken(token);

    if (!payload || !payload.sub) {
      return reply.code(401).send({
        success: false,
        error: "Invalid token",
      });
    }

    // Find or create user in our database
    let user = await prisma.user.findUnique({
      where: { clerkId: payload.sub },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      // Auto-create user from Clerk data
      user = await prisma.user.create({
        data: {
          clerkId: payload.sub,
          email: (payload.email as string) || "",
          firstName: (payload.firstName as string) || null,
          lastName: (payload.lastName as string) || null,
          emailVerified: true,
        },
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
    }

    request.user = user as AuthUser;
  } catch (error) {
    return reply.code(401).send({
      success: false,
      error: "Invalid or expired token",
    });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);

  if (reply.sent) return;

  if (request.user?.role !== "ADMIN" && request.user?.role !== "SUPER_ADMIN") {
    return reply.code(403).send({
      success: false,
      error: "Admin access required",
    });
  }
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);

  if (reply.sent) return;

  if (request.user?.role !== "SUPER_ADMIN") {
    return reply.code(403).send({
      success: false,
      error: "Super admin access required",
    });
  }
}

export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) return;

  const token = authHeader.slice(7);

  try {
    const { verifyToken } = await import("@clerk/fastify");
    const payload = await verifyToken(token);

    if (payload?.sub) {
      const user = await prisma.user.findUnique({
        where: { clerkId: payload.sub },
        select: {
          id: true,
          clerkId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      if (user) {
        request.user = user as AuthUser;
      }
    }
  } catch {
    // Token invalid, continue as guest
  }
}
