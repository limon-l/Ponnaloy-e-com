import { Truck, Clock, Globe, Package } from "lucide-react";

export default function ShippingPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Shipping Information</h1>
        <p className="text-muted-foreground mb-8">
          Everything you need to know about shipping and delivery.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <div className="flex items-start gap-4 p-6 border rounded-lg">
            <Truck className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Standard Shipping</h3>
              <p className="text-muted-foreground text-sm">
                5-7 business days
              </p>
              <p className="text-sm mt-1">Free on orders over $150</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 border rounded-lg">
            <Clock className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Express Shipping</h3>
              <p className="text-muted-foreground text-sm">
                2-3 business days
              </p>
              <p className="text-sm mt-1">$9.99 flat rate</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 border rounded-lg">
            <Package className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Next Day Delivery</h3>
              <p className="text-muted-foreground text-sm">
                Order before 2pm EST
              </p>
              <p className="text-sm mt-1">$14.99 flat rate</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 border rounded-lg">
            <Globe className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">International</h3>
              <p className="text-muted-foreground text-sm">
                10-15 business days
              </p>
              <p className="text-sm mt-1">Rates calculated at checkout</p>
            </div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-6">
          <h2 className="text-xl font-bold">Processing Time</h2>
          <p className="text-muted-foreground">
            Orders are processed within 1-2 business days. Orders placed on
            weekends or holidays will be processed the next business day.
          </p>

          <h2 className="text-xl font-bold">Order Tracking</h2>
          <p className="text-muted-foreground">
            Once your order ships, you&apos;ll receive a confirmation email with
            a tracking number. You can track your package in real-time from your
            account dashboard.
          </p>

          <h2 className="text-xl font-bold">Shipping Restrictions</h2>
          <p className="text-muted-foreground">
            Some items may have shipping restrictions due to size, weight, or
            regulatory requirements. These restrictions will be noted on the
            product page.
          </p>
        </div>
      </div>
    </div>
  );
}
