import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const newsletterRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { email, source } = (request.body ?? {}) as {
        email?: string;
        source?: string;
      };

      const normalized = email?.trim().toLowerCase();
      if (!normalized || normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) {
        return reply.code(400).send({ success: false, error: "Enter a valid email address." });
      }

      try {
        await prisma.newsletterSubscriber.upsert({
          where: { email: normalized },
          update: {},
          create: {
            email: normalized,
            source: source?.slice(0, 64) || "storefront",
          },
        });

        return {
          success: true,
          message: "You're subscribed. Look out for our next drop.",
        };
      } catch (error) {
        app.log.error({ err: error }, "Newsletter subscription failed");
        return reply
          .code(500)
          .send({ success: false, error: "Could not save your subscription. Please try again." });
      }
    }
  );
};
