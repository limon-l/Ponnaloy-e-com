import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth, optionalAuth } from "../middleware/auth";

export const cartRoutes: FastifyPluginAsync = async (app) => {
  // Get cart (requires auth)
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;

    const mapCart = (cart) => ({
      ...cart,
      items: cart.items.map((i) => ({
        ...i,
        product: i.product ? { ...i.product, images: i.product.images.slice(0, 1) } : i.product,
      })),
    });

    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { position: "asc" } },
                variants: true,
              },
            },
            variant: true,
          },
        },
        coupon: true,
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: { position: "asc" } },
                  variants: true,
                },
              },
              variant: true,
            },
          },
          coupon: true,
        },
      });
    }

    cart = mapCart(cart);

    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.variant?.price || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const shippingFee = subtotal >= 15000 ? 0 : 1500;
    const discount = cart.coupon?.discount || 0;
    const total = subtotal + shippingFee - discount;

    return {
      success: true,
      data: {
        ...cart,
        subtotal,
        shippingFee,
        discount,
        total: Math.max(0, total),
        itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    };
  });

  // Add item to cart
  app.post("/items", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { productId, variantId, quantity = 1 } = request.body as {
      productId: string;
      variantId?: string;
      quantity?: number;
    };

    if (!productId) {
      return reply.code(400).send({
        success: false,
        error: "Product ID is required",
      });
    }

    if (quantity < 1 || quantity > 100) {
      return reply.code(400).send({
        success: false,
        error: "Quantity must be between 1 and 100",
      });
    }

    // Verify product exists and is active
    const product = await prisma.product.findUnique({
      where: { id: productId, status: "ACTIVE" },
    });

    if (!product) {
      return reply.code(404).send({
        success: false,
        error: "Product not found or unavailable",
      });
    }

    // Verify variant if provided
    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant || variant.productId !== productId) {
        return reply.code(400).send({
          success: false,
          error: "Invalid product variant",
        });
      }
      if (variant.stock < quantity) {
        return reply.code(400).send({
          success: false,
          error: "Insufficient stock",
        });
      }
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_variantId: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
        },
      },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity,
        },
      });
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { position: "asc" } },
                variants: true,
              },
            },
            variant: true,
          },
        },
        coupon: true,
      },
    });

    return { success: true, data: mapCart(updatedCart) };
  });

  // Update cart item quantity
  app.put("/items/:itemId", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { itemId } = request.params as { itemId: string };
    const { quantity } = request.body as { quantity: number };

    if (quantity < 1 || quantity > 100) {
      return reply.code(400).send({
        success: false,
        error: "Quantity must be between 1 and 100",
      });
    }

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      return reply.code(404).send({ success: false, error: "Cart not found" });
    }

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      return reply.code(404).send({ success: false, error: "Cart item not found" });
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return { success: true, message: "Cart updated" };
  });

  // Remove item from cart
  app.delete("/items/:itemId", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { itemId } = request.params as { itemId: string };

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      return reply.code(404).send({ success: false, error: "Cart not found" });
    }

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      return reply.code(404).send({ success: false, error: "Cart item not found" });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    return { success: true, message: "Item removed from cart" };
  });

  // Clear cart
  app.delete("/", { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cartCoupon.deleteMany({ where: { cartId: cart.id } });
    }

    return { success: true, message: "Cart cleared" };
  });

  // Apply coupon
  app.post("/coupon", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { code } = request.body as { code: string };

    if (!code) {
      return reply.code(400).send({ success: false, error: "Coupon code is required" });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return reply.code(404).send({ success: false, error: "Invalid coupon code" });
    }

    if (!coupon.isActive) {
      return reply.code(400).send({ success: false, error: "Coupon is inactive" });
    }

    if (coupon.endDate && new Date(coupon.endDate) < new Date()) {
      return reply.code(400).send({ success: false, error: "Coupon has expired" });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return reply.code(400).send({ success: false, error: "Coupon usage limit reached" });
    }

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      return reply.code(400).send({ success: false, error: "Cart is empty" });
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + item.quantity * 1000; // simplified - would need product lookup
    }, 0);

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return reply.code(400).send({
        success: false,
        error: `Minimum order amount is $${(coupon.minOrderAmount / 100).toFixed(2)}`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discount = Math.round((subtotal * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else if (coupon.discountType === "FIXED") {
      discount = coupon.discountValue;
    }

    // Apply coupon to cart
    await prisma.cartCoupon.upsert({
      where: { cartId: cart.id },
      create: {
        cartId: cart.id,
        code: coupon.code,
        discount,
      },
      update: {
        code: coupon.code,
        discount,
      },
    });

    return {
      success: true,
      data: {
        code: coupon.code,
        discount,
        discountType: coupon.discountType,
      },
    };
  });

  // Remove coupon
  app.delete("/coupon", { preHandler: [requireAuth] }, async (request) => {
    const userId = request.user!.id;

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartCoupon.deleteMany({ where: { cartId: cart.id } });
    }

    return { success: true, message: "Coupon removed" };
  });
};
