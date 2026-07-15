"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, CreditCard, Truck, Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const steps = [
  { id: 1, label: "Shipping", icon: Truck },
  { id: 2, label: "Payment", icon: CreditCard },
  { id: 3, label: "Review", icon: Check },
];

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("stripe");

  const subtotal = 32997;
  const shippingFee = 0;
  const total = subtotal + shippingFee;

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-12">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={`text-sm font-medium hidden sm:inline ${
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-4 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Shipping Information</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Main Street" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address2">Apartment, suite, etc. (optional)</Label>
                <Input id="address2" placeholder="Apt 4B" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="San Francisco" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="CA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" placeholder="94102" />
                </div>
              </div>

              <Button onClick={() => setCurrentStep(2)} className="w-full">
                Continue to Payment
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Payment Method</h2>

              <RadioGroup
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                className="space-y-3"
              >
                <label
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === "stripe"
                      ? "border-primary bg-primary/5"
                      : "border"
                  }`}
                >
                  <RadioGroupItem value="stripe" />
                  <CreditCard className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Credit / Debit Card</p>
                    <p className="text-sm text-muted-foreground">
                      Pay securely with Stripe
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === "paypal"
                      ? "border-primary bg-primary/5"
                      : "border"
                  }`}
                >
                  <RadioGroupItem value="paypal" />
                  <div className="h-5 w-5 bg-blue-600 rounded text-white flex items-center justify-center text-xs font-bold">
                    PP
                  </div>
                  <div>
                    <p className="font-medium">PayPal</p>
                    <p className="text-sm text-muted-foreground">
                      Pay with your PayPal account
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === "cod"
                      ? "border-primary bg-primary/5"
                      : "border"
                  }`}
                >
                  <RadioGroupItem value="cod" />
                  <div className="h-5 w-5 bg-green-600 rounded text-white flex items-center justify-center text-xs font-bold">
                    $
                  </div>
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      Pay when you receive your order
                    </p>
                  </div>
                </label>
              </RadioGroup>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(3)} className="flex-1">
                  Review Order
                </Button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Review Order</h2>

              {/* Shipping Address */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Shipping Address</h3>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
                    Edit
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  John Doe
                  <br />
                  123 Main Street, Apt 4B
                  <br />
                  San Francisco, CA 94102
                </p>
              </div>

              {/* Payment Method */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Payment Method</h3>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
                    Edit
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {paymentMethod === "stripe"
                    ? "Credit / Debit Card"
                    : paymentMethod === "paypal"
                    ? "PayPal"
                    : "Cash on Delivery"}
                </p>
              </div>

              {/* Order Items */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Order Items</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded overflow-hidden bg-muted">
                      <Image
                        src="https://picsum.photos/seed/earbuds/600/600"
                        alt="Product"
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Wireless Earbuds Pro</p>
                      <p className="text-xs text-muted-foreground">Qty: 2</p>
                    </div>
                    <p className="font-medium">{formatPrice(15998)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded overflow-hidden bg-muted">
                      <Image
                        src="https://picsum.photos/seed/watch/600/600"
                        alt="Product"
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Smart Watch Ultra</p>
                      <p className="text-xs text-muted-foreground">Qty: 1</p>
                    </div>
                    <p className="font-medium">{formatPrice(24999)}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button className="flex-1" size="lg">
                  <Lock className="h-4 w-4 mr-2" />
                  Place Order - {formatPrice(total)}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="border rounded-lg p-6 sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                  <Image
                    src="https://picsum.photos/seed/earbuds/600/600"
                    alt="Product"
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-1">Wireless Earbuds Pro</p>
                  <p className="text-xs text-muted-foreground">x2</p>
                </div>
                <p className="text-sm font-medium">{formatPrice(15998)}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded overflow-hidden bg-muted">
                  <Image
                    src="https://picsum.photos/seed/watch/600/600"
                    alt="Product"
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-1">Smart Watch Ultra</p>
                  <p className="text-xs text-muted-foreground">x1</p>
                </div>
                <p className="text-sm font-medium">{formatPrice(24999)}</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-primary">Free</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Secure 256-bit SSL encryption</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Free shipping on orders over $150</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
