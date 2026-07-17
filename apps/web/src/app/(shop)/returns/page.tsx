export default function ReturnsPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Returns &amp; Exchanges</h1>
        <p className="text-muted-foreground mb-8">
          Easy returns within 30 days of delivery.
        </p>

        <div className="space-y-8">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3">Return Policy</h2>
            <p className="text-muted-foreground mb-4">
              We want you to be completely satisfied with your purchase. If
              you&apos;re not happy with your order, you can return most items
              within 30 days of delivery for a full refund or exchange.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Items must be in original condition with tags attached</li>
              <li>Items must not be worn, washed, or altered</li>
              <li>Original packaging is preferred but not required</li>
              <li>Proof of purchase is required</li>
            </ul>
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3">How to Start a Return</h2>
            <ol className="list-decimal list-inside text-muted-foreground space-y-2">
              <li>Go to your Orders page in your account</li>
              <li>Select the order containing the item you want to return</li>
              <li>Click &quot;Return Item&quot; and follow the prompts</li>
              <li>Print the prepaid shipping label</li>
              <li>Pack the item securely and drop it off at the carrier</li>
            </ol>
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3">Refund Timeline</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                Refunds are processed within 3-5 business days of receiving the
                return
              </li>
              <li>
                Credit card refunds appear on your statement within 5-10 business
                days
              </li>
              <li>
                Digital wallet refunds are typically instant once processed
              </li>
            </ul>
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3">Non-Returnable Items</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Personalized or custom-made items</li>
              <li>Gift cards</li>
              <li>Perishable goods</li>
              <li>Intimate or sanitary products</li>
              <li>Hazardous materials</li>
            </ul>
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3">Damaged or Defective Items</h2>
            <p className="text-muted-foreground">
              If you receive a damaged or defective item, contact us within 48
              hours of delivery. We&apos;ll arrange a free return and send a
              replacement or issue a full refund.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
