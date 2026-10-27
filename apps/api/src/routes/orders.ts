import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { createOrderSchema } from "../validators";
import { generateOrderNumber } from "@ponnaloy/shared";
import { config } from "../config/env";
import { computeOrderTotals } from "../services/pricing";

type PaymentMethodValue =
  | "STRIPE"
  | "PAYPAL"
  | "SSLCOMMERZ"
  | "RAZORPAY"
  | "COD"
  | "BANK_TRANSFER";

type Reservation = {
  kind: "variant" | "product";
  id: string;
  quantity: number;
};

/**
 * Payment methods the server can genuinely fulfil today.
 * Card/PayPal/etc. are intentionally rejected until a real gateway integration
 * (session creation + verified webhook) is enabled through configuration.
 */
function isPaymentMethodEnabled(method: PaymentMethodValue): boolean {
  if (method === "COD" || method === "BANK_TRANSFER") return true;
  if (method === "STRIPE") return config.features.stripe;
  return false;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

export const orderRoutes: FastifyPluginAsync = async (app) => {
  /** Return reserved inventory after a failed checkout attempt. */
  async function releaseReservations(reservations: Reservation[], orderId?: string) {
    for (const reservation of reservations) {
      try {
        if (reservation.kind === "variant") {
          await prisma.productVariant.updateMany({
            where: { id: reservation.id },
            data: { stock: { increment: reservation.quantity } },
          });
        } else {
          await prisma.product.updateMany({
            where: { id: reservation.id },
            data: { stock: { increment: reservation.quantity } },
          });
        }
      } catch (error) {
        app.log.error(
          { err: error, reservation, orderId },
          "Failed to release reserved inventory"
        );
      }
    }
    reservations.length = 0;
  }

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
            payments: true,
            shipments: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.count({ where }),
      ]);

      return {
        success: true,
        data: rawOrders,
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

    const {
      shippingAddress,
      billingAddress,
      paymentMethod,
      couponCode,
      notes,
      idempotencyKey,
    } = parsed.data;

    const method = paymentMethod as PaymentMethodValue;

    if (!isPaymentMethodEnabled(method)) {
      return reply.code(409).send({
        success: false,
        error: `The ${method} payment method is not available yet. Please choose Cash on Delivery or Bank Transfer.`,
        code: "PAYMENT_METHOD_UNAVAILABLE",
      });
    }

    const headerKey = request.headers["idempotency-key"];
    const key = idempotencyKey || (typeof headerKey === "string" ? headerKey : undefined);

    // Idempotent replay: return the original order instead of charging/shipping twice.
    if (key) {
      const existing = await prisma.order.findFirst({
        where: { idempotencyKey: key, userId },
        include: { items: true, payments: true, statusHistory: true },
      });
      if (existing) {
        return reply.code(200).send({ success: true, data: existing, idempotent: true });
      }
    }

    const reservations: Reservation[] = [];
    let claimedId: string | null = null;
    let orderCommitted = false;

    /** Allow a later retry after a checkout attempt fails before the order exists. */
    async function releaseClaim() {
      if (!claimedId) return;
      const id = claimedId;
      claimedId = null;
      try {
        await prisma.idempotencyRecord.delete({ where: { id } });
      } catch (error) {
        app.log.error({ err: error, id }, "Failed to release idempotency claim");
      }
    }

    try {
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

      // ── Validate line items (quantity, product state, variant ownership) ──
      for (const item of cart.items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
          return reply.code(400).send({
            success: false,
            error: `Invalid quantity for ${item.product.name}.`,
          });
        }
        if (item.product.status !== "ACTIVE") {
          return reply.code(409).send({
            success: false,
            error: `${item.product.name} is no longer available. Please remove it from your cart.`,
          });
        }
        if (item.variant && item.variant.productId !== item.product.id) {
          return reply.code(409).send({
            success: false,
            error: `The selected variant for ${item.product.name} is invalid.`,
          });
        }

        const available = item.variant ? item.variant.stock : item.product.stock;
        if (available < item.quantity) {
          const variantLabel = item.variant ? ` (${item.variant.name})` : "";
          return reply.code(409).send({
            success: false,
            error: `${item.product.name}${variantLabel} has insufficient stock. Available: ${available}, requested: ${item.quantity}.`,
            code: "INSUFFICIENT_STOCK",
          });
        }
      }

      // ── Totals are always recomputed from persisted prices ──
      const orderItems = cart.items.map((item) => {
        const unitPrice = item.variant?.price || item.product.price;
        return {
          productId: item.product.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice,
          total: unitPrice * item.quantity,
        };
      });

      // ── Coupon revalidation against the database (never trust cart snapshot) ──
      const couponKey = couponCode?.trim().toUpperCase() || cart.coupon?.code;
      if (couponCode && cart.coupon && cart.coupon.code !== couponCode.toUpperCase()) {
        return reply.code(400).send({
          success: false,
          error: "Coupon code does not match the applied coupon.",
        });
      }

      let coupon = null;
      if (couponKey) {
        coupon = await prisma.coupon.findUnique({ where: { code: couponKey } });
        if (!coupon) {
          return reply.code(400).send({
            success: false,
            error: "This coupon is no longer valid.",
            code: "COUPON_INVALID",
          });
        }
      }

      const pricing = computeOrderTotals(orderItems, coupon, new Date());
      if (!pricing.ok) {
        return reply.code(400).send({
          success: false,
          error: pricing.error,
          code: pricing.code,
        });
      }

      const { subtotal, shippingFee, discount, total } = pricing.totals;

      app.log.info(
        { userId, itemCount: cart.items.length, subtotal, shippingFee, discount, total },
        "Creating order"
      );

      // ── Claim the idempotency key before mutating inventory ──
      if (key) {
        const recordId = `${userId}:${key}`;
        try {
          await prisma.idempotencyRecord.create({ data: { id: recordId, userId } });
          claimedId = recordId;
        } catch (error) {
          if (!isUniqueConstraintError(error)) throw error;

          const record = await prisma.idempotencyRecord.findUnique({ where: { id: recordId } });
          if (record?.orderId) {
            const existingOrder = await prisma.order.findFirst({
              where: { id: record.orderId, userId },
              include: { items: true, payments: true, statusHistory: true },
            });
            if (existingOrder) {
              return reply
                .code(200)
                .send({ success: true, data: existingOrder, idempotent: true });
            }
          }

          return reply.code(409).send({
            success: false,
            error:
              "A previous checkout attempt is still being processed. Please wait a moment and try again.",
            code: "ORDER_IN_PROGRESS",
          });
        }
      }

      // ── Reserve inventory atomically per document (MongoDB has no cross-document transactions here) ──
      for (const item of cart.items) {
        const filter = {
          id: item.variant ? item.variant.id : item.product.id,
          stock: { gte: item.quantity },
        };

        const result = item.variant
          ? await prisma.productVariant.updateMany({
              where: filter,
              data: { stock: { decrement: item.quantity } },
            })
          : await prisma.product.updateMany({
              where: filter,
              data: { stock: { decrement: item.quantity } },
            });

        if (result.count === 0) {
          await releaseReservations(reservations);
          await releaseClaim();
          return reply.code(409).send({
            success: false,
            error: `${item.product.name} just sold out or changed availability. Please review your cart.`,
            code: "STOCK_RESERVATION_FAILED",
          });
        }

        reservations.push({
          kind: item.variant ? "variant" : "product",
          id: filter.id,
          quantity: item.quantity,
        });
      }

      // ── Persist the order (failures roll back stock and the claim in the outer catch) ──
      const order = await prisma.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            userId,
            subtotal,
            shippingFee,
            tax: 0,
            discount,
            total,
            shippingAddress,
            billingAddress: billingAddress ?? undefined,
            notes: notes || undefined,
            idempotencyKey: key,
            items: { create: orderItems },
            payments: {
              create: {
                amount: total,
                method,
                status: "PENDING",
              },
            },
            statusHistory: {
              create: { status: "PENDING", note: "Order placed" },
            },
          },
          include: { items: true, payments: true, statusHistory: true },
      });

      orderCommitted = true;

      if (claimedId) {
        try {
          await prisma.idempotencyRecord.update({
            where: { id: claimedId },
            data: { orderId: order.id },
          });
        } catch (error) {
          // The claim stays in place (without orderId) so a retry receives a
          // safe 409 instead of creating a duplicate order.
          app.log.error(
            { err: error, orderId: order.id },
            "Failed to link idempotency record to order"
          );
        }
      }

      // ── Post-order bookkeeping (failures are logged, never silent stock leaks) ──
      try {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        await prisma.cartCoupon.deleteMany({ where: { cartId: cart.id } });
      } catch (cartErr) {
        app.log.error({ err: cartErr, orderId: order.id }, "Failed to clear cart");
      }

      try {
        for (const item of orderItems) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { totalSold: { increment: item.quantity } },
          });
        }
      } catch (soldErr) {
        app.log.error({ err: soldErr, orderId: order.id }, "Failed to update totalSold");
      }

      if (couponKey) {
        try {
          await prisma.coupon.update({
            where: { code: couponKey },
            data: { usedCount: { increment: 1 } },
          });
        } catch (couponErr) {
          app.log.error({ err: couponErr, orderId: order.id }, "Failed to update coupon usage");
        }
      }

      app.log.info({ userId, orderId: order.id, orderNumber: order.orderNumber }, "Order created");

      return reply.code(201).send({ success: true, data: order });
    } catch (error) {
      if (!orderCommitted) {
        await releaseReservations(reservations);
        await releaseClaim();
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      app.log.error({ err: error, userId }, "Failed to create order");
      return reply.code(500).send({
        success: false,
        error:
          config.isProduction
            ? "An unexpected error occurred while creating your order. Please try again."
            : `Order creation failed: ${errMsg}`,
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
        return reply.code(409).send({
          success: false,
          error: `Order cannot be cancelled. Current status: ${order.status}`,
          code: "ORDER_NOT_CANCELLABLE",
        });
      }

      // Conditional transition: concurrent cancellation attempts (or a
      // simultaneous admin update) can only win once, so stock is restocked
      // exactly once.
      const transition = await prisma.order.updateMany({
        where: {
          id: orderId,
          userId,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        data: { status: "CANCELLED", restockedAt: new Date() },
      });

      if (transition.count === 0) {
        const current = await prisma.order.findFirst({
          where: { id: orderId, userId },
          select: { status: true },
        });
        return reply.code(409).send({
          success: false,
          error: current
            ? `Order cannot be cancelled. Current status: ${current.status}`
            : "Order not found",
          code: "ORDER_NOT_CANCELLABLE",
        });
      }

      await prisma.orderStatusLog.create({
        data: {
          orderId,
          status: "CANCELLED",
          note: "Cancelled by customer",
          actorId: userId,
          actorRole: request.user!.role,
        },
      });

      for (const item of order.items) {
        if (item.variantId) {
          await prisma.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await prisma.product.updateMany({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await prisma.product.update({
          where: { id: item.productId },
          data: { totalSold: { decrement: item.quantity } },
        });
      }

      app.log.info({ userId, orderId }, "Order cancelled");
      return { success: true, message: "Order cancelled" };
    } catch (error) {
      app.log.error({ err: error, userId, orderId }, "Failed to cancel order");
      return reply.code(500).send({ success: false, error: "Failed to cancel order" });
    }
  });
};
