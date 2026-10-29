import { FastifyPluginAsync } from "fastify";
import { config } from "../config/env";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  createCheckoutSession,
  isStripeConfigured,
  retrieveCheckoutSession,
  StripeAmountError,
} from "../lib/stripe";

interface PaymentMethodInfo {
  id: string;
  label: string;
  description: string;
  requiresRedirect: boolean;
}

interface SessionBody {
  orderId?: string;
}

/**
 * Only methods the server can actually fulfil are returned. The storefront
 * renders exactly this list, so it can never offer a payment option that the
 * backend would reject.
 */
export const paymentRoutes: FastifyPluginAsync = async (app) => {
  app.get("/methods", async () => {
    const methods: PaymentMethodInfo[] = [
      {
        id: "COD",
        label: "Cash on Delivery",
        description: "Pay in cash when your order arrives.",
        requiresRedirect: false,
      },
      {
        id: "BANK_TRANSFER",
        label: "Bank Transfer",
        description: "Transfer the total to our bank account. Your order ships once the payment clears.",
        requiresRedirect: false,
      },
    ];

    if (config.features.stripe) {
      methods.push({
        id: "STRIPE",
        label: "Credit / Debit Card",
        description: "Secure card payment processed by Stripe.",
        requiresRedirect: true,
      });
    }

    return { success: true, data: { methods } };
  });

  /**
   * Creates (or reuses) a hosted Stripe Checkout Session for one of the
   * caller's own pending card orders. Ownership, order state and amount are
   * resolved from the database — never from the request body.
   */
  app.post("/stripe/session", { preHandler: [requireAuth] }, async (request, reply) => {
    if (!isStripeConfigured()) {
      return reply.code(503).send({
        success: false,
        error: "Card payments are not configured on this platform.",
        code: "STRIPE_NOT_CONFIGURED",
      });
    }

    const { orderId } = (request.body ?? {}) as SessionBody;
    if (!orderId || typeof orderId !== "string") {
      return reply.code(400).send({ success: false, error: "An orderId is required" });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: request.user!.id },
      include: {
        payments: true,
        user: { select: { email: true } },
      },
    });

    if (!order) {
      return reply.code(404).send({ success: false, error: "Order not found" });
    }

    const payment = order.payments.find((entry) => entry.method === "STRIPE");
    if (!payment) {
      return reply.code(409).send({
        success: false,
        error: "This order was not created with card payment.",
        code: "PAYMENT_METHOD_MISMATCH",
      });
    }

    if (payment.status === "SUCCEEDED" || payment.status === "REFUNDED") {
      return reply.code(409).send({
        success: false,
        error: "This order has already been paid.",
        code: "ORDER_ALREADY_PAID",
      });
    }

    if (order.status !== "PENDING") {
      return reply.code(409).send({
        success: false,
        error: `This order can no longer be paid. Current status: ${order.status}.`,
        code: "ORDER_NOT_PAYABLE",
      });
    }

    // Reuse an open session so retries never create parallel payment attempts.
    if (payment.stripeSessionId) {
      try {
        const existing = await retrieveCheckoutSession(payment.stripeSessionId);
        if (existing.status === "open" && existing.url) {
          return {
            success: true,
            data: { sessionId: existing.id, url: existing.url, reused: true },
          };
        }
      } catch (error) {
        request.log.warn(
          { err: error, paymentId: payment.id },
          "Unable to retrieve existing Stripe session; creating a new one"
        );
      }
    }

    try {
      const session = await createCheckoutSession({
        orderId: order.id,
        paymentId: payment.id,
        orderNumber: order.orderNumber,
        amount: payment.amount,
        currency: payment.currency,
        customerEmail: order.user.email,
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          stripeSessionId: session.id,
          metadata: {
            ...(typeof payment.metadata === "object" && payment.metadata !== null
              ? (payment.metadata as Record<string, unknown>)
              : {}),
            checkoutSessionId: session.id,
            checkoutCreatedAt: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        data: { sessionId: session.id, url: session.url, reused: false },
      };
    } catch (error) {
      if (error instanceof StripeAmountError) {
        return reply.code(422).send({
          success: false,
          error: error.message,
          code: "STRIPE_AMOUNT_INVALID",
        });
      }
      request.log.error({ err: error, orderId: order.id }, "Stripe session creation failed");
      return reply.code(502).send({
        success: false,
        error: "The payment provider is temporarily unavailable. Please try again.",
        code: "STRIPE_SESSION_FAILED",
      });
    }
  });
};
