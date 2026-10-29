import { FastifyPluginAsync } from "fastify";
import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { config } from "../config/env";
import { constructWebhookEvent, isStripeConfigured } from "../lib/stripe";
import { invalidateAuthCache } from "../lib/auth-cache";

interface RawBodyRequest {
  rawBody?: Buffer;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Marks a payment as collected and advances its parent order from PENDING to
 * CONFIRMED exactly once. Safe to call for duplicate provider events.
 */
async function markPaymentSucceeded(
  tx: Prisma.TransactionClient,
  paymentId: string,
  transactionId: string | null,
  note: string
): Promise<void> {
  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, orderId: true, status: true },
  });
  if (!payment) return;

  if (payment.status === "PENDING" || payment.status === "FAILED") {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED", transactionId: transactionId ?? undefined },
    });
  }

  const transition = await tx.order.updateMany({
    where: { id: payment.orderId, status: "PENDING" },
    data: { status: "CONFIRMED" },
  });

  if (transition.count > 0) {
    await tx.orderStatusLog.create({
      data: {
        orderId: payment.orderId,
        status: "CONFIRMED",
        note,
        actorRole: "SYSTEM",
      },
    });
  }
}

/**
 * Releases the inventory reserved by an unpaid order and cancels it. The
 * `restockedAt` guard means a duplicate expiry event can never restock twice.
 */
