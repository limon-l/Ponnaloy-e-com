import type { Prisma } from "@prisma/client";

/**
 * Products visible in the public catalogue:
 *  - the listing itself must be ACTIVE
 *  - seller-owned products must have passed moderation
 *  - the owning seller must be APPROVED (platform-owned products have no seller)
 *
 * The fragment is expressed through `AND` so callers can freely combine it with
 * their own `OR` search clauses without one overwriting the other.
 *
 * MongoDB documents written before the marketplace migration simply omit
 * `sellerId` and `moderationStatus`. A `null` filter does not match missing
 * fields, so `isSet: false` is required as well — without it every legacy
 * platform product disappears from the public catalogue.
 */
export function publicProductVisibility(): Prisma.ProductWhereInput {
  return {
    AND: [
      {
        OR: [
          { moderationStatus: { isSet: false } },
          { moderationStatus: null },
          { moderationStatus: "APPROVED" },
        ],
      },
      {
        OR: [
          { sellerId: { isSet: false } },
          { sellerId: null },
          { seller: { is: { status: "APPROVED" } } },
        ],
      },
    ],
  };
}

/**
 * Split an integer amount across weighted buckets without losing or inventing
 * cents. Used for per-seller allocation of order-level shipping and discounts.
 * The sum of the result always equals `amount`.
 */
export function allocateAmount(amount: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const safeAmount = Math.max(0, Math.round(amount));
  const totalWeight = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);

  if (totalWeight <= 0) {
    const result = weights.map(() => 0);
    result[0] = safeAmount;
    return result;
  }

  const raw = weights.map((weight) => (safeAmount * Math.max(0, weight)) / totalWeight);
  const result = raw.map((value) => Math.floor(value));
  let remainder = safeAmount - result.reduce((sum, value) => sum + value, 0);

  const byFraction = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  let cursor = 0;
  while (remainder > 0) {
    result[byFraction[cursor % byFraction.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return result;
}

/** Commission for a seller subtotal, in integer cents. */
export function commissionFor(subtotal: number, rateBasisPoints: number): number {
  const safeRate = Math.min(10000, Math.max(0, Math.round(rateBasisPoints)));
  return Math.round((subtotal * safeRate) / 10000);
}
