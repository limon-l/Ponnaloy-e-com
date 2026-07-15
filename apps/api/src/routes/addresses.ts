import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createAddressSchema, updateAddressSchema } from "../validators";

export const addressRoutes: FastifyPluginAsync = async (app) => {
  // Get all addresses
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return { success: true, data: addresses };
  });

  // Create address
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const parsed = createAddressSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid address data",
        details: parsed.error.flatten(),
      });
    }

    const data = parsed.data;

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        userId,
        ...data,
      },
    });

    return reply.code(201).send({ success: true, data: address });
  });

  // Update address
  app.put("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };
    const parsed = updateAddressSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        error: "Invalid address data",
        details: parsed.error.flatten(),
      });
    }

    const existing = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.code(404).send({ success: false, error: "Address not found" });
    }

    const data = parsed.data;

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data,
    });

    return { success: true, data: address };
  });

  // Delete address
  app.delete("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    const existing = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.code(404).send({ success: false, error: "Address not found" });
    }

    await prisma.address.delete({ where: { id } });

    return { success: true, message: "Address deleted" };
  });

  // Set default address
  app.put("/:id/default", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    const existing = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.code(404).send({ success: false, error: "Address not found" });
    }

    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return { success: true, message: "Default address updated" };
  });
};
