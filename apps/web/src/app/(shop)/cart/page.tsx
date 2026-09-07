"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Lock, Check, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice } from "@/lib/utils";
import { useCart } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/toast";
import { FREE_SHIPPING_THRESHOLD } from "@ponnaloy/shared";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, discount, couponCode, itemCount } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 1500;
  const total = Math.max(0, subtotal + shippingFee - discount);
  const freeShippingProgress = Math.min(subtotal / FREE_SHIPPING_THRESHOLD, 1);

  const handleRemove = (id: string, name: string) => {
    setRemovingId(id);
    setTimeout(() => {
      removeItem(id);
      setRemovingId(null);
      toast({
        title: "Removed from cart",
        description: `${name} has been removed from your cart.`,
        variant: "destructive",
      });
    }, 300);
  };

  if (items.length === 0) {
    return (
      <div className="container py-16 text-center animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <PackageOpen className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Looks like you haven&apos;t added anything to your cart yet. Browse our products and find something you love.
        </p>
        <Button size="lg" asChild>
          <Link href="/products">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    );
  }

  const checkoutHref = isAuthenticated ? "/checkout" : "/sign-in?redirect=/checkout";

  return (
    <div className="container py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8 animate-fade-in">
        Shopping Cart
        <span className="text-muted-foreground font-normal text-lg ml-2">
          ({itemCount} {itemCount === 1 ? "item" : "items"})
        </span>
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex gap-4 p-4 border rounded-xl transition-all duration-200 animate-slide-up",
                removingId === item.id && "opacity-50 scale-95"
              )}
              style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                <Image src={item.image || ""} alt={item.name} fill className="object-cover" sizes="96px" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/product/${item.slug}`} className="font-medium text-sm hover:text-primary line-clamp-1 transition-colors">
                  {item.name}
                </Link>
                {item.variant && <p className="text-xs text-muted-foreground mt-0.5">{item.variant.name}</p>}
                <p className="text-sm font-medium mt-1">{formatPrice(item.price)}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-none hover:bg-muted"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-10 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-none hover:bg-muted"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/5"
                    onClick={() => handleRemove(item.id, item.name)}
                    disabled={removingId === item.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="ml-1 hidden sm:inline">{removingId === item.id ? "Removing..." : "Remove"}</span>
                  </Button>
                </div>
              </div>
              <div className="text-right font-semibold shrink-0 text-sm">
                {formatPrice(item.price * item.quantity)}
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
          <div className="border rounded-xl p-6 sticky top-24 animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            {subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
              <div className="mb-4 p-3 bg-primary/5 border border-primary/10 rounded-lg text-sm text-center">
                <span className="text-primary font-medium">{formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)}</span>{" "}
                away from free shipping
                <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${freeShippingProgress * 100}%` }}
                  />
                </div>
              </div>
            )}
            {subtotal >= FREE_SHIPPING_THRESHOLD && (
              <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-center text-success font-medium flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                You qualify for free shipping!
              </div>
            )}

            <Separator className="my-4" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  {shippingFee === 0 ? (
                    <span className="text-success font-medium">Free</span>
                  ) : (
                    formatPrice(shippingFee)
                  )}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount {couponCode && `(${couponCode})`}</span>
                  <span className="font-medium">-{formatPrice(discount)}</span>
                </div>
              )}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Button className="w-full mt-6" size="lg" asChild>
              <Link href={checkoutHref}>
                {!isAuthenticated && <Lock className="h-4 w-4 mr-2" />}
                {isAuthenticated ? "Proceed to Checkout" : "Sign In to Checkout"}
              </Link>
            </Button>
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                <Link href="/sign-up" className="text-primary hover:underline">Create an account</Link> or sign in to complete your purchase
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
