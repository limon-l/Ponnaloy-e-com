import Redis from "ioredis";
import { config } from "../config/env";
import { CACHE_TTL } from "@ponnaloy/shared";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

/**
 * Cache availability is a runtime concern, not just configuration: a Redis
 * outage must degrade to the in-process cache immediately instead of making
 * every request wait for connection retries. Without this, each API call pays
 * several seconds of retry backoff when Redis is down.
 */
let cacheAvailable = config.redis.enabled;

export function disableCache(): void {
  cacheAvailable = false;
}

export function isCacheAvailable(): boolean {
  return cacheAvailable;
}

export const redis =
  globalForRedis.redis ??
  new Redis(config.redis.url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1_500,
    // Fail fast instead of queueing commands while the socket is down.
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 1) return null;
      return 200;
    },
    lazyConnect: true,
  });

redis.on("error", () => {
  // Errors are surfaced through getCache/setCache; logging every reconnect
  // attempt would flood the log without adding information.
});

if (config.nodeEnv !== "production") {
  globalForRedis.redis = redis;
}

/**
 * Small in-process cache used when Redis is absent. It runs everywhere except
 * tests (unless explicitly disabled with MEMORY_CACHE=false) so local
 * development does not pay an Atlas round trip for every navigation. Entries
 * are capped at 30 seconds to bound staleness.
 */
const MEMORY_TTL_CAP_MS = 30_000;
const memoryEnabled =
  config.nodeEnv !== "test" && process.env.MEMORY_CACHE !== "false";
const memory = new Map<string, { value: string; expiresAt: number }>();

function memoryGet<T>(key: string): T | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  try {
    return JSON.parse(entry.value) as T;
  } catch {
    return null;
  }
}

function memorySet(key: string, value: unknown, ttlSeconds: number): void {
  if (!memoryEnabled) return;
  if (memory.size > 500) {
    // Simple bound: drop the oldest entry when the map grows too large.
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
  memory.set(key, {
    value: JSON.stringify(value),
    expiresAt: Date.now() + Math.min(ttlSeconds * 1000, MEMORY_TTL_CAP_MS),
  });
}

function memoryDeletePattern(pattern: string): void {
  const prefix = pattern.replace(/\*$/, "");
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!cacheAvailable) return memoryGet<T>(key);
  try {
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    disableCache();
    return memoryGet<T>(key);
  }
}

export async function setCache(
  key: string,
  value: unknown,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<void> {
  if (!cacheAvailable) {
    memorySet(key, value, ttl);
    return;
  }
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  } catch {
    disableCache();
    memorySet(key, value, ttl);
  }
}

export async function deleteCache(pattern: string): Promise<void> {
  memoryDeletePattern(pattern);
  if (!cacheAvailable) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    disableCache();
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
