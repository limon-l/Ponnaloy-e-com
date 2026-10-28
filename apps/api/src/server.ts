import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { register } from "prom-client";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { config } from "./config/env";
import prisma from "./lib/prisma";
import { redis } from "./lib/redis";
import { ensureIndexes } from "./lib/meili";

import { productRoutes } from "./routes/products";
import { categoryRoutes } from "./routes/categories";
import { brandRoutes } from "./routes/brands";
import { cartRoutes } from "./routes/cart";
import { orderRoutes } from "./routes/orders";
import { reviewRoutes } from "./routes/reviews";
import { wishlistRoutes } from "./routes/wishlist";
import { addressRoutes } from "./routes/addresses";
import { userRoutes } from "./routes/user";
import { adminRoutes } from "./routes/admin";
import { searchRoutes } from "./routes/search";
import { couponRoutes } from "./routes/coupons";
import { uploadRoutes } from "./routes/upload";
import { webhookRoutes } from "./routes/webhooks";
import { notificationRoutes } from "./routes/notifications";
import { bannerRoutes } from "./routes/banners";
import { collectionRoutes } from "./routes/collections";
import { chatRoutes } from "./routes/chat";
import { authRoutes } from "./routes/auth";
import { paymentRoutes } from "./routes/payments";
import { newsletterRoutes } from "./routes/newsletter";
import { sellerRoutes } from "./routes/seller";
import { sellerStorefrontRoutes } from "./routes/sellers";
import { adminSellerRoutes } from "./routes/admin-sellers";

export interface BuildServerOptions {
  /** Set to false in tests to silence logs. */
  logger?: boolean;
}

function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  const envOrigins = process.env.FRONTEND_URL || "";
  if (envOrigins) {
    envOrigins
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
      .forEach((o) => origins.push(o));
  }
  if (config.nodeEnv === "development") {
    origins.push("http://localhost:3000", "http://localhost:3001");
  }
  return [...new Set(origins)];
}

async function registerPlugins(server: FastifyInstance) {
  const allowedOrigins = getAllowedOrigins();
  server.log.info(`CORS allowed origins: ${allowedOrigins.join(", ")}`);

  await server.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Vercel preview origins are opt-in: allowing every *.vercel.app origin
      // would let any third-party deployment call this API with credentials.
      if (
        process.env.ALLOW_VERCEL_PREVIEWS === "true" &&
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  await server.register(helmet, {
    contentSecurityPolicy: config.nodeEnv === "production",
  });

  await server.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
    }),
  });

  await server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Locally stored uploads are served read-only. Production deployments that
  // need durable media should configure the object-storage adapter instead.
  const uploadRoot = resolve(process.cwd(), config.uploads.dir);
  await mkdir(uploadRoot, { recursive: true });
  await server.register(fastifyStatic, {
    root: uploadRoot,
    prefix: "/uploads/",
    decorateReply: false,
    maxAge: "7d",
    immutable: true,
  });
}

