import { describe, expect, it } from "vitest";
import {
  computeOrderTotals,
  evaluateCoupon,
  type CouponPricingInput,
} from "../src/services/pricing";

const NOW = new Date("2026-06-01T12:00:00.000Z");

function coupon(
  overrides: Partial<CouponPricingInput> = {}
): CouponPricingInput {
  return {
    code: "TEST10",
    isActive: true,
    usedCount: 0,
    discountType: "PERCENTAGE",
    discountValue: 10,
    ...overrides,
  };
}

describe("computeOrderTotals", () => {
  it("adds the standard shipping fee below the free-shipping threshold", () => {
    const result = computeOrderTotals([{ unitPrice: 1999, quantity: 1 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totals).toEqual({
      subtotal: 1999,
      shippingFee: 1500,
      discount: 0,
      total: 3499,
      freeShipping: false,
    });
  });

  it("removes shipping at the free-shipping threshold", () => {
    const result = computeOrderTotals([{ unitPrice: 7500, quantity: 2 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totals.shippingFee).toBe(0);
    expect(result.totals.total).toBe(15000);
  });

  it("multiplies unit price by quantity across lines", () => {
    const result = computeOrderTotals([
      { unitPrice: 1000, quantity: 2 },
      { unitPrice: 500, quantity: 3 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totals.subtotal).toBe(3500);
  });

  it("rejects non-integer prices and quantities", () => {
    expect(
      computeOrderTotals([{ unitPrice: 10.5, quantity: 1 }]).ok
    ).toBe(false);
    expect(
      computeOrderTotals([{ unitPrice: 100, quantity: 0 }]).ok
    ).toBe(false);
  });
});

describe("evaluateCoupon", () => {
  it("rounds percentage discounts to the nearest cent", () => {
    const result = evaluateCoupon(coupon(), 1999, NOW);
    expect(result).toEqual({ ok: true, discount: 200, freeShipping: false });
  });

  it("caps a percentage discount at maxDiscountAmount", () => {
    const result = evaluateCoupon(
      coupon({ maxDiscountAmount: 150 }),
      5000,
      NOW
    );
    expect(result.ok && result.discount).toBe(150);
  });

  it("never discounts more than the subtotal", () => {
    const result = evaluateCoupon(
      coupon({ discountType: "FIXED", discountValue: 9999 }),
      1000,
      NOW
    );
    expect(result.ok && result.discount).toBe(1000);
  });

  it("marks free-shipping coupons without a cash discount", () => {
    const result = evaluateCoupon(
      coupon({ discountType: "FREE_SHIPPING", discountValue: 0 }),
      1000,
      NOW
    );
    expect(result).toEqual({ ok: true, discount: 0, freeShipping: true });
  });

  it("rejects inactive, future, expired, exhausted, and minimum-order coupons", () => {
    const cases: Array<[CouponPricingInput, string]> = [
      [coupon({ isActive: false }), "COUPON_INVALID"],
      [
        coupon({ startDate: new Date("2026-07-01T00:00:00.000Z") }),
        "COUPON_NOT_STARTED",
      ],
      [
        coupon({ endDate: new Date("2026-05-01T00:00:00.000Z") }),
        "COUPON_EXPIRED",
      ],
      [coupon({ usageLimit: 5, usedCount: 5 }), "COUPON_USAGE_LIMIT"],
      [coupon({ minOrderAmount: 5000 }), "COUPON_MIN_ORDER"],
    ];

    for (const [input, expectedCode] of cases) {
      const result = evaluateCoupon(input, 1000, NOW);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe(expectedCode);
    }
  });

  it("applies a free-shipping coupon to the order totals", () => {
    const result = computeOrderTotals(
      [{ unitPrice: 1000, quantity: 1 }],
      coupon({ discountType: "FREE_SHIPPING", discountValue: 0 }),
      NOW
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totals.shippingFee).toBe(0);
    expect(result.totals.discount).toBe(0);
    expect(result.totals.total).toBe(1000);
  });
});
