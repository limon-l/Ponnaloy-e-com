import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { config } from "../config/env";

interface RawBodyRequest {
  rawBody?: Buffer;
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
    if (!config.stripe.secretKey || !config.stripe.webhookSecret) {
      return reply.code(503).send({ error: "Stripe webhooks are not configured" });
    }

    const sig = request.headers["stripe-signature"];
    const body = getRawBody(request);

    if (typeof sig !== "string" || !body) {
      return reply.code(400).send({ error: "Missing signature or raw payload" });
    }

    try {
      const Stripe = (await import("stripe")).default;
      const stripeInstance = new Stripe(config.stripe.secretKey);

      const event = stripeInstance.webhooks.constructEvent(
        body,
        sig,
        config.stripe.webhookSecret
      );

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as {
            id: string;
            payment_intent: string | null;
            metadata?: Record<string, string> | null;
          };

          const payment = await prisma.payment.findFirst({
            where: { stripeSessionId: session.id },
          });

          if (!payment) {
            app.log.warn({ sessionId: session.id }, "Stripe payment record not found");
            break;
          }

          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "SUCCEEDED",
              transactionId:
                typeof session.payment_intent === "string" ? session.payment_intent : undefined,
            },
          });

          const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
          if (order && order.status === "PENDING") {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: "CONFIRMED" },
            });
            await prisma.orderStatusLog.create({
              data: {
                orderId: order.id,
                status: "CONFIRMED",
                note: "Payment received via Stripe",
              },
            });
          }
          break;
        }
        case "checkout.session.expired": {
          const session = event.data.object as { id: string };
          await prisma.payment.updateMany({
            where: { stripeSessionId: session.id },
            data: { status: "FAILED" },
          });
          break;
        }
        case "payment_intent.payment_failed": {
          const intent = event.data.object as { id: string };
          await prisma.payment.updateMany({
            where: { transactionId: intent.id },
            data: { status: "FAILED" },
          });
          break;
        }
        case "charge.refunded": {
          const charge = event.data.object as { id: string };
          await prisma.payment.updateMany({
            where: { transactionId: charge.id },
            data: { status: "REFUNDED" },
          });
          break;
        }
      }

      return reply.code(200).send({ received: true });
    } catch (error) {
      app.log.error({ err: error }, "Stripe webhook error");
      return reply.code(400).send({ error: "Webhook error" });
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
          await prisma.user.upsert({
            where: { clerkId: id },
            create: {
              clerkId: id,
              email,
              firstName: (attributes.first_name as string) || null,
              lastName: (attributes.last_name as string) || null,
              avatar: (attributes.image_url as string) || null,
              emailVerified: true,
            },
            update: {
              firstName: (attributes.first_name as string) || undefined,
              lastName: (attributes.last_name as string) || undefined,
              avatar: (attributes.image_url as string) || undefined,
            },
          });
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
          break;
        }
        case "user.deleted": {
          await prisma.user.deleteMany({ where: { clerkId: id } });
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
