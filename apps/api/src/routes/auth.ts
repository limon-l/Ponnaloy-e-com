import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";
import prisma from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "ponnaloy-jwt-secret-change-in-production";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashToVerify = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(hashToVerify, "hex"));
}

function createToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + 60 * 60 * 24 * 7 })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyJWT(token: string): Record<string, unknown> | null {
  try {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Sign up
  app.post("/sign-up", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { email, password, firstName, lastName } = request.body as {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    };

    if (!email || !password) {
      return reply.code(400).send({ success: false, error: "Email and password are required" });
    }

    if (password.length < 8) {
      return reply.code(400).send({ success: false, error: "Password must be at least 8 characters" });
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return reply.code(400).send({ success: false, error: "Password must include an uppercase letter and a number" });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return reply.code(409).send({ success: false, error: "An account with this email already exists" });
    }

    const passwordHash = hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    return reply.code(201).send({
      success: true,
      data: user,
      message: "Account created successfully",
    });
  });

  // Sign in
  app.post("/sign-in", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { email, password } = request.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return reply.code(400).send({ success: false, error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        avatar: true,
      },
    });

    if (!user || !user.passwordHash) {
      return reply.code(401).send({ success: false, error: "Invalid email or password" });
    }

    if (!user.isActive) {
      return reply.code(403).send({ success: false, error: "Your account has been deactivated" });
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ success: false, error: "Invalid email or password" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = createToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;

    return {
      success: true,
      data: {
        ...safeUser,
        token,
      },
    };
  });

  // Forgot password (placeholder - sends email in production)
  app.post("/forgot-password", { config: { rateLimit: { max: 3, timeWindow: "1 minute" } } }, async (_request, reply) => {
    return {
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    };
  });

  // Get current user
  app.get("/me", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.code(401).send({ success: false, error: "Not authenticated" });
    }

    const token = authHeader.slice(7);
    const payload = verifyJWT(token);
    if (!payload || !payload.sub) {
      return reply.code(401).send({ success: false, error: "Invalid token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true, wishlist: true } },
      },
    });

    if (!user) {
      return reply.code(404).send({ success: false, error: "User not found" });
    }

    return { success: true, data: user };
  });
};
