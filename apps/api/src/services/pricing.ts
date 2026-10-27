import {
  DEFAULT_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
} from "@ponnaloy/shared";

export type DiscountTypeValue = "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";

/** Minimal coupon shape required to price an order. */
export interface CouponPricingInput {
  code?: string;
  isActive: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  usageLimit?: number | null;
  usedCount: number;
  minOrderAmount?: number | null;
  discountType: DiscountTypeValue;
  discountValue: number;
  maxDiscountAmount?: number | null;
}

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

export type CouponEvaluation =
  | { ok: true; discount: number; freeShipping: boolean }
  | {
      ok: false;
      error: string;
      code:
        | "COUPON_INVALID"
        | "COUPON_NOT_STARTED"
        | "COUPON_EXPIRED"
        | "COUPON_USAGE_LIMIT"
        | "COUPON_MIN_ORDER";
    };

/**
 * Single source of truth for coupon eligibility and discount maths.
 * Both the preview endpoint (`POST /api/coupons/validate`) and checkout use
 * this function, so the amount shown to a customer is the amount charged.
 */
export function evaluateCoupon(
  coupon: CouponPricingInput,
  subtotal: number,
  now: Date = new Date()
): CouponEvaluation {
  if (!coupon.isActive) {
    return {
      ok: false,
      error: "This coupon is no longer valid.",
      code: "COUPON_INVALID",
    };
  }
  if (coupon.startDate && coupon.startDate > now) {
    return {
      ok: false,
      error: "This coupon is not active yet.",
      code: "COUPON_NOT_STARTED",
    };
  }
  if (coupon.endDate && coupon.endDate < now) {
    return {
      ok: false,
      error: "This coupon has expired.",
      code: "COUPON_EXPIRED",
    };
  }
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
    if (coupon.usedCount >= coupon.usageLimit) {
      return {
        ok: false,
        error: "This coupon has reached its usage limit.",
        code: "COUPON_USAGE_LIMIT",
      };
    }
  }
  if (
    coupon.minOrderAmount !== null &&
    coupon.minOrderAmount !== undefined &&
    subtotal < coupon.minOrderAmount
  ) {
    return {
      ok: false,
      error: `This coupon requires a minimum order of $${(
        coupon.minOrderAmount / 100
      ).toFixed(2)}.`,
      code: "COUPON_MIN_ORDER",
    };
  }

  if (coupon.discountType === "FREE_SHIPPING") {
    return { ok: true, discount: 0, freeShipping: true };
  }

  let discount =
    coupon.discountType === "PERCENTAGE"
      ? Math.round((subtotal * coupon.discountValue) / 100)
      : coupon.discountValue;

  if (
    coupon.maxDiscountAmount !== null &&
    coupon.maxDiscountAmount !== undefined
  ) {
    discount = Math.min(discount, coupon.maxDiscountAmount);
  }

  // A coupon can never make the order negative or exceed its item subtotal.
  discount = Math.max(0, Math.min(discount, subtotal));

  return { ok: true, discount, freeShipping: false };
}

export interface OrderTotals {
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  freeShipping: boolean;
}

export type PricingErrorCode =
  | "COUPON_INVALID"
  | "COUPON_NOT_STARTED"
  | "COUPON_EXPIRED"
  | "COUPON_USAGE_LIMIT"
  | "COUPON_MIN_ORDER"
  | "INVALID_PRICE"
  | "INVALID_QUANTITY";

export type OrderPricingResult =
  | { ok: true; totals: OrderTotals }
  | { ok: false; error: string; code: PricingErrorCode };

export function computeOrderTotals(
  lines: PricedLine[],
  coupon?: CouponPricingInput | null,
  now: Date = new Date()
): OrderPricingResult {
  let subtotal = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0) {
      return {
        ok: false,
        error: "A product has an invalid price. Please contact support.",
        code: "INVALID_PRICE",
      };
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      return {
        ok: false,
        error: "A product has an invalid quantity.",
        code: "INVALID_QUANTITY",
      };
    }
    subtotal += line.unitPrice * line.quantity;
  }

  let shippingFee =
    subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
  let discount = 0;
  let freeShipping = false;

  if (coupon) {
    const evaluation = evaluateCoupon(coupon, subtotal, now);
    if (!evaluation.ok) return evaluation;
    discount = evaluation.discount;
    freeShipping = evaluation.freeShipping;
    if (freeShipping) shippingFee = 0;
  }

  return {
    ok: true,
    totals: {
      subtotal,
      shippingFee,
      discount,
      total: subtotal + shippingFee - discount,
      freeShipping,
    },
  };
}