async function registerRoutes(server: FastifyInstance) {
  // Liveness must not depend on external services.
  server.get("/api/health/live", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  // Readiness reports the state of the dependencies this API needs.
  server.get("/api/health", async (_request, reply) => {
    const [dbCheck, redisCheck] = await Promise.allSettled([
      prisma.$runCommandRaw({ ping: 1 }),
      config.redis.enabled ? redis.ping() : Promise.resolve("disabled"),
    ]);

    const database = dbCheck.status === "fulfilled" ? "connected" : "disconnected";
    const redisStatus =
      !config.redis.enabled
        ? "disabled"
        : redisCheck.status === "fulfilled"
          ? "connected"
          : "disconnected";

    return reply.code(database === "connected" ? 200 : 503).send({
      status: database === "connected" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database,
        redis: redisStatus,
      },
    });
  });

  server.get("/api/metrics", async (_request, reply) => {
    try {
      const metrics = await register.metrics();
      reply.header("Content-Type", register.contentType);
      return reply.send(metrics);
    } catch {
      return reply.code(500).send({ error: "Metrics unavailable" });
    }
  });

  await server.register(authRoutes, { prefix: "/api/auth" });
  await server.register(productRoutes, { prefix: "/api/products" });
  await server.register(categoryRoutes, { prefix: "/api/categories" });
  await server.register(brandRoutes, { prefix: "/api/brands" });
  await server.register(cartRoutes, { prefix: "/api/cart" });
  await server.register(orderRoutes, { prefix: "/api/orders" });
  await server.register(paymentRoutes, { prefix: "/api/payments" });
  await server.register(newsletterRoutes, { prefix: "/api/newsletter" });
  await server.register(reviewRoutes, { prefix: "/api/reviews" });
  await server.register(wishlistRoutes, { prefix: "/api/wishlist" });
  await server.register(addressRoutes, { prefix: "/api/addresses" });
  await server.register(userRoutes, { prefix: "/api/user" });
  await server.register(searchRoutes, { prefix: "/api/search" });
  await server.register(couponRoutes, { prefix: "/api/coupons" });
  await server.register(uploadRoutes, { prefix: "/api/upload" });
  await server.register(notificationRoutes, { prefix: "/api/notifications" });
  await server.register(bannerRoutes, { prefix: "/api/banners" });
  await server.register(collectionRoutes, { prefix: "/api/collections" });
  await server.register(chatRoutes, { prefix: "/api/chat" });

  // Webhooks need the raw request body for signature verification.
  await server.register(webhookRoutes, { prefix: "/api/webhooks" });

  // Marketplace: seller portal, public storefronts, platform seller admin.
  await server.register(sellerRoutes, { prefix: "/api/seller" });
  await server.register(sellerStorefrontRoutes, { prefix: "/api/sellers" });
  await server.register(adminSellerRoutes, { prefix: "/api/admin/sellers" });

  await server.register(adminRoutes, { prefix: "/api/admin" });
}

/**
 * Build a fully wired Fastify instance without connecting to external
 * services. This keeps production bootstrap and test harnesses on the exact
 * same route/plugin configuration.
 */
export async function buildServer(
  options: BuildServerOptions = {}
): Promise<FastifyInstance> {
  const server = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            level: config.nodeEnv === "development" ? "info" : "warn",
            transport:
              config.nodeEnv === "development"
                ? { target: "pino-pretty", options: { colorize: true } }
                : undefined,
          },
    trustProxy: true,
  });

  server.setErrorHandler((error: FastifyError, _request, reply) => {
    server.log.error(error);

    const statusCode = error.statusCode || 500;
    const message =
      config.nodeEnv === "production" && statusCode === 500
        ? "Internal server error"
        : error.message;

    return reply.code(statusCode).send({
      success: false,
      error: message,
      ...(config.nodeEnv === "development" && { stack: error.stack }),
    });
  });

  await registerPlugins(server);
  await registerRoutes(server);

  return server;
}

async function bootstrap() {
  const server = await buildServer();
  try {
    await prisma.$connect();
    server.log.info("Database connected");

    if (config.redis.enabled) {
      try {
        await redis.connect();
        server.log.info("Redis connected");
      } catch {
        server.log.warn("Redis unavailable — caching disabled");
      }
    } else {
      server.log.info("Redis disabled by configuration");
    }

    try {
      await ensureIndexes();
      server.log.info("Meilisearch ready");
    } catch {
      server.log.warn("Meilisearch unavailable — search falls back to database");
    }

    await server.listen({ port: config.port, host: "0.0.0.0" });
    server.log.info(`Server running at http://localhost:${config.port}`);
    server.log.info(`Environment: ${config.nodeEnv}`);
  } catch (error) {
    server.log.error(error);
    await server.close();
    process.exit(1);
  }

  const shutdown = async () => {
    server.log.info("Shutting down...");
    await server.close();
    await prisma.$disconnect();
    try {
      redis.disconnect();
    } catch {
      // already closed
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  bootstrap();
}
