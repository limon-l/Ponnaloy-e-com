import "dotenv/config";
import crypto from "crypto";

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

function fail(message: string): never {
  console.error(`[config] ${message}`);
  process.exit(1);
}

const required = ["MONGODB_URI"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  fail(`Missing required env vars: ${missing.join(", ")}`);
}

/**
 * Session/JWT signing secret.
 * - Production: required, no fallback, minimum 32 characters.
 * - Development: an ephemeral random secret is generated when absent so that
 *   we never ship a hardcoded "default" secret that could leak into prod.
 */
const configuredSecret = process.env.JWT_SECRET || process.env.AUTH_SECRET || "";
let jwtSecret = configuredSecret;

if (jwtSecret && jwtSecret.length < 32) {
  if (isProduction) {
    fail("JWT_SECRET must be at least 32 characters long.");
  }
  console.warn("[config] JWT_SECRET is shorter than 32 characters; use a longer random value before deploying.");
}

if (!jwtSecret) {
  if (isProduction) {
    fail("JWT_SECRET is required in production (minimum 32 characters).");
  }
  jwtSecret = crypto.randomBytes(48).toString("hex");
  console.warn("[config] No JWT_SECRET set; generated an ephemeral development secret (sessions reset on restart).");
}

const frontendUrlEnv = process.env.FRONTEND_URL || "http://localhost:3000";

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv,
  isProduction,
  frontendUrl: frontendUrlEnv,
  backendUrl: process.env.BACKEND_URL || "http://localhost:3001",

  auth: {
    jwtSecret,
  },

  database: {
    url: process.env.MONGODB_URI!,
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    // Set REDIS_ENABLED=false for isolated test runs or single-process
    // deployments where no cache is available.
    enabled: process.env.REDIS_ENABLED !== "false",
  },

  uploads: {
    // Local disk driver. Object storage (R2/S3) is a separate adapter and is
    // not enabled until its credentials and public URL are configured.
    dir: process.env.UPLOAD_DIR || "uploads",
  },

  meilisearch: {
    host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_API_KEY || "",
  },

  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY || "",
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET || "",
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  },

  email: {
    // SMTP is the only delivery mechanism. Without it, messages are serialised
    // by nodemailer's JSON transport and never leave the process.
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
    smtpSecure: process.env.SMTP_SECURE === "true",
    smtpUser: process.env.SMTP_USER || "",
    smtpPassword: process.env.SMTP_PASSWORD || "",
    from: process.env.EMAIL_FROM || "Ponnaloy <no-reply@ponnaloy.local>",
  },

  r2: {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucketName: process.env.R2_BUCKET_NAME || "ponnaloy",
    publicUrl: process.env.R2_PUBLIC_URL || "",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
  },

  /**
   * Feature flags derived from actual configuration. Routes use these instead
   * of advertising capabilities the deployment cannot provide.
   */
  features: {
    stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    clerk: Boolean(process.env.CLERK_SECRET_KEY),
    search: Boolean(process.env.MEILISEARCH_HOST),
    email: Boolean(process.env.SMTP_HOST),
  },
} as const;