async function cancelUnpaidOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  note: string
): Promise<void> {
  const now = new Date();
  const transition = await tx.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "CANCELLED", restockedAt: now },
  });
  if (transition.count === 0) return;

  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, variantId: true, quantity: true },
  });

  for (const item of items) {
    if (item.variantId) {
      await tx.productVariant.updateMany({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    } else {
      await tx.product.updateMany({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    await tx.product.updateMany({
      where: { id: item.productId },
      data: { totalSold: { decrement: item.quantity } },
    });
  }

  await tx.sellerOrder.updateMany({
    where: { orderId, status: { in: ["PENDING", "CONFIRMED"] } },
    data: { status: "CANCELLED", restockedAt: now },
  });

  await tx.orderStatusLog.create({
    data: { orderId, status: "CANCELLED", note, actorRole: "SYSTEM" },
  });
}

/**
 * Applies one verified Stripe event inside a single transaction. The
 * `PaymentEvent` row is created first: its unique `eventId` is what makes
 * duplicate deliveries a no-op. If any effect throws, the transaction (and the
 * event row) rolls back so a provider retry can safely reprocess it.
 */
async function applyStripeEvent(event: Stripe.Event): Promise<{ duplicate: boolean; outcome: string }> {
  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const record = await tx.paymentEvent.create({
        data: {
          eventId: event.id,
          type: event.type,
          provider: "stripe",
          payload: event as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const payment = await tx.payment.findFirst({
            where: { stripeSessionId: session.id },
            select: { id: true, amount: true, currency: true },
          });
          if (!payment) return "payment_not_found";

          const paidAmount = session.amount_total;
          const paidCurrency = (session.currency ?? "").toLowerCase();
          if (
            paidAmount !== payment.amount ||
            paidCurrency !== payment.currency.toLowerCase()
          ) {
            // Never credit an order whose collected amount differs from the
            // persisted order total. The event stays recorded for investigation.
            return "amount_mismatch";
          }

          const intentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null;

          await markPaymentSucceeded(
            tx,
            payment.id,
            intentId,
            "Payment received via Stripe"
          );
          await tx.paymentEvent.update({
            where: { id: record.id },
            data: { paymentId: payment.id },
          });
          return "paid";
        }

        case "payment_intent.succeeded": {
          const intent = event.data.object as Stripe.PaymentIntent;
          const paymentId = intent.metadata?.paymentId;
          if (!paymentId) return "no_payment_reference";

          const payment = await tx.payment.findUnique({
            where: { id: paymentId },
            select: { id: true, amount: true, currency: true },
          });
          if (!payment) return "payment_not_found";
          if (
            intent.amount_received !== payment.amount ||
            (intent.currency ?? "").toLowerCase() !== payment.currency.toLowerCase()
          ) {
            return "amount_mismatch";
          }

          await markPaymentSucceeded(
            tx,
            payment.id,
            intent.id,
            "Payment received via Stripe"
          );
          await tx.paymentEvent.update({
            where: { id: record.id },
            data: { paymentId: payment.id },
          });
          return "paid";
        }

        case "checkout.session.expired": {
          const session = event.data.object as Stripe.Checkout.Session;
          const payment = await tx.payment.findFirst({
            where: { stripeSessionId: session.id },
            select: { id: true, orderId: true, status: true },
          });
          if (!payment) return "payment_not_found";

          if (payment.status === "PENDING" || payment.status === "FAILED") {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: "FAILED" },
            });
            await cancelUnpaidOrder(
              tx,
              payment.orderId,
              "Card payment session expired; order cancelled and inventory released"
            );
          }
          await tx.paymentEvent.update({
            where: { id: record.id },
            data: { paymentId: payment.id, orderId: payment.orderId },
          });
          return "expired";
        }

        case "payment_intent.payment_failed": {
          const intent = event.data.object as Stripe.PaymentIntent;
          const paymentId = intent.metadata?.paymentId;
          const payment = paymentId
            ? await tx.payment.findUnique({
                where: { id: paymentId },
                select: { id: true, status: true },
              })
            : await tx.payment.findFirst({
                where: { transactionId: intent.id },
                select: { id: true, status: true },
              });

          if (!payment) return "payment_not_found";
          if (payment.status === "PENDING") {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: "FAILED", transactionId: intent.id },
            });
          }
          await tx.paymentEvent.update({
            where: { id: record.id },
            data: { paymentId: payment.id },
          });
          return "failed";
        }

        case "charge.refunded": {
          const charge = event.data.object as Stripe.Charge;
          const intentId =
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : charge.payment_intent?.id ?? null;
          if (!intentId) return "no_payment_reference";

          const payment = await tx.payment.findFirst({
            where: { transactionId: intentId },
            select: { id: true, orderId: true, status: true },
          });
          if (!payment) return "payment_not_found";

          // Only a fully refunded charge changes the payment/order state;
          // partial refunds are recorded but leave the order intact.
          if (charge.refunded !== true) {
            await tx.paymentEvent.update({
              where: { id: record.id },
              data: { paymentId: payment.id, orderId: payment.orderId },
            });
            return "partial_refund";
          }

          if (payment.status !== "REFUNDED") {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: "REFUNDED" },
            });
            const transition = await tx.order.updateMany({
              where: {
                id: payment.orderId,
                status: { notIn: ["CANCELLED", "REFUNDED"] },
              },
              data: { status: "REFUNDED" },
            });
            if (transition.count > 0) {
              await tx.orderStatusLog.create({
                data: {
                  orderId: payment.orderId,
                  status: "REFUNDED",
                  note: "Full refund confirmed by Stripe",
                  actorRole: "SYSTEM",
                },
              });
            }
          }

          await tx.paymentEvent.update({
            where: { id: record.id },
            data: { paymentId: payment.id, orderId: payment.orderId },
          });
          return "refunded";
        }

        default:
          return "ignored";
      }
    });

    return { duplicate: false, outcome };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { duplicate: true, outcome: "duplicate" };
    }
    throw error;
  }
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Gateway signatures are computed over the exact bytes sent, so this plugin
  // keeps the raw payload while still exposing parsed JSON to handlers.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (request, body, done) => {
      const raw = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
      (request as unknown as RawBodyRequest).rawBody = raw;
      try {
        done(null, raw.length > 0 ? JSON.parse(raw.toString("utf8")) : {});
      } catch (error) {
        done(error as Error, undefined);
      }
    }
  );

  function getRawBody(request: unknown): Buffer | null {
    const raw = (request as RawBodyRequest).rawBody;
    return raw && raw.length > 0 ? raw : null;
  }

  // Stripe webhook
  app.post("/stripe", async (request, reply) => {
    if (!isStripeConfigured()) {
      return reply.code(503).send({ error: "Stripe webhooks are not configured" });
    }

    const sig = request.headers["stripe-signature"];
    const body = getRawBody(request);

    if (typeof sig !== "string" || !body) {
      return reply.code(400).send({ error: "Missing signature or raw payload" });
    }

    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(body, sig);
    } catch (error) {
      request.log.warn({ err: error }, "Rejected Stripe webhook with invalid signature");
      return reply.code(400).send({ error: "Invalid signature" });
    }

    try {
      const result = await applyStripeEvent(event);
      request.log.info(
        { eventId: event.id, type: event.type, duplicate: result.duplicate, outcome: result.outcome },
        "Stripe webhook processed"
      );
      return reply.code(200).send({ received: true, ...result });
    } catch (error) {
      // A non-2xx response makes Stripe retry with backoff.
      request.log.error({ err: error, eventId: event.id }, "Stripe webhook processing failed");
      return reply.code(500).send({ error: "Webhook processing failed" });
    }
  });

  // Clerk webhook
  app.post("/clerk", async (request, reply) => {
    if (!config.clerk.webhookSecret) {
      return reply.code(503).send({ error: "Clerk webhooks are not configured" });
    }

    const body = getRawBody(request);
    const svixId = request.headers["svix-id"];
    const svixTimestamp = request.headers["svix-timestamp"];
    const svixSignature = request.headers["svix-signature"];

    if (
      !body ||
      typeof svixId !== "string" ||
      typeof svixTimestamp !== "string" ||
      typeof svixSignature !== "string"
    ) {
      return reply.code(400).send({ error: "Missing webhook headers or payload" });
    }

    try {
      const { Webhook } = await import("svix");
      const wh = new Webhook(config.clerk.webhookSecret);
      const evt = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as { type: string; data: Record<string, unknown> };

      const { id, ...attributes } = evt.data as {
        id: string;
        email_addresses?: { email_address: string }[];
        first_name?: string;
        last_name?: string;
        image_url?: string;
      };

      switch (evt.type) {
        case "user.created": {
          const email =
            (attributes.email_addresses as { email_address: string }[])?.[0]?.email_address || "";
          const existing = await prisma.user.findFirst({
            where: {
              OR: [
                { clerkId: id },
                ...(email ? [{ email }] : []),
              ],
            },
            select: { id: true },
          });

          if (existing) {
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                clerkId: id,
                emailVerified: true,
                firstName: (attributes.first_name as string) || undefined,
                lastName: (attributes.last_name as string) || undefined,
                avatar: (attributes.image_url as string) || undefined,
              },
            });
          } else {
            await prisma.user.create({
              data: {
                clerkId: id,
                email,
                firstName: (attributes.first_name as string) || null,
                lastName: (attributes.last_name as string) || null,
                avatar: (attributes.image_url as string) || null,
                emailVerified: true,
              },
            });
          }
          break;
        }
        case "user.updated": {
          await prisma.user.updateMany({
            where: { clerkId: id },
            data: {
              firstName: (attributes.first_name as string) || undefined,
              lastName: (attributes.last_name as string) || undefined,
              avatar: (attributes.image_url as string) || undefined,
            },
          });
          // Clerk changes can alter the identity we cache; drop it wholesale.
          invalidateAuthCache();
          break;
        }
        case "user.deleted": {
          await prisma.user.deleteMany({ where: { clerkId: id } });
          invalidateAuthCache();
          break;
        }
      }

      return reply.code(200).send({ received: true });
    } catch (error) {
      app.log.error({ err: error }, "Clerk webhook error");
      return reply.code(400).send({ error: "Webhook error" });
    }
  });
};
