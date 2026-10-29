import { FastifyPluginAsync } from "fastify";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { config } from "../config/env";
import { buildPasswordResetEmail, sendMail } from "../lib/email";
import { invalidateAuthCache } from "../lib/auth-cache";

// Validated at boot in config/env.ts: production refuses to start without a
// strong secret, so there is no insecure default to fall back to.
const JWT_SECRET = config.auth.jwtSecret;

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include an uppercase letter and a number";
  }
  return null;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(crypto.scryptSync(password, salt, 64).toString("hex"), "hex");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
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

    const headerJson = JSON.parse(Buffer.from(header, "base64url").toString()) as {
      alg?: string;
      typ?: string;
    };
    // Reject "alg: none" and any non-HS256 token before verifying the HMAC.
    if (headerJson.alg !== "HS256" || headerJson.typ !== "JWT") return null;

    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }
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

    const policyError = passwordPolicyError(password);
    if (policyError) {
      return reply.code(400).send({ success: false, error: policyError });
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
        passwordChangedAt: true,
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
      // Ties this token to the current credential version. Changing the
      // password rotates this value and invalidates every older token.
      pwdAt: user.passwordChangedAt?.getTime() ?? 0,
    });

    const { passwordHash: _, passwordChangedAt: __, ...safeUser } = user;

    return {
      success: true,
      data: {
        ...safeUser,
        token,
      },
    };
  });

  // Forgot password. The response is always identical so the endpoint cannot
  // be used to enumerate accounts.
  app.post("/forgot-password", { config: { rateLimit: { max: 3, timeWindow: "1 minute" } } }, async (request) => {
    const generic = {
      success: true,
      message:
        "If an account exists with this email, you will receive a password reset link.",
    };

    const { email } = (request.body ?? {}) as { email?: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return generic;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) return generic;

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.$transaction([
      // Only the newest link stays valid.
      prisma.passwordResetToken.updateMany({
        // MongoDB distinguishes a missing field from an explicit null, so both
        // forms must be matched for the "invalidate all unused tokens" rule.
        where: {
          userId: user.id,
          OR: [{ usedAt: { isSet: false } }, { usedAt: null }],
        },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      }),
    ]);

    const resetUrl = `${config.frontendUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
    const message = buildPasswordResetEmail(resetUrl);

    try {
      const result = await sendMail({ to: user.email, ...message });
      request.log.info(
        { userId: user.id, transport: result.transport, delivered: result.delivered },
        "Password reset email processed"
      );
    } catch (error) {
      // Never surface delivery failures; the token remains valid and the user
      // can request another link.
      request.log.error({ err: error }, "Password reset email failed");
    }

    return generic;
  });

  // Complete a password reset with a single-use, expiring token.
  app.post("/reset-password", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { token, password } = (request.body ?? {}) as {
      token?: string;
      password?: string;
    };

    if (!token || !password) {
      return reply.code(400).send({
        success: false,
        error: "A reset token and a new password are required",
      });
    }

    const policyError = passwordPolicyError(password);
    if (policyError) {
      return reply.code(400).send({ success: false, error: policyError });
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(token) },
      include: { user: { select: { id: true, isActive: true } } },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt.getTime() <= Date.now() ||
      !record.user.isActive
    ) {
      return reply.code(400).send({
        success: false,
        error: "This reset link is invalid or has expired. Request a new one.",
        code: "RESET_TOKEN_INVALID",
      });
    }

    const passwordHash = hashPassword(password);
    const changedAt = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, passwordChangedAt: changedAt },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: changedAt },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          userId: record.userId,
          OR: [{ usedAt: { isSet: false } }, { usedAt: null }],
        },
        data: { usedAt: changedAt },
      }),
    ]);

    invalidateAuthCache(record.userId);

    return {
      success: true,
      message: "Your password has been updated. Sign in with your new password.",
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
        passwordChangedAt: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true, wishlist: true } },
      },
    });

    if (!user) {
      return reply.code(404).send({ success: false, error: "User not found" });
    }

    // Tokens issued before the last credential change are no longer valid.
    if (user.passwordChangedAt) {
      if (typeof payload.pwdAt === "number") {
        if (payload.pwdAt !== user.passwordChangedAt.getTime()) {
          return reply.code(401).send({ success: false, error: "Invalid token" });
        }
      } else {
        const issuedAt = typeof payload.iat === "number" ? payload.iat : 0;
        if (issuedAt < Math.ceil(user.passwordChangedAt.getTime() / 1000)) {
          return reply.code(401).send({ success: false, error: "Invalid token" });
        }
      }
    }

    const { passwordChangedAt: _changedAt, ...safeUser } = user;

    return { success: true, data: safeUser };
  });
};
