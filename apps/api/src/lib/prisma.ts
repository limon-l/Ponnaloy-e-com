import { PrismaClient } from "@prisma/client";
import { config } from "../config/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging is intentionally excluded: it serialises every query to the
    // console and measurably slows down request handling in development.
    log: config.nodeEnv === "development" ? ["error", "warn"] : ["error"],
  });

if (config.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
