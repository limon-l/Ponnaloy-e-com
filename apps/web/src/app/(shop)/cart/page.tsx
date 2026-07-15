"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";

// Mock cart data - replace with actual cart state
const mockCartItems = [
  {
    id: "1",
    quantity: 2,
    product: {
      id: "p1",
      name: "Wireless Earbuds Pro",
      slug: "wireless-earbuds-pro",
      price: 7999,
      images: [{ url: "https://picsum.photos/seed/earbuds/600/600", alt: "Earbuds" }],
    },
  },
  {
    id: "2",
    quantity: 1,
    product: {
      id: "p2",
      name: "Smart Watch Ultra",
      slug: "smart-watch-ultra",
      price: 24999,
      images: [{ url: "https://picsum.photos/seed/watch/600/600", alt: "Watch" }],
    },
  },
];

export default function CartPage() {
  const [items, setItems] = useState(mockCartItems);
  const [couponCode, setCouponCode] = useState("");

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shippingFee = subtotal >= 15000 ? 0 : 1500;
  const total = subtotal + shippingFee;

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">
          Add items to your cart to get started.
        </p>
        <Button asChild>
          <Link href="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 border rounded-lg"
            >
              <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted shrink-0">
                <Image
                  src={item.product.images[0]?.url || ""}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${item.product.slug}`}
                  className="font-medium hover:text-primary line-clamp-1"
                >
                  {item.product.name}
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatPrice(item.product.price)}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-10 text-center text-sm">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
              <div className="text-right font-semibold">
                {formatPrice(item.product.price * item.quantity)}
              </div>
            </div>
          ))}

          <Button variant="ghost" asChild className="mt-4">
            <Link href="/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg p-6 sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            {/* Coupon */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <Button variant="outline" size="sm">
                Apply
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  {shippingFee === 0 ? (
                    <span className="text-primary">Free</span>
                  ) : (
                    formatPrice(shippingFee)
                  )}
                </span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            <Button className="w-full mt-6" size="lg" asChild>
              <Link href="/checkout">Proceed to Checkout</Link>
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
