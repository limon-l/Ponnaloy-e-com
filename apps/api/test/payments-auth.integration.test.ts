import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import crypto from "node:crypto";
import Stripe from "stripe";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";

const STRIPE_SECRET = "sk_test_webhook_only";
const STRIPE_WEBHOOK_SECRET = "whsec_test_ponnaloy_webhook_secret";
const PASSWORD = "StrongPass1";
const NEW_PASSWORD = "EvenStronger2";

let mongo: MongoMemoryReplSet;
let app: FastifyInstance;
let prisma: PrismaClient;

// Must be set before the application (and its config module) is imported.
process.env.STRIPE_SECRET_KEY = STRIPE_SECRET;
process.env.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET;
delete process.env.SMTP_HOST;

const SHIPPING = {
  fullName: "Webhook Buyer",
  phone: "+15550003333",
  addressLine1: "3 Webhook Street",
  city: "Testville",
  state: "TS",
  zipCode: "12345",
  country: "US",
};

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signUpAndSignIn(prefix: string) {
  const email = uniqueEmail(prefix);
  const signUp = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up",
    payload: { email, password: PASSWORD, firstName: "Test", lastName: prefix },
  });
  expect(signUp.statusCode).toBe(201);

  const signIn = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in",
    payload: { email, password: PASSWORD },
  });
  expect(signIn.statusCode).toBe(200);
  return {
    email,
    userId: signUp.json().data.id as string,
    token: signIn.json().data.token as string,
  };
}

function extractResetToken(text: string): string {
  const match = text.match(/reset-password\?token=([^\s]+)/);
  if (!match) throw new Error(`No reset token in email: ${text}`);
  return decodeURIComponent(match[1]);
}

interface OrderOptions {
  amount?: number;
  orderStatus?: "PENDING" | "CONFIRMED";
  paymentStatus?: "PENDING" | "SUCCEEDED";
  sessionId?: string;
  transactionId?: string;
  productId?: string;
  quantity?: number;
}

async function createStripeOrder(options: OrderOptions = {}) {
  const amount = options.amount ?? 5000;
  const user = await prisma.user.create({
    data: { email: uniqueEmail("webhook-buyer"), firstName: "Webhook", lastName: "Buyer" },
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: user.id,
      status: options.orderStatus ?? "PENDING",
      subtotal: amount,
      shippingFee: 0,
      tax: 0,
      discount: 0,
      total: amount,
      currency: "USD",
      shippingAddress: SHIPPING,
      items: options.productId
        ? {
            create: {
              productId: options.productId,
              quantity: options.quantity ?? 3,
              unitPrice: Math.floor(amount / (options.quantity ?? 3)),
              total: amount,
            },
          }
        : undefined,
      payments: {
        create: {
          amount,
          method: "STRIPE",
          status: options.paymentStatus ?? "PENDING",
          stripeSessionId: options.sessionId,
          transactionId: options.transactionId,
        },
      },
      statusHistory: {
        create: { status: options.orderStatus ?? "PENDING", note: "Order placed" },
      },
    },
    include: { payments: true },
  });

  return { user, order, payment: order.payments[0] };
}

function stripeEvent(id: string, type: string, object: Record<string, unknown>) {
  return {
    id,
    object: "event",
    api_version: "2025-02-24.acacia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type,
    data: { object },
  };
}

async function postStripeEvent(event: unknown, signature?: string) {
  const payload = JSON.stringify(event);
  const header =
    signature ??
    Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET,
    });

  return app.inject({
    method: "POST",
    url: "/api/webhooks/stripe",
    headers: {
      "content-type": "application/json",
      "stripe-signature": header,
    },
    payload,
  });
}

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = mongo.getUri("ponnaloy_payments_auth_test");

  const [{ buildServer }, prismaModule] = await Promise.all([
    import("../src/server"),
    import("../src/lib/prisma"),
  ]);
  prisma = prismaModule.default;
  app = await buildServer({ logger: false });
  await app.ready();

  // The test database is created implicitly on first write, so the unique
  // index that makes webhook processing idempotent does not exist yet. Create
  // the same index `prisma db push` provisions in production.
  await prisma.$runCommandRaw({
    createIndexes: "PaymentEvent",
    indexes: [
      { key: { eventId: 1 }, name: "PaymentEvent_eventId_key", unique: true },
    ],
  });
}, 240_000);

afterAll(async () => {
  if (app) await app.close();
  if (prisma) await prisma.$disconnect();
  if (mongo) await mongo.stop();
});

beforeEach(async () => {
  const { clearCapturedEmails } = await import("../src/lib/email");
  clearCapturedEmails();
});

