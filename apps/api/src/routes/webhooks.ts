import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Stripe webhook
  app.post("/stripe", async (request, reply) => {
    const sig = request.headers["stripe-signature"];
    const body = await request.rawBody;

    if (!sig || !body) {
      return reply.code(400).send({ error: "Missing signature" });
    }

    try {
      const stripe = (await import("stripe")).default;
      const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY || "");
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

      const event = stripeInstance.webhooks.constructEvent(
        body,
        sig,
        endpointSecret
      );

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as { id: string; payment_intent: string | null };
          // Update payment status
          await prisma.payment.updateMany({
            where: { stripeSessionId: session.id },
            data: {
              status: "SUCCEEDED",
              transactionId: session.payment_intent || undefined,
            },
          });
          // Update order status
          const payment = await prisma.payment.findFirst({
            where: { stripeSessionId: session.id },
          });
          if (payment) {
            await prisma.order.update({
              where: { id: payment.orderId },
              data: { status: "CONFIRMED" },
            });
            await prisma.orderStatusLog.create({
              data: {
                orderId: payment.orderId,
                status: "CONFIRMED",
                note: "Payment received via Stripe",
              },
            });
          }
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
          const charge = event.data.object as { id: string; amount_refunded: number };
          await prisma.payment.updateMany({
            where: { transactionId: charge.id },
            data: { status: "REFUNDED" },
          });
          break;
        }
      }

      return reply.code(200).send({ received: true });
    } catch (error) {
      console.error("Stripe webhook error:", error);
      return reply.code(400).send({ error: "Webhook error" });
    }
  });

  // Clerk webhook
  app.post("/clerk", async (request, reply) => {
    const body = await request.rawBody;

    try {
      const { Webhook } = await import("svix");
      const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
      const evt = wh.verify(body as string, {
        "svix-id": request.headers["svix-id"] as string,
        "svix-timestamp": request.headers["svix-timestamp"] as string,
        "svix-signature": request.headers["svix-signature"] as string,
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
          const email = (attributes.email_addresses as { email_address: string }[])?.[0]?.email_address || "";
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
      console.error("Clerk webhook error:", error);
      return reply.code(400).send({ error: "Webhook error" });
    }
  });
};
