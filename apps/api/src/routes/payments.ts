import { FastifyPluginAsync } from "fastify";
import { config } from "../config/env";

interface PaymentMethodInfo {
  id: string;
  label: string;
  description: string;
  requiresRedirect: boolean;
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
};
