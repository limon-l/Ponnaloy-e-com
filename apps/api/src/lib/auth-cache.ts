import { createHash } from "node:crypto";
import { config } from "../config/env";

export interface CachedIdentity {
  id: string;
  clerkId?: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

/**
 * Every authenticated request otherwise pays one Atlas round trip (~60-250 ms)
 * just to load the user row. A very short-lived cache removes that cost on the
 * burst of requests a single page view triggers.
 *
 * Safety properties:
 * - Callers must verify the JWT signature and expiry before reading a cache hit.
 * - Entries live for 10 seconds at most and are dropped explicitly whenever a
 *   user's role, active flag, password or profile changes.
 * - Disabled in tests so integration tests always observe fresh state.
 */
const AUTH_CACHE_TTL_MS = 10_000;
const AUTH_CACHE_MAX_ENTRIES = 1_000;
const enabled = config.nodeEnv !== "test";

const cache = new Map<string, { identity: CachedIdentity; expiresAt: number }>();

function keyFor(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function readCachedIdentity(token: string): CachedIdentity | null {
  if (!enabled) return null;
  const key = keyFor(token);
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.identity;
}

export function writeCachedIdentity(token: string, identity: CachedIdentity): void {
  if (!enabled) return;
  if (cache.size >= AUTH_CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(keyFor(token), {
    identity,
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
  });
}

/** Drop cached identities after a security-relevant user change. */
export function invalidateAuthCache(userId?: string): void {
  if (!userId) {
    cache.clear();
    return;
  }
  for (const [key, entry] of cache) {
    if (entry.identity.id === userId) cache.delete(key);
  }
}
