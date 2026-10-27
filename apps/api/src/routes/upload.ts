import { FastifyPluginAsync } from "fastify";
import { requireAdmin } from "../middleware/auth";
import { isAllowedUpload, saveUpload } from "../lib/storage";

const ALLOWED_LABEL = "JPEG, PNG, WebP, GIF, MP4";

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  // Upload a single file (admin only)
  app.post("/", { preHandler: [requireAdmin] }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({
        success: false,
        error: "No file uploaded",
      });
    }

    if (!isAllowedUpload(data.mimetype)) {
      // Drain the stream so the connection can be reused.
      await data.toBuffer().catch(() => undefined);
      return reply.code(415).send({
        success: false,
        error: `File type not allowed. Supported: ${ALLOWED_LABEL}`,
      });
    }

    try {
      const buffer = await data.toBuffer();
      const stored = await saveUpload(buffer, data.mimetype);
      return {
        success: true,
        data: {
          url: stored.url,
          path: stored.path,
          filename: stored.filename,
          originalName: data.filename,
          mimetype: stored.mimetype,
          size: stored.size,
        },
      };
    } catch (error) {
      app.log.error({ err: error }, "Upload failed");
      return reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  });

  // Upload multiple files (admin only)
  app.post("/multiple", { preHandler: [requireAdmin] }, async (request, reply) => {
    const uploaded: Array<{
      url: string;
      path: string;
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
    }> = [];
    const rejected: string[] = [];

    for await (const file of request.files()) {
      if (!isAllowedUpload(file.mimetype)) {
        rejected.push(file.filename);
        await file.toBuffer().catch(() => undefined);
        continue;
      }
      try {
        const stored = await saveUpload(await file.toBuffer(), file.mimetype);
        uploaded.push({
          url: stored.url,
          path: stored.path,
          filename: stored.filename,
          originalName: file.filename,
          mimetype: stored.mimetype,
          size: stored.size,
        });
      } catch (error) {
        rejected.push(file.filename);
        app.log.error({ err: error }, "Upload failed for one file");
      }
    }

    if (uploaded.length === 0) {
      return reply.code(400).send({
        success: false,
        error: `No valid files uploaded. Supported: ${ALLOWED_LABEL}`,
        rejected,
      });
    }

    return {
      success: true,
      data: uploaded,
      ...(rejected.length > 0 && { rejected }),
    };
  });
};
