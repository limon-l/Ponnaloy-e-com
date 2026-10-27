import path from "node:path";

// Must run before any application module is imported. The integration suite
// replaces MONGODB_URI with the in-memory server URI before importing Prisma.
process.env.NODE_ENV = "test";
// Reuse the workspace-level binary cache regardless of the test working dir.
process.env.MONGOMS_DOWNLOAD_DIR ??= path.resolve(
  process.cwd(),
  "../../node_modules/.cache/mongodb-memory-server"
);
process.env.JWT_SECRET =
  "test-only-jwt-secret-with-at-least-32-characters";
process.env.MONGODB_URI ??=
  "mongodb://127.0.0.1:27017/ponnaloy_test_placeholder";
process.env.REDIS_ENABLED = "false";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.ALLOW_VERCEL_PREVIEWS = "false";
