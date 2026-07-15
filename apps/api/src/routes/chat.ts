import { FastifyPluginAsync } from "fastify";
import { streamChat } from "../lib/chat-service";
import { optionalAuth } from "../middleware/auth";

export const chatRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/",
    { preHandler: [optionalAuth] },
    async (request, reply) => {
      const { message, conversationId } = request.body as {
        message?: string;
        conversationId?: string;
      };

      if (!message || !message.trim()) {
        return reply.code(400).send({
          success: false,
          error: "A message is required",
        });
      }

      // Set SSE headers
      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");

      // Flush headers
      reply.hijack();

      const write = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        reply.raw.write(payload);
      };

      try {
        const stream = streamChat(
          message.trim(),
          conversationId,
          request.user?.id,
          request.user?.firstName
        );

        for await (const event of stream) {
          write(event.type, event.data);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Chat service unavailable";
        write("error", { error: message });
      } finally {
        reply.raw.end();
      }
    }
  );
};
