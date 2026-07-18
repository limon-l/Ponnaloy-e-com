"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Truck, Shield, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/contexts/cart-context";
import { api } from "@/lib/api";
import { FREE_SHIPPING_THRESHOLD } from "@ponnaloy/shared";

const steps = [
  { id: 1, label: "Shipping", icon: Truck },
  { id: 2, label: "Payment", icon: CreditCard },
  { id: 3, label: "Review", icon: Check },
];

interface ShippingInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
}

const emptyShipping: ShippingInfo = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [shipping, setShipping] = useState<ShippingInfo>(emptyShipping);
  const [shippingErrors, setShippingErrors] = useState<Partial<Record<keyof ShippingInfo, string>>>({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const { items, subtotal, clearCart } = useCart();
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 1500;
  const total = subtotal + shippingFee;

  const updateShipping = (field: keyof ShippingInfo, value: string) => {
    setShipping((prev) => ({ ...prev, [field]: value }));
    if (shippingErrors[field]) {
      setShippingErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateShipping = (): boolean => {
    const errors: Partial<Record<keyof ShippingInfo, string>> = {};
    if (!shipping.firstName.trim()) errors.firstName = "Required";
    if (!shipping.lastName.trim()) errors.lastName = "Required";
    if (!shipping.email.trim()) errors.email = "Required";
    if (!shipping.phone.trim()) errors.phone = "Required";
    if (!shipping.address.trim()) errors.address = "Required";
    if (!shipping.city.trim()) errors.city = "Required";
    if (!shipping.state.trim()) errors.state = "Required";
    if (!shipping.zip.trim()) errors.zip = "Required";
    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleShippingContinue = () => {
    if (validateShipping()) {
      setCurrentStep(2);
    }
  };

  const shippingInputClass = (field: keyof ShippingInfo) =>
    shippingErrors[field] ? "border-destructive" : "";

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

      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">Your cart is empty.</p>
          <Button asChild>
            <Link href="/products">Continue Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Shipping Information</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={shipping.firstName}
                      onChange={(e) => updateShipping("firstName", e.target.value)}
                      className={shippingInputClass("firstName")}
                    />
                    {shippingErrors.firstName && (
                      <p className="text-xs text-destructive">{shippingErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={shipping.lastName}
                      onChange={(e) => updateShipping("lastName", e.target.value)}
                      className={shippingInputClass("lastName")}
                    />
                    {shippingErrors.lastName && (
                      <p className="text-xs text-destructive">{shippingErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={shipping.email}
                    onChange={(e) => updateShipping("email", e.target.value)}
                    className={shippingInputClass("email")}
                  />
                  {shippingErrors.email && (
                    <p className="text-xs text-destructive">{shippingErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={shipping.phone}
                    onChange={(e) => updateShipping("phone", e.target.value)}
                    className={shippingInputClass("phone")}
                  />
                  {shippingErrors.phone && (
                    <p className="text-xs text-destructive">{shippingErrors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={shipping.address}
                    onChange={(e) => updateShipping("address", e.target.value)}
                    className={shippingInputClass("address")}
                  />
                  {shippingErrors.address && (
                    <p className="text-xs text-destructive">{shippingErrors.address}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address2">Apartment, suite, etc. (optional)</Label>
                  <Input
                    id="address2"
                    placeholder="Apt 4B"
                    value={shipping.address2}
                    onChange={(e) => updateShipping("address2", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="San Francisco"
                      value={shipping.city}
                      onChange={(e) => updateShipping("city", e.target.value)}
                      className={shippingInputClass("city")}
                    />
                    {shippingErrors.city && (
                      <p className="text-xs text-destructive">{shippingErrors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="CA"
                      value={shipping.state}
                      onChange={(e) => updateShipping("state", e.target.value)}
                      className={shippingInputClass("state")}
                    />
                    {shippingErrors.state && (
                      <p className="text-xs text-destructive">{shippingErrors.state}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      placeholder="94102"
                      value={shipping.zip}
                      onChange={(e) => updateShipping("zip", e.target.value)}
                      className={shippingInputClass("zip")}
                    />
                    {shippingErrors.zip && (
                      <p className="text-xs text-destructive">{shippingErrors.zip}</p>
                    )}
                  </div>
                </div>

                <Button onClick={handleShippingContinue} className="w-full">
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
                    {shipping.firstName} {shipping.lastName}
                    <br />
                    {shipping.address}
                    {shipping.address2 && <>, {shipping.address2}</>}
                    <br />
                    {shipping.city}, {shipping.state} {shipping.zip}
                    <br />
                    {shipping.email}
                    <br />
                    {shipping.phone}
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
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="relative w-16 h-16 rounded overflow-hidden bg-muted shrink-0">
                          <Image
                            src={item.image || ""}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    size="lg"
                    disabled={isPlacingOrder}
                    onClick={async () => {
                      setIsPlacingOrder(true);
                      setOrderError(null);
                      try {
                        const shippingAddress = [
                          shipping.firstName,
                          shipping.lastName,
                          shipping.address,
                          shipping.address2,
                          `${shipping.city}, ${shipping.state} ${shipping.zip}`,
                          shipping.phone,
                        ]
                          .filter(Boolean)
                          .join(", ");

                        await api.post("/api/orders", {
                          shippingAddress,
                          billingAddress: shippingAddress,
                          paymentMethod: paymentMethod.toUpperCase(),
                          notes: null,
                        });
                        clearCart();
                        router.push("/orders?created=true");
                      } catch (err: unknown) {
                        const msg =
                          err instanceof Error ? err.message : "Failed to place order";
                        if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
                          setOrderError(
                            "Unable to connect to the server. Your order could not be placed at this time."
                          );
                        } else if (msg.includes("not authenticated")) {
                          setOrderError(
                            "Please sign in to place an order."
                          );
                        } else {
                          setOrderError(msg);
                        }
                      } finally {
                        setIsPlacingOrder(false);
                      }
                    }}
                  >
                    {isPlacingOrder ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Place Order - {formatPrice(total)}
                      </>
                    )}
                  </Button>
                </div>
                {orderError && (
                  <p className="text-sm text-destructive text-center">{orderError}</p>
                )}
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
                      <Image
                        src={item.image || ""}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
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

              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Secure 256-bit SSL encryption</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>Free shipping on orders over {formatPrice(FREE_SHIPPING_THRESHOLD)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
