import Stripe from "stripe";
import { config } from "../config/env";

/**
 * Stripe is only usable when BOTH the secret key and webhook secret are set.
 * Without the webhook secret we could take money but never verify that the
 * payment succeeded, so the feature is treated as disabled.
 */
export function isStripeConfigured(): boolean {
  return Boolean(config.stripe.secretKey && config.stripe.webhookSecret);
}

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured");
  }
  if (!client) {
    client = new Stripe(config.stripe.secretKey, {
      // Pin the API surface so provider-side upgrades cannot silently change
      // field semantics under a deployed release.
      apiVersion: "2025-02-24.acacia",
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return client;
}

/** Currencies Stripe accepts for card payments, lower-cased. */
const SUPPORTED_CURRENCIES = new Set([
  "usd", "eur", "gbp", "bdt", "inr", "aud", "cad", "jpy", "sgp", "aed",
]);

/** Smallest charge Stripe will accept per currency (minor units). */
const MINIMUM_AMOUNT: Record<string, number> = {
  usd: 50,
  eur: 50,
  gbp: 30,
  bdt: 5000,
  inr: 5000,
  aud: 50,
  cad: 50,
  jpy: 50,
  sgp: 50,
  aed: 200,
};

export class StripeAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeAmountError";
  }
}

export interface CheckoutSessionInput {
  orderId: string;
  paymentId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail?: string | null;
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

function normaliseCurrency(currency: string): string {
  return currency.trim().toLowerCase();
}

/**
 * Creates (or reuses) a hosted Checkout Session for an existing order.
 *
 * The amount comes exclusively from the persisted order, never from the
 * client. The payment record id doubles as the Stripe idempotency key, so a
 * double-clicked "pay" action can only ever create one session.
 */
export async function createCheckoutSession(
  input: CheckoutSessionInput
): Promise<CheckoutSessionResult> {
  const currency = normaliseCurrency(input.currency);
  if (!SUPPORTED_CURRENCIES.has(currency)) {
    throw new StripeAmountError(`Currency ${currency.toUpperCase()} is not supported for card payments.`);
  }
  const minimum = MINIMUM_AMOUNT[currency] ?? 50;
  if (!Number.isInteger(input.amount) || input.amount < minimum) {
    throw new StripeAmountError(
      `Card payments require a minimum charge of ${minimum} ${currency.toUpperCase()} cents.`
    );
  }

  const stripe = getStripe();
  const baseUrl = config.frontendUrl.replace(/\/$/, "");
  const metadata = {
    orderId: input.orderId,
    paymentId: input.paymentId,
    orderNumber: input.orderNumber,
  };

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: input.amount,
            product_data: {
              name: `Ponnaloy order ${input.orderNumber}`,
            },
          },
        },
      ],
      client_reference_id: input.orderId,
      customer_email: input.customerEmail || undefined,
      metadata,
      payment_intent_data: { metadata },
      success_url: `${baseUrl}/orders?payment=success&order=${encodeURIComponent(input.orderId)}`,
      cancel_url: `${baseUrl}/orders?payment=cancelled&order=${encodeURIComponent(input.orderId)}`,
      // Stripe's minimum is 30 minutes; expire stale sessions so abandoned
      // checkouts release their reserved inventory.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { idempotencyKey: `checkout-session:${input.paymentId}` }
  );

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return { id: session.id, url: session.url };
}

export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.retrieve(sessionId);
}

export async function retrievePaymentIntent(intentId: string): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.retrieve(intentId);
}

export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    config.stripe.webhookSecret
  );
}

export interface RefundInput {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
  idempotencyKey: string;
}

export async function createStripeRefund(input: RefundInput): Promise<Stripe.Refund> {
  return getStripe().refunds.create(
    {
      payment_intent: input.paymentIntentId,
      amount: input.amount,
      reason:
        input.reason === "fraud"
          ? "fraudulent"
          : input.reason === "duplicate"
            ? "duplicate"
            : "requested_by_customer",
      metadata: { idempotencyKey: input.idempotencyKey },
    },
    { idempotencyKey: input.idempotencyKey }
  );
}
