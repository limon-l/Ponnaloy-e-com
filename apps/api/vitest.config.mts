import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup-env.ts"],
    // The integration suite owns a single MongoDB memory server and a single
    // Prisma client, so test files must not run concurrently.
    fileParallelism: false,
    pool: "forks",
    maxWorkers: 1,
    testTimeout: 60_000,
    hookTimeout: 240_000,
  },
});
