import { FastifyPluginAsync } from "fastify";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  // Upload file (admin only)
  app.post("/", { preHandler: [requireAdmin] }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({
        success: false,
        error: "No file uploaded",
      });
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
    ];

    if (!allowedTypes.includes(data.mimetype)) {
      return reply.code(400).send({
        success: false,
        error: "File type not allowed. Supported: JPEG, PNG, WebP, GIF, MP4",
      });
    }

    // For now, return a placeholder URL
    // In production, upload to R2/S3
    const filename = `${Date.now()}-${data.filename}`;
    const url = `/uploads/${filename}`;

    return {
      success: true,
      data: {
        url,
        filename,
        mimetype: data.mimetype,
        size: data.file.bytesRead,
      },
    };
  });

  // Upload multiple files
  app.post("/multiple", { preHandler: [requireAdmin] }, async (request, reply) => {
    const files = await request.files();

    if (!files || files.length === 0) {
      return reply.code(400).send({
        success: false,
        error: "No files uploaded",
      });
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    const uploaded = [];

    for await (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        continue;
      }

      const filename = `${Date.now()}-${file.filename}`;
      uploaded.push({
        url: `/uploads/${filename}`,
        filename,
        mimetype: file.mimetype,
      });
    }

    return {
      success: true,
      data: uploaded,
    };
  });
};