describe("password reset", () => {
  it("issues a single-use hashed token, rotates the password and invalidates old JWTs", async () => {
    const { lastCapturedEmailFor } = await import("../src/lib/email");
    const { email, userId, token: oldToken } = await signUpAndSignIn("reset-flow");

    const forgot = await app.inject({
      method: "POST",
      url: "/api/auth/forgot-password",
      payload: { email },
    });
    expect(forgot.statusCode).toBe(200);
    expect(forgot.json().message).toContain("If an account exists");

    const message = lastCapturedEmailFor(email);
    expect(message).toBeDefined();
    const rawToken = extractResetToken(message!.text);

    // Only the SHA-256 hash is persisted; the raw token exists solely in mail.
    const stored = await prisma.passwordResetToken.findMany({ where: { userId } });
    expect(stored).toHaveLength(1);
    expect(stored[0].tokenHash).not.toBe(rawToken);
    expect(stored[0].tokenHash).toBe(
      crypto.createHash("sha256").update(rawToken).digest("hex")
    );
    expect(stored[0].expiresAt.getTime()).toBeGreaterThan(Date.now());

    const reset = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: { token: rawToken, password: NEW_PASSWORD },
    });
    expect(reset.statusCode).toBe(200);

    // The same link cannot be replayed.
    const replay = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: { token: rawToken, password: NEW_PASSWORD },
    });
    expect(replay.statusCode).toBe(400);
    expect(replay.json().code).toBe("RESET_TOKEN_INVALID");

    // The old password no longer works; the new one does.
    const oldLogin = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in",
      payload: { email, password: PASSWORD },
    });
    expect(oldLogin.statusCode).toBe(401);

    const newLogin = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in",
      payload: { email, password: NEW_PASSWORD },
    });
    expect(newLogin.statusCode).toBe(200);

    // Tokens minted before the credential change are rejected everywhere.
    const protectedCall = await app.inject({
      method: "GET",
      url: "/api/orders",
      headers: auth(oldToken),
    });
    expect(protectedCall.statusCode).toBe(401);

    const meCall = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: auth(oldToken),
    });
    expect(meCall.statusCode).toBe(401);

    // The freshly issued token remains valid.
    const freshCall = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: auth(newLogin.json().data.token as string),
    });
    expect(freshCall.statusCode).toBe(200);
  });

  it("does not reveal whether an account exists", async () => {
    const { getCapturedEmails } = await import("../src/lib/email");
    const email = uniqueEmail("missing-account");

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/forgot-password",
      payload: { email },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().message).toContain("If an account exists");
    expect(getCapturedEmails().some((mail) => mail.to === email)).toBe(false);
  });

  it("rejects an expired reset token", async () => {
    const { userId } = await signUpAndSignIn("expired-token");
    const rawToken = crypto.randomBytes(32).toString("base64url");

    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: { token: rawToken, password: NEW_PASSWORD },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("RESET_TOKEN_INVALID");
  });

  it("enforces the password policy before consuming the token", async () => {
    const { lastCapturedEmailFor } = await import("../src/lib/email");
    const { email, userId } = await signUpAndSignIn("weak-reset");

    await app.inject({
      method: "POST",
      url: "/api/auth/forgot-password",
      payload: { email },
    });
    const rawToken = extractResetToken(lastCapturedEmailFor(email)!.text);

    const weak = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: { token: rawToken, password: "weak" },
    });
    expect(weak.statusCode).toBe(400);

    const stillValid = await prisma.passwordResetToken.findFirst({
      where: {
        userId,
        OR: [{ usedAt: { isSet: false } }, { usedAt: null }],
      },
    });
    expect(stillValid).not.toBeNull();
  });
});

