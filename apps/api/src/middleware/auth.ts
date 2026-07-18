import { FastifyRequest, FastifyReply } from "fastify";
import prisma from "../lib/prisma";
import { verifyJWT } from "../routes/auth";

export interface AuthUser {
  id: string;
  clerkId?: string | null;
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

async function authenticateToken(token: string): Promise<AuthUser | null> {
  // Try our custom JWT first
  const payload = verifyJWT(token);
  if (payload && payload.sub) {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
      select: {
        id: true, clerkId: true, email: true,
        firstName: true, lastName: true, role: true, isActive: true,
      },
    });
    if (user && user.isActive) {
      return {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      };
    }
    return null;
  }

  // Fallback to Clerk token verification
  try {
    const { verifyToken } = await import("@clerk/fastify");
    const clerkPayload = await verifyToken(token);
    if (!clerkPayload || !clerkPayload.sub) return null;

    let user = await prisma.user.findUnique({
      where: { clerkId: clerkPayload.sub },
      select: {
        id: true, clerkId: true, email: true,
        firstName: true, lastName: true, role: true, isActive: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: clerkPayload.sub,
          email: (clerkPayload.email as string) || "",
          firstName: (clerkPayload.firstName as string) || null,
          lastName: (clerkPayload.lastName as string) || null,
          emailVerified: true,
        },
        select: {
          id: true, clerkId: true, email: true,
          firstName: true, lastName: true, role: true, isActive: true,
        },
      });
    }

    if (!user.isActive) return null;

    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  } catch {
    return null;
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
  const user = await authenticateToken(token);

  if (!user) {
    return reply.code(401).send({
      success: false,
      error: "Invalid or expired token",
    });
  }

  request.user = user;
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;
  if (request.user?.role !== "ADMIN" && request.user?.role !== "SUPER_ADMIN") {
    return reply.code(403).send({ success: false, error: "Admin access required" });
  }
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;
  if (request.user?.role !== "SUPER_ADMIN") {
    return reply.code(403).send({ success: false, error: "Super admin access required" });
  }
}

export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return;

  const token = authHeader.slice(7);
  const user = await authenticateToken(token);
  if (user) request.user = user;
}
