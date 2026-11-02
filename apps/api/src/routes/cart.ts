import { FastifyPluginAsync } from "fastify";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { evaluateCoupon } from "../services/pricing";
import { publicProductVisibility } from "../lib/marketplace";

export const cartRoutes: FastifyPluginAsync = async (app) => {
  const mapCart = (cart: any) => ({
    ...cart,
    items: cart.items.map((i: any) => ({
      ...i,
      product: i.product ? { ...i.product, images: i.product.images.slice(0, 1) } : i.product,
    })),
  });

  async function currentDiscount(cart: any, subtotal: number, shippingFee: number) {
    if (!cart.coupon) return 0;
    const coupon = await prisma.coupon.findUnique({ where: { code: cart.coupon.code } });
    const result = coupon ? evaluateCoupon(coupon, subtotal) : null;
    if (!result?.ok || cart.items.length === 0) {
      await prisma.cartCoupon.deleteMany({ where: { cartId: cart.id } });
      cart.coupon = null;
      return 0;
    }
    const discount = result.freeShipping ? shippingFee : result.discount;
    cart.coupon.discount = discount;
    await prisma.cartCoupon.update({ where: { cartId: cart.id }, data: { discount } });
    return discount;
  }

  // Get cart (requires auth)
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    try {
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

      cart = mapCart(cart!);

      const subtotal = cart!.items.reduce((sum: number, item: any) => {
        const price = item.variant?.price ?? item.product.price;
        return sum + price * item.quantity;
      }, 0);

      const shippingFee = subtotal === 0 || subtotal >= 15000 ? 0 : 1500;
      const discount = await currentDiscount(cart, subtotal, shippingFee);
      const total = subtotal + shippingFee - discount;

      return {
        success: true,
        data: {
          ...cart,
          subtotal,
          shippingFee,
          discount,
          total: Math.max(0, total),
          itemCount: cart!.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        },
      };
    } catch (error) {
      app.log.error({ err: error, userId }, "Failed to get cart");
      return reply.code(500).send({ success: false, error: "Failed to retrieve cart" });
    }
  });

  // Add item to cart
  app.post("/items", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { productId, variantId, quantity = 1 } = request.body as {
      productId: string;
      variantId?: string;
      quantity?: number;
    };

    if (!productId || typeof productId !== "string") {
      return reply.code(400).send({ success: false, error: "Product ID is required" });
    }

    if (quantity < 1 || quantity > 100 || !Number.isInteger(quantity)) {
      return reply.code(400).send({ success: false, error: "Quantity must be between 1 and 100" });
    }

    try {
      // Verify product exists and is active
      const product = await prisma.product.findFirst({
        where: { id: productId, status: "ACTIVE", ...publicProductVisibility() },
      });

      if (!product) {
        return reply.code(404).send({ success: false, error: "Product not found or unavailable" });
      }

      // Verify variant if provided
      if (variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: variantId },
        });
        if (!variant || variant.productId !== productId) {
          return reply.code(400).send({ success: false, error: "Invalid product variant" });
        }
        if (variant.stock < quantity) {
          return reply.code(400).send({ success: false, error: "Insufficient stock" });
        }
      }

      // Get or create cart
      let cart = await prisma.cart.findUnique({ where: { userId } });
      if (!cart) {
        cart = await prisma.cart.create({ data: { userId } });
      }

      // Check if item already in cart using findFirst (safe with nullable compound keys)
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
        },
      });

      const inventory = variantId
        ? await prisma.productVariant.findUnique({ where: { id: variantId } })
        : product;
      if (!inventory || inventory.stock < (existingItem?.quantity ?? 0) + quantity) {
        return reply.code(400).send({ success: false, error: "Insufficient stock" });
      }

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > 100) {
          return reply.code(400).send({ success: false, error: "Cannot add more than 100 of the same item" });
        }
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
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

      const mapped = mapCart(updatedCart!);
      const subtotal = mapped.items.reduce((sum: number, item: any) => {
        const price = item.variant?.price ?? item.product.price;
        return sum + price * item.quantity;
      }, 0);
      const shippingFee = subtotal === 0 || subtotal >= 15000 ? 0 : 1500;
      const discount = await currentDiscount(mapped, subtotal, shippingFee);

      return {
        success: true,
        data: {
          ...mapped,
          subtotal,
          shippingFee,
          discount,
          total: Math.max(0, subtotal + shippingFee - discount),
          itemCount: mapped.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        },
      };
    } catch (error) {
      app.log.error({ err: error, userId, productId }, "Failed to add item to cart");
      return reply.code(500).send({ success: false, error: "Failed to add item to cart" });
    }
  });

  // Update cart item quantity
  app.put("/items/:itemId", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { itemId } = request.params as { itemId: string };
    const { quantity } = request.body as { quantity: number };

    if (!quantity || quantity < 1 || quantity > 100 || !Number.isInteger(quantity)) {
      return reply.code(400).send({ success: false, error: "Quantity must be between 1 and 100" });
    }

    try {
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

      const inventory = item.variantId
        ? await prisma.productVariant.findUnique({ where: { id: item.variantId } })
        : await prisma.product.findUnique({ where: { id: item.productId } });
      if (!inventory || inventory.stock < quantity) {
        return reply.code(400).send({ success: false, error: "Insufficient stock" });
      }

      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });

      return { success: true, message: "Cart updated" };
    } catch (error) {
      app.log.error({ err: error, userId, itemId }, "Failed to update cart item");
      return reply.code(500).send({ success: false, error: "Failed to update cart item" });
    }
  });

  // Remove item from cart
  app.delete("/items/:itemId", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { itemId } = request.params as { itemId: string };

    try {
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
    } catch (error) {
      app.log.error({ err: error, userId, itemId }, "Failed to remove cart item");
      return reply.code(500).send({ success: false, error: "Failed to remove item from cart" });
    }
  });

  // Clear cart
  app.delete("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    try {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        await prisma.cartCoupon.deleteMany({ where: { cartId: cart.id } });
      }

      return { success: true, message: "Cart cleared" };
    } catch (error) {
      app.log.error({ err: error, userId }, "Failed to clear cart");
      return reply.code(500).send({ success: false, error: "Failed to clear cart" });
    }
  });

  // Apply coupon
  app.post("/coupon", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const { code } = request.body as { code: string };

    if (!code) {
      return reply.code(400).send({ success: false, error: "Coupon code is required" });
    }

    try {
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

      // Calculate subtotal by looking up actual prices
      const productIds = cart.items.map((item) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, price: true },
      });
      const variantIds = cart.items.filter((item) => item.variantId).map((item) => item.variantId!);
      const variants = variantIds.length > 0 ? await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, price: true },
      }) : [];
      const variantMap = new Map(variants.map((v) => [v.id, v.price]));
      const productMap = new Map(products.map((p) => [p.id, p.price]));

      const subtotal = cart.items.reduce((sum, item) => {
        const price = (item.variantId ? variantMap.get(item.variantId) : null) ?? productMap.get(item.productId) ?? 0;
        return sum + item.quantity * price;
      }, 0);

      if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        return reply.code(400).send({
          success: false,
          error: `Minimum order amount is $${(coupon.minOrderAmount / 100).toFixed(2)}`,
        });
      }

      const evaluated = evaluateCoupon(coupon, subtotal);
      if (!evaluated.ok) {
        return reply.code(400).send({ success: false, error: evaluated.error });
      }
      const discount = evaluated.freeShipping
        ? (subtotal >= 15000 ? 0 : 1500)
        : evaluated.discount;

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
    } catch (error) {
      app.log.error({ err: error, userId }, "Failed to apply coupon");
      return reply.code(500).send({ success: false, error: "Failed to apply coupon" });
    }
  });

  // Remove coupon
  app.delete("/coupon", { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    try {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (cart) {
        await prisma.cartCoupon.deleteMany({ where: { cartId: cart.id } });
      }

      return { success: true, message: "Coupon removed" };
    } catch (error) {
      app.log.error({ err: error, userId }, "Failed to remove coupon");
      return reply.code(500).send({ success: false, error: "Failed to remove coupon" });
    }
  });
};
