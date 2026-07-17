import "dotenv/config";

const required = ["MONGODB_URI"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  backendUrl: process.env.BACKEND_URL || "http://localhost:3001",

  database: {
    url: process.env.MONGODB_URI!,
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
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
} as const;