describe("admin refund authorization", () => {
  async function createAdminToken() {
    const user = await prisma.user.create({
      data: {
        email: uniqueEmail("refund-admin"),
        firstName: "Refund",
        lastName: "Admin",
        role: "ADMIN",
      },
    });
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" })
    ).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const body = Buffer.from(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        role: "ADMIN",
        iat: now,
        exp: now + 3600,
      })
    ).toString("base64url");
    const signature = crypto
      .createHmac("sha256", process.env.JWT_SECRET!)
      .update(`${header}.${body}`)
      .digest("base64url");
    return `${header}.${body}.${signature}`;
  }

  async function createCodPayment() {
    const user = await prisma.user.create({
      data: { email: uniqueEmail("cod-buyer") },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-COD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId: user.id,
        subtotal: 2000,
        shippingFee: 0,
        tax: 0,
        discount: 0,
        total: 2000,
        currency: "USD",
        shippingAddress: SHIPPING,
        payments: { create: { amount: 2000, method: "COD", status: "PENDING" } },
      },
      include: { payments: true },
    });
    return order.payments[0];
  }

  it("denies customers access to the admin refund endpoint", async () => {
    const { token } = await signUpAndSignIn("refund-customer");
    const payment = await createCodPayment();

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/payments/${payment.id}/refund`,
      headers: { ...auth(token), "idempotency-key": "customer-attempt-123" },
      payload: {},
    });

    expect(response.statusCode).toBe(403);
  });

  it("rejects gateway refunds for cash payments", async () => {
    const token = await createAdminToken();
    const payment = await createCodPayment();

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/payments/${payment.id}/refund`,
      headers: { ...auth(token), "idempotency-key": "cod-refund-attempt-123" },
      payload: {},
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("REFUND_NOT_GATEWAY_SUPPORTED");
  });

  it("requires an idempotency key before contacting the provider", async () => {
    const token = await createAdminToken();
    const payment = await createCodPayment();

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/payments/${payment.id}/refund`,
      headers: auth(token),
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("IDEMPOTENCY_KEY_REQUIRED");
  });
});

describe("stripe webhooks", () => {
  it("rejects a payload with an invalid signature", async () => {
    const event = stripeEvent(`evt_bad_${Date.now()}`, "checkout.session.completed", {
      id: "cs_bad",
      object: "checkout.session",
    });

    const response = await postStripeEvent(event, "t=1,v1=deadbeef");
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("Invalid signature");
  });

  it("confirms a paid order exactly once for duplicate deliveries", async () => {
    const sessionId = `cs_test_${Date.now()}`;
    const { order, payment } = await createStripeOrder({
      amount: 5000,
      sessionId,
    });

    const event = stripeEvent(`evt_paid_${Date.now()}`, "checkout.session.completed", {
      id: sessionId,
      object: "checkout.session",
      amount_total: 5000,
      currency: "usd",
      payment_intent: `pi_${Date.now()}`,
      metadata: { orderId: order.id, paymentId: payment.id },
    });

    const first = await postStripeEvent(event);
    expect(first.statusCode).toBe(200);
    expect(first.json().outcome).toBe("paid");

    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(updatedPayment?.status).toBe("SUCCEEDED");
    expect(updatedPayment?.transactionId).toMatch(/^pi_/);

    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder?.status).toBe("CONFIRMED");

    const second = await postStripeEvent(event);
    expect(second.statusCode).toBe(200);
    expect(second.json().duplicate).toBe(true);

    expect(await prisma.paymentEvent.count({ where: { eventId: event.id } })).toBe(1);
    expect(await prisma.orderStatusLog.count({ where: { orderId: order.id } })).toBe(2);
  });

  it("never credits an order whose collected amount differs", async () => {
    const sessionId = `cs_mismatch_${Date.now()}`;
    const { order, payment } = await createStripeOrder({
      amount: 5000,
      sessionId,
    });

    const event = stripeEvent(`evt_mismatch_${Date.now()}`, "checkout.session.completed", {
      id: sessionId,
      object: "checkout.session",
      amount_total: 100,
      currency: "usd",
      payment_intent: `pi_mismatch_${Date.now()}`,
    });

    const response = await postStripeEvent(event);
    expect(response.statusCode).toBe(200);
    expect(response.json().outcome).toBe("amount_mismatch");

    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe(
      "PENDING"
    );
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe(
      "PENDING"
    );
  });

  it("cancels an unpaid order and releases reserved stock when the session expires", async () => {
    const product = await prisma.product.create({
      data: {
        name: `Expiry Product ${Date.now()}`,
        slug: `expiry-product-${Date.now()}`,
        price: 1000,
        stock: 7, // 10 originally, 3 reserved by the order
        totalSold: 3,
        status: "ACTIVE",
      },
    });
    const sessionId = `cs_expired_${Date.now()}`;
    const { order, payment } = await createStripeOrder({
      amount: 3000,
      sessionId,
      productId: product.id,
      quantity: 3,
    });

    const event = stripeEvent(`evt_expired_${Date.now()}`, "checkout.session.expired", {
      id: sessionId,
      object: "checkout.session",
      amount_total: 3000,
      currency: "usd",
    });

    const response = await postStripeEvent(event);
    expect(response.statusCode).toBe(200);
    expect(response.json().outcome).toBe("expired");

    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe(
      "FAILED"
    );
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe(
      "CANCELLED"
    );
    const restocked = await prisma.product.findUnique({ where: { id: product.id } });
    expect(restocked?.stock).toBe(10);
    expect(restocked?.totalSold).toBe(0);

    // A replayed expiry event must not restock twice.
    const replay = await postStripeEvent(event);
    expect(replay.json().duplicate).toBe(true);
    expect((await prisma.product.findUnique({ where: { id: product.id } }))?.stock).toBe(10);
  });

  it("marks a payment and order refunded only for a full refund", async () => {
    const transactionId = `pi_refund_${Date.now()}`;
    const { order, payment } = await createStripeOrder({
      amount: 4200,
      orderStatus: "CONFIRMED",
      paymentStatus: "SUCCEEDED",
      transactionId,
    });

    const partial = stripeEvent(`evt_partial_${Date.now()}`, "charge.refunded", {
      id: `ch_partial_${Date.now()}`,
      object: "charge",
      payment_intent: transactionId,
      refunded: false,
      amount: 4200,
      amount_refunded: 1000,
      currency: "usd",
    });
    const partialResponse = await postStripeEvent(partial);
    expect(partialResponse.json().outcome).toBe("partial_refund");
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe(
      "SUCCEEDED"
    );

    const full = stripeEvent(`evt_full_${Date.now()}`, "charge.refunded", {
      id: `ch_full_${Date.now()}`,
      object: "charge",
      payment_intent: transactionId,
      refunded: true,
      amount: 4200,
      amount_refunded: 4200,
      currency: "usd",
    });
    const fullResponse = await postStripeEvent(full);
    expect(fullResponse.json().outcome).toBe("refunded");
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe(
      "REFUNDED"
    );
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe(
      "REFUNDED"
    );
  });
});
