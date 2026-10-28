import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";

let mongo: MongoMemoryReplSet;
let app: FastifyInstance;
let prisma: PrismaClient;

const SHIPPING = {
  fullName: "Marketplace Buyer",
  phone: "+15550002222",
  addressLine1: "2 Market Street",
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

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
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
  const { user, token } = await createUser(prefix);
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  return {
    user,
    token: mintToken(user.id, user.email, "ADMIN"),
  };
}

async function createSeller(
  prefix: string,
  options: {
    status?: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
    role?: "OWNER" | "MANAGER" | "STAFF";
  } = {}
) {
  const { user, token } = await createUser(prefix);
  const status = options.status ?? "APPROVED";
  const seller = await prisma.sellerOrganization.create({
    data: {
      name: `Store ${prefix} ${Date.now()}`,
      slug: `store-${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
      status,
      commissionRate: 1000,
      ownerId: user.id,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
  });
  await prisma.sellerMembership.create({
    data: {
      sellerId: seller.id,
      userId: user.id,
      role: options.role ?? "OWNER",
    },
  });
  return {
    user,
    token,
    seller,
    headers: { ...auth(token), "x-seller-id": seller.id },
  };
}

async function createSellerProduct(
  sellerId: string,
  overrides: Record<string, unknown> = {}
) {
  return prisma.product.create({
    data: {
      name: `Seller Product ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      slug: `seller-product-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      price: 1000,
      stock: 10,
      status: "ACTIVE",
      moderationStatus: "APPROVED",
      sellerId,
      ...overrides,
    },
  });
}

async function addToCart(token: string, productId: string, quantity = 1) {
  const response = await app.inject({
    method: "POST",
    url: "/api/cart/items",
    headers: auth(token),
    payload: { productId, quantity },
  });
  expect(response.statusCode).toBe(200);
  return response;
}

async function placeOrder(token: string, overrides: Record<string, unknown> = {}) {
  return app.inject({
    method: "POST",
    url: "/api/orders",
    headers: auth(token),
    payload: {
      shippingAddress: SHIPPING,
      paymentMethod: "COD",
      ...overrides,
    },
  });
}

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = mongo.getUri("ponnaloy_marketplace_test");

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

describe("seller onboarding and authorization", () => {
  it("keeps a new seller pending until an administrator approves the application", async () => {
    const admin = await createAdmin("onboarding-admin");
    const { user, token } = await createUser("onboarding");

    const application = await app.inject({
      method: "POST",
      url: "/api/seller/apply",
      headers: auth(token),
      payload: {
        businessName: "Onboarding Store",
        contactEmail: user.email,
        address: {
          line1: "1 Seller Lane",
          city: "Marketville",
          postalCode: "54321",
          country: "US",
        },
        description: "Handmade goods",
      },
    });
    expect(application.statusCode).toBe(201);

    const seller = await prisma.sellerOrganization.findFirst({
      where: { ownerId: user.id },
    });
    expect(seller?.status).toBe("PENDING");

    const dashboard = await app.inject({
      method: "GET",
      url: "/api/seller/dashboard",
      headers: { ...auth(token), "x-seller-id": seller!.id },
    });
    expect(dashboard.statusCode).toBe(403);
    expect(dashboard.json().code).toBe("SELLER_NOT_APPROVED");

    // Pending applicants can still see their own context/status.
    const context = await app.inject({
      method: "GET",
      url: "/api/seller/context",
      headers: { ...auth(token), "x-seller-id": seller!.id },
    });
    expect(context.statusCode).toBe(200);
    expect(context.json().data.seller.status).toBe("PENDING");

    const queue = await app.inject({
      method: "GET",
      url: "/api/admin/sellers/applications?status=SUBMITTED",
      headers: auth(admin.token),
    });
    expect(queue.statusCode).toBe(200);
    const pending = queue
      .json()
      .data.find((item: { sellerId: string }) => item.sellerId === seller!.id);
    expect(pending).toBeDefined();

    const review = await app.inject({
      method: "PUT",
      url: `/api/admin/sellers/applications/${pending.id}/review`,
      headers: auth(admin.token),
      payload: { status: "APPROVED", note: "Documents verified" },
    });
    expect(review.statusCode).toBe(200);

    const approved = await prisma.sellerOrganization.findUnique({
      where: { id: seller!.id },
    });
    expect(approved?.status).toBe("APPROVED");
    expect(approved?.approvedAt).not.toBeNull();

    const afterApproval = await app.inject({
      method: "GET",
      url: "/api/seller/dashboard",
      headers: { ...auth(token), "x-seller-id": seller!.id },
    });
    expect(afterApproval.statusCode).toBe(200);
  });

  it("denies seller endpoints to users without a membership", async () => {
    const { token } = await createUser("no-membership");

    for (const url of [
      "/api/seller/dashboard",
      "/api/seller/products",
      "/api/seller/orders",
      "/api/seller/context",
    ]) {
      const response = await app.inject({
        method: "GET",
        url,
        headers: auth(token),
      });
      expect(response.statusCode).toBe(403);
      expect(response.json().code).toBe("SELLER_ACCESS_REQUIRED");
    }

    const adminOnly = await app.inject({
      method: "GET",
      url: "/api/admin/sellers",
      headers: auth(token),
    });
    expect(adminOnly.statusCode).toBe(403);
  });

  it("rejects a seller that tries to select an organization it does not belong to", async () => {
    const sellerA = await createSeller("tenant-a");
    const sellerB = await createSeller("tenant-b");

    const response = await app.inject({
      method: "GET",
      url: "/api/seller/dashboard",
      headers: { ...auth(sellerA.token), "x-seller-id": sellerB.seller.id },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("SELLER_ACCESS_DENIED");
  });
});

describe("product moderation and tenant isolation", () => {
  it("publishes a seller product only after admin moderation", async () => {
    const admin = await createAdmin("moderation-admin");
    const seller = await createSeller("moderation");

    const created = await app.inject({
      method: "POST",
      url: "/api/seller/products",
      headers: seller.headers,
      payload: {
        name: "Unapproved Listing",
        price: 2500,
        stock: 4,
        status: "ACTIVE",
      },
    });
    expect(created.statusCode).toBe(201);
    const product = created.json().data;
    expect(product.status).toBe("DRAFT");
    expect(product.moderationStatus).toBe("PENDING");

    const hiddenDetail = await app.inject({
      method: "GET",
      url: `/api/products/${product.slug}`,
    });
    expect(hiddenDetail.statusCode).toBe(404);

    const hiddenList = await app.inject({
      method: "GET",
      url: "/api/products?q=Unapproved%20Listing",
    });
    expect(
      hiddenList
        .json()
        .data.some((item: { id: string }) => item.id === product.id)
    ).toBe(false);

    const approve = await app.inject({
      method: "PUT",
      url: `/api/admin/products/${product.id}/moderation`,
      headers: auth(admin.token),
      payload: { status: "APPROVED" },
    });
    expect(approve.statusCode).toBe(200);

    const visible = await app.inject({
      method: "GET",
      url: `/api/products/${product.slug}`,
    });
    expect(visible.statusCode).toBe(200);
    expect(visible.json().data.seller.id).toBe(seller.seller.id);

    const storefront = await app.inject({
      method: "GET",
      url: `/api/sellers/${seller.seller.slug}`,
    });
    expect(storefront.statusCode).toBe(200);
    expect(
      storefront
        .json()
        .data.products.some((item: { id: string }) => item.id === product.id)
    ).toBe(true);
  });

  it("keeps legacy platform products visible when marketplace fields are unset", async () => {
    // Documents created before the marketplace migration have neither
    // `sellerId` nor `moderationStatus`. A `null` filter does not match missing
    // MongoDB fields, so this guards against the public catalogue going empty.
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const product = await prisma.product.create({
      data: {
        name: `Platform Legacy ${suffix}`,
        slug: `platform-legacy-${suffix}`,
        price: 1800,
        stock: 5,
        status: "ACTIVE",
      },
    });

    const list = await app.inject({
      method: "GET",
      url: `/api/products?q=Platform%20Legacy%20${suffix}`,
    });
    expect(list.statusCode).toBe(200);
    expect(
      list.json().data.some((item: { id: string }) => item.id === product.id)
    ).toBe(true);

    const detail = await app.inject({
      method: "GET",
      url: `/api/products/${product.slug}`,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.id).toBe(product.id);
  });

  it("requires a rejection note and unpublishes a rejected product", async () => {
    const admin = await createAdmin("reject-admin");
    const seller = await createSeller("reject");
    const product = await createSellerProduct(seller.seller.id);

    const missingNote = await app.inject({
      method: "PUT",
      url: `/api/admin/products/${product.id}/moderation`,
      headers: auth(admin.token),
      payload: { status: "REJECTED" },
    });
    expect(missingNote.statusCode).toBe(400);
    expect(missingNote.json().code).toBe("NOTE_REQUIRED");

    const rejected = await app.inject({
      method: "PUT",
      url: `/api/admin/products/${product.id}/moderation`,
      headers: auth(admin.token),
      payload: { status: "REJECTED", note: "Prohibited item" },
    });
    expect(rejected.statusCode).toBe(200);

    const stored = await prisma.product.findUnique({ where: { id: product.id } });
    expect(stored?.status).toBe("DRAFT");
    expect(stored?.moderationStatus).toBe("REJECTED");

    const publicDetail = await app.inject({
      method: "GET",
      url: `/api/products/${product.slug}`,
    });
    expect(publicDetail.statusCode).toBe(404);
  });

  it("prevents seller A from modifying seller B's product", async () => {
    const sellerA = await createSeller("product-owner-a");
    const sellerB = await createSeller("product-owner-b");
    const product = await createSellerProduct(sellerB.seller.id);

    const update = await app.inject({
      method: "PUT",
      url: `/api/seller/products/${product.id}`,
      headers: sellerA.headers,
      payload: { price: 1 },
    });
    expect(update.statusCode).toBe(404);

    const remove = await app.inject({
      method: "DELETE",
      url: `/api/seller/products/${product.id}`,
      headers: sellerA.headers,
    });
    expect(remove.statusCode).toBe(404);

    const stored = await prisma.product.findUnique({ where: { id: product.id } });
    expect(stored?.price).toBe(1000);
    expect(stored?.status).toBe("ACTIVE");
  });

  it("does not let seller staff delete listings", async () => {
    const owner = await createSeller("staff-owner");
    const staff = await createUser("staff-member");
    await prisma.sellerMembership.create({
      data: {
        sellerId: owner.seller.id,
        userId: staff.user.id,
        role: "STAFF",
      },
    });
    const product = await createSellerProduct(owner.seller.id);

    const remove = await app.inject({
      method: "DELETE",
      url: `/api/seller/products/${product.id}`,
      headers: {
        ...auth(staff.token),
        "x-seller-id": owner.seller.id,
      },
    });
    expect(remove.statusCode).toBe(403);
    expect(remove.json().code).toBe("SELLER_PERMISSION_DENIED");
  });
});

describe("multi-vendor checkout and seller fulfilment", () => {
  it("partitions one customer order into seller orders with allocated totals and commission", async () => {
    const sellerA = await createSeller("checkout-a");
    const sellerB = await createSeller("checkout-b");
    await prisma.sellerOrganization.update({
      where: { id: sellerB.seller.id },
      data: { commissionRate: 1500 },
    });

    const productA = await createSellerProduct(sellerA.seller.id, {
      price: 1000,
      stock: 5,
    });
    const productB = await createSellerProduct(sellerB.seller.id, {
      price: 2000,
      stock: 5,
    });

    const buyer = await createUser("marketplace-buyer");
    await addToCart(buyer.token, productA.id, 2);
    await addToCart(buyer.token, productB.id, 1);

    const placed = await placeOrder(buyer.token, {
      idempotencyKey: `marketplace-${Date.now()}`,
    });
    expect(placed.statusCode).toBe(201);
    const order = placed.json().data;

    expect(order.subtotal).toBe(4000);
    expect(order.shippingFee).toBe(1500);
    expect(order.total).toBe(5500);
    expect(order.sellerOrders).toHaveLength(2);
    expect(order.items.every((item: { sellerOrderId: string }) => !!item.sellerOrderId)).toBe(
      true
    );

    const partitionA = order.sellerOrders.find(
      (part: { sellerId: string }) => part.sellerId === sellerA.seller.id
    );
    const partitionB = order.sellerOrders.find(
      (part: { sellerId: string }) => part.sellerId === sellerB.seller.id
    );
    expect(partitionA.subtotal).toBe(2000);
    expect(partitionB.subtotal).toBe(2000);
    expect(partitionA.total + partitionB.total).toBe(5500);
    expect(partitionA.commissionAmount).toBe(200);
    expect(partitionB.commissionAmount).toBe(300);

    const itemsA = await prisma.orderItem.count({
      where: { orderId: order.id, sellerOrderId: partitionA.id },
    });
    const itemsB = await prisma.orderItem.count({
      where: { orderId: order.id, sellerOrderId: partitionB.id },
    });
    expect(itemsA).toBe(1);
    expect(itemsB).toBe(1);

    // Each seller sees only its own partition.
    const listA = await app.inject({
      method: "GET",
      url: "/api/seller/orders",
      headers: sellerA.headers,
    });
    expect(listA.statusCode).toBe(200);
    expect(listA.json().data).toHaveLength(1);
    expect(listA.json().data[0].id).toBe(partitionA.id);

    const crossTenantDetail = await app.inject({
      method: "GET",
      url: `/api/seller/orders/${partitionB.id}`,
      headers: sellerA.headers,
    });
    expect(crossTenantDetail.statusCode).toBe(404);

    const crossTenantUpdate = await app.inject({
      method: "PUT",
      url: `/api/seller/orders/${partitionB.id}/status`,
      headers: sellerA.headers,
      payload: { status: "CONFIRMED" },
    });
    expect(crossTenantUpdate.statusCode).toBe(404);

    const invalidTransition = await app.inject({
      method: "PUT",
      url: `/api/seller/orders/${partitionA.id}/status`,
      headers: sellerA.headers,
      payload: { status: "SHIPPED" },
    });
    expect(invalidTransition.statusCode).toBe(409);
    expect(invalidTransition.json().code).toBe("INVALID_TRANSITION");
  });

  it("fulfils partitions independently and aggregates the parent order status", async () => {
    const sellerA = await createSeller("fulfil-a");
    const sellerB = await createSeller("fulfil-b");
    const productA = await createSellerProduct(sellerA.seller.id, {
      price: 1000,
      stock: 3,
    });
    const productB = await createSellerProduct(sellerB.seller.id, {
      price: 3000,
      stock: 3,
    });

    const buyer = await createUser("fulfil-buyer");
    await addToCart(buyer.token, productA.id, 1);
    await addToCart(buyer.token, productB.id, 1);

    const placed = await placeOrder(buyer.token);
    expect(placed.statusCode).toBe(201);
    const order = placed.json().data;
    const partitionA = order.sellerOrders.find(
      (part: { sellerId: string }) => part.sellerId === sellerA.seller.id
    );
    const partitionB = order.sellerOrders.find(
      (part: { sellerId: string }) => part.sellerId === sellerB.seller.id
    );

    const update = (seller: typeof sellerA, id: string, status: string, extra = {}) =>
      app.inject({
        method: "PUT",
        url: `/api/seller/orders/${id}/status`,
        headers: seller.headers,
        payload: { status, ...extra },
      });

    expect((await update(sellerA, partitionA.id, "CONFIRMED")).statusCode).toBe(200);
    expect((await update(sellerA, partitionA.id, "PROCESSING")).statusCode).toBe(200);
    expect(
      (await update(sellerA, partitionA.id, "SHIPPED", {
        carrier: "DHL",
        trackingNumber: "SELLER-A-1",
      })).statusCode
    ).toBe(200);

    const shipment = await prisma.shipment.findFirst({
      where: { sellerOrderId: partitionA.id },
    });
    expect(shipment?.trackingNumber).toBe("SELLER-A-1");
    expect(shipment?.status).toBe("shipped");

    // The parent is only SHIPPED once every partition has shipped.
    let parent = await prisma.order.findUnique({ where: { id: order.id } });
    expect(parent?.status).toBe("PENDING");

    for (const status of ["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"]) {
      expect((await update(sellerB, partitionB.id, status)).statusCode).toBe(200);
    }
    expect((await update(sellerA, partitionA.id, "OUT_FOR_DELIVERY")).statusCode).toBe(200);
    expect((await update(sellerA, partitionA.id, "DELIVERED")).statusCode).toBe(200);

    parent = await prisma.order.findUnique({ where: { id: order.id } });
    expect(parent?.status).toBe("DELIVERED");

    const historyA = await prisma.sellerOrderStatusLog.findMany({
      where: { sellerOrderId: partitionA.id },
      orderBy: { createdAt: "asc" },
    });
    expect(historyA.map((entry) => entry.status)).toEqual([
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ]);
    expect(
      historyA
        .filter((entry) => entry.status !== "PENDING")
        .every((entry) => entry.actorRole === "OWNER")
    ).toBe(true);

    const cancelDelivered = await update(sellerA, partitionA.id, "CANCELLED");
    expect(cancelDelivered.statusCode).toBe(409);
  });

  it("blocks checkout and hides listings when a seller is suspended", async () => {
    const admin = await createAdmin("suspend-admin");
    const seller = await createSeller("suspend");
    const product = await createSellerProduct(seller.seller.id, {
      price: 1500,
      stock: 5,
    });

    const buyer = await createUser("suspend-buyer");
    await addToCart(buyer.token, product.id, 1);

    const suspend = await app.inject({
      method: "PUT",
      url: `/api/admin/sellers/${seller.seller.id}/status`,
      headers: auth(admin.token),
      payload: { status: "SUSPENDED", note: "Policy violation" },
    });
    expect(suspend.statusCode).toBe(200);

    const hidden = await app.inject({
      method: "GET",
      url: `/api/products/${product.slug}`,
    });
    expect(hidden.statusCode).toBe(404);

    const checkout = await placeOrder(buyer.token);
    expect(checkout.statusCode).toBe(409);
    expect(checkout.json().code).toBe("SELLER_UNAVAILABLE");

    const dashboard = await app.inject({
      method: "GET",
      url: "/api/seller/dashboard",
      headers: seller.headers,
    });
    expect(dashboard.statusCode).toBe(403);
    expect(dashboard.json().code).toBe("SELLER_NOT_APPROVED");
  });

  it("audits commission changes and keeps seller metrics scoped", async () => {
    const admin = await createAdmin("commission-admin");
    const seller = await createSeller("commission");
    const other = await createSeller("commission-other");

    const update = await app.inject({
      method: "PUT",
      url: `/api/admin/sellers/${seller.seller.id}/commission`,
      headers: auth(admin.token),
      payload: { commissionRate: 1250, note: "Negotiated rate" },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().data.commissionRate).toBe(1250);

    const audit = await prisma.activityLog.findFirst({
      where: {
        action: "seller.commission.updated",
        entityId: seller.seller.id,
      },
    });
    expect(audit).not.toBeNull();
    expect(audit?.userId).toBe(admin.user.id);

    const product = await createSellerProduct(seller.seller.id, {
      price: 4000,
      stock: 2,
    });
    const buyer = await createUser("commission-buyer");
    await addToCart(buyer.token, product.id, 1);
    const placed = await placeOrder(buyer.token);
    expect(placed.statusCode).toBe(201);

    const dashboard = await app.inject({
      method: "GET",
      url: "/api/seller/dashboard",
      headers: seller.headers,
    });
    expect(dashboard.statusCode).toBe(200);
    const metrics = dashboard.json().data;
    expect(metrics.grossSales).toBe(4000);
    expect(metrics.commission).toBe(500);

    const otherDashboard = await app.inject({
      method: "GET",
      url: "/api/seller/dashboard",
      headers: other.headers,
    });
    expect(otherDashboard.statusCode).toBe(200);
    expect(otherDashboard.json().data.grossSales).toBe(0);
  });
});
