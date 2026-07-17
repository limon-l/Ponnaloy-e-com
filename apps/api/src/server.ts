import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { register } from "prom-client";

import { config } from "./config/env";
import prisma from "./lib/prisma";
import { redis, invalidateProductCache } from "./lib/redis";
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

const server = Fastify({
  logger: {
    level: config.nodeEnv === "development" ? "info" : "warn",
    transport:
      config.nodeEnv === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
  trustProxy: true,
});

// ── Plugins ──────────────────────────────────────────────────

async function registerPlugins() {
  await server.register(cors, {
    origin: [config.frontendUrl],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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
}

// ── Routes ───────────────────────────────────────────────────

async function registerRoutes() {
  // Health & metrics
  server.get("/api/health", async () => {
    const [dbCheck, redisCheck] = await Promise.allSettled([
      prisma.$runCommandRaw({ ping: 1 }),
      redis.ping(),
    ]);
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        database: dbCheck.status === "fulfilled" ? "connected" : "disconnected",
        redis: redisCheck.status === "fulfilled" ? "connected" : "disconnected",
      },
    };
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

  // Core routes
  await server.register(productRoutes, { prefix: "/api/products" });
  await server.register(categoryRoutes, { prefix: "/api/categories" });
  await server.register(brandRoutes, { prefix: "/api/brands" });
  await server.register(cartRoutes, { prefix: "/api/cart" });
  await server.register(orderRoutes, { prefix: "/api/orders" });
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

  // Webhooks (raw body needed)
  await server.register(webhookRoutes, { prefix: "/api/webhooks" });

  // Admin routes
  await server.register(adminRoutes, { prefix: "/api/admin" });
}

// ── Error handler ────────────────────────────────────────────

server.setErrorHandler((error, _request, reply) => {
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

// ── Graceful shutdown ────────────────────────────────────────

async function shutdown() {
  server.log.info("Shutting down...");
  await server.close();
  await prisma.$disconnect();
  try { await redis.quit(); } catch {}
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ── Bootstrap ────────────────────────────────────────────────

async function bootstrap() {
  try {
    await prisma.$connect();
    server.log.info("Database connected");

    try {
      await redis.connect();
      server.log.info("Redis connected");
    } catch (err) {
      server.log.warn("Redis unavailable — caching disabled");
    }

    try {
      await ensureIndexes();
      server.log.info("Meilisearch ready");
    } catch (err) {
      server.log.warn("Meilisearch unavailable — search disabled");
    }

    await registerPlugins();
    await registerRoutes();

    await server.listen({ port: config.port, host: "0.0.0.0" });
    server.log.info(`Server running at http://localhost:${config.port}`);
    server.log.info(`Environment: ${config.nodeEnv}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

bootstrap();
