import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createOrderSchema } from "../validators";
import { generateOrderNumber, DEFAULT_SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from "@ponnaloy/shared";

export const orderRoutes: FastifyPluginAsync = async (app) => {
  // Get user orders
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { page = 1, limit = 20, status } = request.query as {
      page?: number;
      limit?: number;
      status?: string;
    };

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;

    try {
      const [rawOrders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: { orderBy: { position: "asc" } },
                  },
                },
              },
            },
            payments: { orderBy: { createdAt: "desc" } },
            shipments: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.count({ where }),
      ]);

      const orders = rawOrders.map((o) => ({
        ...o,
        items: o.items.map((i) => ({
          ...i,
          product: i.product ? { ...i.product, images: i.product.images.slice(0, 1) } : i.product,
        })),
        payments: o.payments.slice(0, 1),
        shipments: o.shipments.slice(0, 1),
      }));

      return {
        success: true,
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      app.log.error({ err: error, userId }, "Failed to fetch orders");
      return reply.code(500).send({ success: false, error: "Failed to fetch orders" });
    }
  });

  // Get order by ID
  app.get("/:orderId", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { orderId } = request.params as { orderId: string };

    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: { position: "asc" } },
                  variants: true,
                },
              },
            },
          },
          payments: true,
          shipments: true,
          statusHistory: { orderBy: { createdAt: "desc" } },
          returnRequest: true,
        },
      });

      if (!order) {
        return reply.code(404).send({ success: false, error: "Order not found" });
      }

      return { success: true, data: order };
    } catch (error) {
      app.log.error({ err: error, userId, orderId }, "Failed to fetch order");
      return reply.code(500).send({ success: false, error: "Failed to fetch order" });
    }
  });

  // Create order from cart
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const parsed = createOrderSchema.safeParse(request.body);

    if (!parsed.success) {
      const flatErrors = parsed.error.flatten();
      const fieldErrors = Object.entries(flatErrors.fieldErrors)
        .filter(([, msgs]) => msgs && msgs.length > 0)
        .map(([field, msgs]) => `${field}: ${msgs!.join(", ")}`)
        .join("; ");
      const formErrors = flatErrors.formErrors.join("; ");
      const detail = fieldErrors || formErrors || "Unknown validation error";

      app.log.warn({ userId, errors: flatErrors }, "Order validation failed");
      return reply.code(400).send({
        success: false,
        error: `Invalid order data: ${detail}`,
      });
    }

    const { shippingAddress, billingAddress, paymentMethod, couponCode, notes } = parsed.data;

    try {
      // Get cart with items
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
          coupon: true,
        },
      });

      if (!cart || cart.items.length === 0) {
        return reply.code(400).send({
          success: false,
          error: "Your cart is empty. Add items before placing an order.",
        });
      }

      // Validate stock
      for (const item of cart.items) {
        if (item.variant) {
          if (item.variant.stock < item.quantity) {
            return reply.code(400).send({
              success: false,
              error: `${item.product.name} (${item.variant.name}) has insufficient stock. Available: ${item.variant.stock}, requested: ${item.quantity}`,
            });
          }
        } else {
          const variantCount = await prisma.productVariant.count({
            where: { productId: item.product.id },
          });
          if (variantCount > 0) {
            const totalStock = await prisma.productVariant.aggregate({
              where: { productId: item.product.id },
              _sum: { stock: true },
            });
            const stock = totalStock._sum.stock || 0;
            if (stock < item.quantity) {
              return reply.code(400).send({
                success: false,
                error: `${item.product.name} is out of stock. Available: ${stock}, requested: ${item.quantity}`,
              });
            }
          }
        }
      }

      // Calculate totals server-side (never trust frontend totals)
      let subtotal = 0;
      const orderItems = cart.items.map((item) => {
        const price = item.variant?.price || item.product.price;
        const total = price * item.quantity;
        subtotal += total;
        return {
          productId: item.product.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: price,
          total,
        };
      });

      const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;

      // Apply coupon discount
      let discount = 0;
      if (cart.coupon) {
        discount = cart.coupon.discount;
      }

      const total = subtotal + shippingFee - discount;

      // Verify coupon code matches if provided
      if (couponCode && (!cart.coupon || cart.coupon.code !== couponCode.toUpperCase())) {
        return reply.code(400).send({
          success: false,
          error: "Coupon code does not match the applied coupon",
        });
      }

      app.log.info({ userId, itemCount: cart.items.length, total }, "Creating order");

      // Create order in transaction
      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId,
            subtotal,
            shippingFee,
            discount,
            total,
            shippingAddress,
            billingAddress,
            notes,
            items: {
              create: orderItems,
            },
            payments: {
              create: {
                amount: total,
                method: paymentMethod as "STRIPE" | "PAYPAL" | "COD" | "BANK_TRANSFER",
                status: paymentMethod === "COD" ? "PENDING" : "PROCESSING",
              },
            },
            statusHistory: {
              create: { status: "PENDING", note: "Order placed" },
            },
          },
          include: {
            items: true,
            payments: true,
            statusHistory: true,
          },
        });

        // Update stock
        for (const item of cart.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }

        // Update totalSold for products
        for (const item of orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { totalSold: { increment: item.quantity } },
          });
        }

        // Clear cart
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cartCoupon.deleteMany({ where: { cartId: cart.id } });

        // Update coupon usage
        if (cart.coupon) {
          await tx.coupon.update({
            where: { code: cart.coupon.code },
            data: { usedCount: { increment: 1 } },
          });
        }

        return newOrder;
      });

      app.log.info({ userId, orderId: order.id, orderNumber: order.orderNumber }, "Order created successfully");

      return reply.code(201).send({ success: true, data: order });
    } catch (error) {
      app.log.error({ err: error, userId }, "Failed to create order");
      return reply.code(500).send({
        success: false,
        error: "An unexpected error occurred while creating your order. Please try again.",
      });
    }
  });

  // Cancel order
  app.post("/:orderId/cancel", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { orderId } = request.params as { orderId: string };

    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: { items: true },
      });

      if (!order) {
        return reply.code(404).send({ success: false, error: "Order not found" });
      }

      if (!["PENDING", "CONFIRMED"].includes(order.status)) {
        return reply.code(400).send({
          success: false,
          error: `Order cannot be cancelled. Current status: ${order.status}`,
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "CANCELLED" },
        });

        await tx.orderStatusLog.create({
          data: { orderId, status: "CANCELLED", note: "Cancelled by customer" },
        });

        // Restore stock
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { totalSold: { decrement: item.quantity } },
          });
        }
      });

      app.log.info({ userId, orderId }, "Order cancelled");
      return { success: true, message: "Order cancelled" };
    } catch (error) {
      app.log.error({ err: error, userId, orderId }, "Failed to cancel order");
      return reply.code(500).send({ success: false, error: "Failed to cancel order" });
    }
  });
};
