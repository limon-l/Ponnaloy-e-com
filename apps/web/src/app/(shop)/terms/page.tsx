export default function TermsPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">
          Last updated: January 1, 2026
        </p>

        <div className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold">Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Ponnaloy, you agree to be bound by these
              Terms of Service. If you do not agree, please do not use our
              services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Account Registration</h2>
            <p className="text-muted-foreground">
              You must be at least 18 years old to create an account. You are
              responsible for maintaining the confidentiality of your account
              credentials and for all activities under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Products and Pricing</h2>
            <p className="text-muted-foreground">
              We strive for accuracy in product descriptions and pricing.
              However, errors may occur. We reserve the right to correct any
              errors and to cancel orders placed at incorrect prices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Orders and Payment</h2>
            <p className="text-muted-foreground">
              By placing an order, you are making an offer to purchase. We may
              accept or decline any order. Payment must be received before order
              processing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Shipping and Delivery</h2>
            <p className="text-muted-foreground">
              Delivery times are estimates and not guaranteed. We are not liable
              for delays caused by shipping carriers or circumstances beyond our
              control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Returns and Refunds</h2>
            <p className="text-muted-foreground">
              Returns are subject to our Return Policy. Refunds are issued to
              the original payment method within the timeframe specified in our
              Returns page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content on Ponnaloy, including text, graphics, logos, and
              software, is our property or our licensors&apos; property and is
              protected by intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Ponnaloy shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of our services. Our
              total liability shall not exceed the amount paid for the
              transaction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. Continued
              use of our services after changes constitutes acceptance of the
              new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, contact us at legal@ponnaloy.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
