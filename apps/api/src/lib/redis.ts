import Redis from "ioredis";
import { config } from "../config/env";
import { CACHE_TTL } from "@ponnaloy/shared";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 50, 2000);
    },
    lazyConnect: true,
  });

redis.on("error", () => {});

if (config.nodeEnv !== "production") {
  globalForRedis.redis = redis;
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCache(
  key: string,
  value: unknown,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  } catch {
    // cache write failure is non-critical
  }
}

export async function deleteCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // ignore
  }
}

export async function invalidateProductCache(): Promise<void> {
  await deleteCache("products:*");
  await deleteCache("product:*");
  await deleteCache("homepage:*");
  await deleteCache("featured:*");
  await deleteCache("trending:*");
  await deleteCache("deals:*");
}

export default redis;
