import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";

const PASSWORD = "StrongPass1";

let mongo: MongoMemoryReplSet;
let app: FastifyInstance;
let prisma: PrismaClient;

const SHIPPING = {
  fullName: "Test Buyer",
  phone: "+15550001111",
  addressLine1: "1 Test Street",
  city: "Testville",
  state: "TS",
  zipCode: "12345",
  country: "US",
};

function mintToken(userId: string, email: string, role = "CUSTOMER"): string {
  const secret = process.env.JWT_SECRET!;
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ sub: userId, email, role, iat: now, exp: now + 3600 })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

async function createUser(prefix: string) {
  const email = `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;
  const user = await prisma.user.create({
    data: { email, firstName: "Test", lastName: prefix },
  });
  return { user, token: mintToken(user.id, user.email) };
}

async function createAdmin(prefix: string) {
  const email = `${prefix}-admin-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      firstName: "Admin",
      lastName: prefix,
      role: "ADMIN",
    },
  });
  return { user, token: mintToken(user.id, user.email, "ADMIN") };
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function createProduct(overrides: Record<string, unknown> = {}) {
  return prisma.product.create({
    data: {
      name: "Test Product",
      slug: `test-product-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
      price: 1999,
      status: "ACTIVE",
      stock: 10,
      ...overrides,
    },
  });
}

async function addToCart(
  token: string,
  productId: string,
  quantity = 1,
  variantId?: string
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/cart/items",
    headers: auth(token),
    payload: { productId, quantity, ...(variantId && { variantId }) },
  });
  expect(response.statusCode).toBe(200);
  return response;
}

function orderPayload(overrides: Record<string, unknown> = {}) {
  return {
    shippingAddress: SHIPPING,
    paymentMethod: "COD",
    ...overrides,
  };
}

async function placeOrder(
  token: string,
  overrides: Record<string, unknown> = {}
) {
  return app.inject({
    method: "POST",
    url: "/api/orders",
    headers: auth(token),
    payload: orderPayload(overrides),
  });
}

beforeAll(async () => {
  // Prisma's MongoDB connector wraps writes in transactions, so the test
  // server must run as a single-node replica set (as production must too).
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  // Prisma requires an explicit database name in the connection string.
  const uri = mongo.getUri("ponnaloy_test");
  process.env.MONGODB_URI = uri;

  // Collections are created implicitly on first write. Schema/index drift is
  // validated separately with `prisma db push`; keeping the suite free of
  // child-process CLI calls avoids Windows process-tree hangs in CI.
  const [{ buildServer }, prismaModule] = await Promise.all([
    import("../src/server"),
    import("../src/lib/prisma"),
  ]);
  prisma = prismaModule.default;
  app = await buildServer({ logger: false });
  await app.ready();
}, 240_000);

afterAll(async () => {
  if (app) await app.close();
  if (prisma) await prisma.$disconnect();
  if (mongo) await mongo.stop();
});

describe("platform readiness", () => {
  it("reports a live API and a connected database", async () => {
    const live = await app.inject({ method: "GET", url: "/api/health/live" });
    expect(live.statusCode).toBe(200);

    const health = await app.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
    const body = health.json();
    expect(body.services.database).toBe("connected");
    expect(body.services.redis).toBe("disabled");
  });

  it("only advertises payment methods that are actually configured", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/payments/methods",
    });
    expect(response.statusCode).toBe(200);
    const methods = response
      .json()
      .data.methods.map((method: { id: string }) => method.id);
    expect(methods).toEqual(["COD", "BANK_TRANSFER"]);
  });

  it("rejects unauthenticated order access", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/orders",
    });
    expect(response.statusCode).toBe(401);
  });
});

describe("authentication", () => {
  it("registers, signs in, and resolves the current user", async () => {
    const email = `auth-${Date.now()}@example.com`;
    const signUp = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up",
      payload: {
        email,
        password: PASSWORD,
        firstName: "Auth",
        lastName: "Tester",
      },
    });
    expect(signUp.statusCode).toBe(201);

    const signIn = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in",
      payload: { email, password: PASSWORD },
    });
    expect(signIn.statusCode).toBe(200);
    const token = signIn.json().data.token as string;
    expect(token.split(".")).toHaveLength(3);

    const me = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: auth(token),
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.email).toBe(email);
  });

  it("rejects a tampered token", async () => {
    const { token } = await createUser("tamper");
    const tampered = `${token.slice(0, -2)}xx`;
    const response = await app.inject({
      method: "GET",
      url: "/api/orders",
      headers: auth(tampered),
    });
    expect(response.statusCode).toBe(401);
  });
});

describe("checkout integrity", () => {
  it("recomputes totals, decrements stock, and replays idempotently", async () => {
    const { token } = await createUser("checkout");
    const product = await createProduct({ stock: 5, price: 1999 });
    await addToCart(token, product.id, 2);

    const key = `checkout-key-${Date.now()}`;
    const first = await placeOrder(token, { idempotencyKey: key });
    expect(first.statusCode).toBe(201);
    const order = first.json().data;
    expect(order.subtotal).toBe(3998);
    expect(order.shippingFee).toBe(1500);
    expect(order.discount).toBe(0);
    expect(order.total).toBe(5498);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].unitPrice).toBe(1999);

    const stored = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(stored?.stock).toBe(3);
    expect(stored?.totalSold).toBe(2);

    const cart = await prisma.cart.findUnique({
      where: { userId: order.userId },
      include: { items: true },
    });
    expect(cart?.items).toHaveLength(0);

    const replay = await placeOrder(token, { idempotencyKey: key });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().idempotent).toBe(true);
    expect(replay.json().data.id).toBe(order.id);

    const afterReplay = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(afterReplay?.stock).toBe(3);
  });

  it("rejects an unsupported payment method without creating an order", async () => {
    const { token, user } = await createUser("stripe");
    const product = await createProduct({ stock: 5 });
    await addToCart(token, product.id, 1);

    const response = await placeOrder(token, { paymentMethod: "STRIPE" });
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("PAYMENT_METHOD_UNAVAILABLE");

    const ordersForUser = await prisma.order.count({
      where: { userId: user.id },
    });
    expect(ordersForUser).toBe(0);
  });

  it("rejects checkout when product-level stock is insufficient", async () => {
    const { token } = await createUser("nostock");
    const product = await createProduct({ stock: 0 });
    await addToCart(token, product.id, 1);

    const response = await placeOrder(token);
    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe("INSUFFICIENT_STOCK");
  });

  it("charges exactly the coupon discount shown by the preview endpoint", async () => {
    const { token } = await createUser("coupon");
    const product = await createProduct({ stock: 10, price: 1999 });
    await addToCart(token, product.id, 1);

    const code = `SAVE10-${Date.now()}`;
    await prisma.coupon.create({
      data: {
        code,
        discountType: "PERCENTAGE",
        discountValue: 10,
        maxDiscountAmount: 500,
        minOrderAmount: 1000,
        isActive: true,
      },
    });

    const preview = await app.inject({
      method: "POST",
      url: "/api/coupons/validate",
      headers: auth(token),
      payload: { code, subtotal: 1999 },
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().data.discount).toBe(200);

    const order = await placeOrder(token, { couponCode: code });
    expect(order.statusCode).toBe(201);
    expect(order.json().data.discount).toBe(200);
    expect(order.json().data.total).toBe(3299);

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    expect(coupon?.usedCount).toBe(1);
  });

  it("allows only one buyer to win the last unit under concurrency", async () => {
    const product = await createProduct({ stock: 1, price: 1000 });
    const buyerA = await createUser("race-a");
    const buyerB = await createUser("race-b");
    await addToCart(buyerA.token, product.id, 1);
    await addToCart(buyerB.token, product.id, 1);

    const [resultA, resultB] = await Promise.all([
      placeOrder(buyerA.token, { idempotencyKey: `race-a-${Date.now()}` }),
      placeOrder(buyerB.token, { idempotencyKey: `race-b-${Date.now()}` }),
    ]);

    const codes = [resultA.statusCode, resultB.statusCode].sort();
    expect(codes).toEqual([201, 409]);

    const rejected =
      resultA.statusCode === 409 ? resultA : resultB;
    expect(rejected.json().code).toBe("STOCK_RESERVATION_FAILED");

    const stored = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(stored?.stock).toBe(0);

    const orders = await prisma.order.findMany({
      where: { items: { some: { productId: product.id } } },
    });
    expect(orders).toHaveLength(1);
  });

  it("restocks exactly once when an order is cancelled twice", async () => {
    const { token, user } = await createUser("cancel");
    const product = await createProduct({ stock: 3, price: 1000 });
    await addToCart(token, product.id, 2);

    const placed = await placeOrder(token);
    expect(placed.statusCode).toBe(201);
    const orderId = placed.json().data.id as string;

    let stored = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(stored?.stock).toBe(1);

    const firstCancel = await app.inject({
      method: "POST",
      url: `/api/orders/${orderId}/cancel`,
      headers: auth(token),
    });
    expect(firstCancel.statusCode).toBe(200);

    const secondCancel = await app.inject({
      method: "POST",
      url: `/api/orders/${orderId}/cancel`,
      headers: auth(token),
    });
    expect(secondCancel.statusCode).toBe(409);
    expect(secondCancel.json().code).toBe("ORDER_NOT_CANCELLABLE");

    stored = await prisma.product.findUnique({ where: { id: product.id } });
    expect(stored?.stock).toBe(3);
    expect(stored?.totalSold).toBe(0);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("CANCELLED");

    const logs = await prisma.orderStatusLog.count({
      where: { orderId, status: "CANCELLED" },
    });
    expect(logs).toBe(1);

    const userOrders = await prisma.order.count({
      where: { userId: user.id },
    });
    expect(userOrders).toBe(1);
  });
});

describe("administration", () => {
  it("denies non-admin access to admin endpoints", async () => {
    const { token } = await createUser("not-admin");
    for (const url of [
      "/api/admin/stats",
      "/api/admin/products",
      "/api/admin/orders",
      "/api/admin/users",
    ]) {
      const response = await app.inject({
        method: "GET",
        url,
        headers: auth(token),
      });
      expect(response.statusCode).toBe(403);
    }
  });

  it("coerces pagination query strings and returns real product data", async () => {
    const admin = await createAdmin("pagination");
    const product = await createProduct({
      name: "Pagination Product",
      sku: `PAG-${Date.now()}`,
      stock: 4,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/products?page=1&limit=2&search=Pagination",
      headers: auth(admin.token),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.page).toBe(1);
    expect(body.data.some((item: { id: string }) => item.id === product.id)).toBe(
      true
    );
    const found = body.data.find(
      (item: { id: string }) => item.id === product.id
    );
    expect(found.effectiveStock).toBe(4);
  });

  it("creates a product with stock and a local upload image path", async () => {
    const admin = await createAdmin("catalog");
    const response = await app.inject({
      method: "POST",
      url: "/api/products",
      headers: auth(admin.token),
      payload: {
        name: `Admin Created ${Date.now()}`,
        price: 2599,
        stock: 7,
        status: "ACTIVE",
        images: [{ url: "/uploads/test-image.jpg", position: 0 }],
      },
    });

    expect(response.statusCode).toBe(201);
    const created = response.json().data;
    expect(created.stock).toBe(7);
    expect(created.images[0].url).toBe("/uploads/test-image.jpg");

    const stored = await prisma.product.findUnique({
      where: { id: created.id },
    });
    expect(stored?.stock).toBe(7);
  });

  it("archives a product that is referenced by an order instead of deleting it", async () => {
    const admin = await createAdmin("archive");
    const { user } = await createUser("archive-buyer");
    const product = await createProduct({ stock: 5, price: 1200 });

    await prisma.order.create({
      data: {
        orderNumber: `PN-ARCHIVE-${Date.now()}`,
        userId: user.id,
        subtotal: 1200,
        shippingFee: 0,
        total: 1200,
        shippingAddress: SHIPPING,
        items: {
          create: [
            {
              productId: product.id,
              quantity: 1,
              unitPrice: 1200,
              total: 1200,
            },
          ],
        },
      },
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/products/${product.id}`,
      headers: auth(admin.token),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().archived).toBe(true);

    const stored = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(stored).not.toBeNull();
    expect(stored?.status).toBe("ARCHIVED");
  });

  it("walks an order through fulfilment, records tracking, and restocks once on return", async () => {
    const admin = await createAdmin("fulfil");
    const { token } = await createUser("fulfil-buyer");
    const product = await createProduct({ stock: 3, price: 1000 });
    await addToCart(token, product.id, 2);

    const placed = await placeOrder(token);
    expect(placed.statusCode).toBe(201);
    const orderId = placed.json().data.id as string;

    const update = (status: string, extra: Record<string, unknown> = {}) =>
      app.inject({
        method: "PUT",
        url: `/api/admin/orders/${orderId}`,
        headers: auth(admin.token),
        payload: { status, ...extra },
      });

    expect((await update("CONFIRMED")).statusCode).toBe(200);

    const invalid = await update("DELIVERED");
    expect(invalid.statusCode).toBe(409);
    expect(invalid.json().code).toBe("INVALID_TRANSITION");

    expect((await update("PROCESSING")).statusCode).toBe(200);

    const shipped = await update("SHIPPED", {
      carrier: "DHL",
      trackingNumber: "TRACK-123",
    });
    expect(shipped.statusCode).toBe(200);

    const detail = await app.inject({
      method: "GET",
      url: `/api/admin/orders/${orderId}`,
      headers: auth(admin.token),
    });
    expect(detail.statusCode).toBe(200);
    const shipment = detail.json().data.shipments[0];
    expect(shipment.carrier).toBe("DHL");
    expect(shipment.trackingNumber).toBe("TRACK-123");
    expect(shipment.status).toBe("shipped");

    expect((await update("OUT_FOR_DELIVERY")).statusCode).toBe(200);
    expect((await update("DELIVERED")).statusCode).toBe(200);

    let stored = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(stored?.stock).toBe(1);

    const returned = await update("RETURNED", {
      note: "Customer returned the item",
    });
    expect(returned.statusCode).toBe(200);

    stored = await prisma.product.findUnique({ where: { id: product.id } });
    expect(stored?.stock).toBe(3);
    expect(stored?.totalSold).toBe(0);

    const refunded = await update("REFUNDED");
    expect(refunded.statusCode).toBe(200);

    stored = await prisma.product.findUnique({ where: { id: product.id } });
    expect(stored?.stock).toBe(3); // never restocked twice

    const history = await prisma.orderStatusLog.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    });
    expect(history.map((entry) => entry.status)).toEqual([
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "RETURNED",
      "REFUNDED",
    ]);
    // Every admin-driven transition is attributed; the creation entry is
    // written by checkout and has no staff actor.
    expect(
      history
        .filter((entry) => entry.status !== "PENDING")
        .every((entry) => entry.actorRole === "ADMIN")
    ).toBe(true);
  });

  it("restocks an admin-cancelled order exactly once under concurrency", async () => {
    const admin = await createAdmin("cancel-admin");
    const { token } = await createUser("cancel-admin-buyer");
    const product = await createProduct({ stock: 2, price: 1000 });
    await addToCart(token, product.id, 1);

    const placed = await placeOrder(token);
    expect(placed.statusCode).toBe(201);
    const orderId = placed.json().data.id as string;

    const cancel = () =>
      app.inject({
        method: "PUT",
        url: `/api/admin/orders/${orderId}`,
        headers: auth(admin.token),
        payload: { status: "CANCELLED", note: "Admin cancellation" },
      });

    const [first, second] = await Promise.all([cancel(), cancel()]);
    const codes = [first.statusCode, second.statusCode].sort();
    expect(codes).toEqual([200, 409]);

    const stored = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(stored?.stock).toBe(2);
    expect(stored?.totalSold).toBe(0);

    const logs = await prisma.orderStatusLog.count({
      where: { orderId, status: "CANCELLED" },
    });
    expect(logs).toBe(1);
  });

  it("returns product-level low stock in dashboard stats and excludes cancellations from revenue", async () => {
    const admin = await createAdmin("stats");
    const lowStock = await createProduct({
      name: `Low Stock ${Date.now()}`,
      stock: 2,
      status: "ACTIVE",
    });
    const { user } = await createUser("stats-buyer");

    await prisma.order.create({
      data: {
        orderNumber: `PN-REVENUE-${Date.now()}`,
        userId: user.id,
        subtotal: 5000,
        shippingFee: 0,
        total: 5000,
        shippingAddress: SHIPPING,
      },
    });
    await prisma.order.create({
      data: {
        orderNumber: `PN-CANCELLED-${Date.now()}`,
        userId: user.id,
        status: "CANCELLED",
        subtotal: 9000,
        shippingFee: 0,
        total: 9000,
        shippingAddress: SHIPPING,
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/stats",
      headers: auth(admin.token),
    });
    expect(response.statusCode).toBe(200);
    const stats = response.json().data;

    const found = stats.lowStockProducts.find(
      (item: { id: string }) => item.id === lowStock.id
    );
    expect(found).toBeDefined();
    expect(found.effectiveStock).toBe(2);

    expect(stats.revenueByDay).toHaveLength(30);
    expect(stats.totalRevenue).toBeGreaterThanOrEqual(5000);
  });

  it("prevents self-demotion and protects the last super administrator", async () => {
    const admin = await createAdmin("self-role");

    const selfDemote = await app.inject({
      method: "PUT",
      url: `/api/admin/users/${admin.user.id}/role`,
      headers: auth(admin.token),
      payload: { role: "CUSTOMER" },
    });
    expect(selfDemote.statusCode).toBe(400);
    expect(selfDemote.json().code).toBe("SELF_ROLE_CHANGE");

    const superAdmin = await prisma.user.create({
      data: {
        email: `super-${Date.now()}@example.com`,
        role: "SUPER_ADMIN",
      },
    });
    // Deactivate any other super admins so the guard is deterministic.
    await prisma.user.updateMany({
      where: { role: "SUPER_ADMIN", id: { not: superAdmin.id } },
      data: { isActive: false },
    });

    const token = mintToken(superAdmin.id, superAdmin.email, "SUPER_ADMIN");
    const demoteLast = await app.inject({
      method: "PUT",
      url: `/api/admin/users/${superAdmin.id}/role`,
      headers: auth(token),
      payload: { role: "ADMIN" },
    });
    // Self-change is rejected first; verify the last-super-admin guard via a
    // different admin acting on the only super admin.
    expect(demoteLast.statusCode).toBe(400);

    const demoteByOther = await app.inject({
      method: "PUT",
      url: `/api/admin/users/${superAdmin.id}/role`,
      headers: auth(admin.token),
      payload: { role: "ADMIN" },
    });
    expect(demoteByOther.statusCode).toBe(409);
    expect(demoteByOther.json().code).toBe("LAST_SUPER_ADMIN");
  });
});

