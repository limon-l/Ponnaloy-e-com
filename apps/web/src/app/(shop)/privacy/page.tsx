export default function PrivacyPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">
          Last updated: January 1, 2026
        </p>

        <div className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold">Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly, such as when you
              create an account, make a purchase, or contact us. This may include
              your name, email address, shipping address, and payment
              information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">How We Use Your Information</h2>
            <p className="text-muted-foreground">
              We use your information to process transactions, send order
              updates, provide customer support, improve our services, and
              communicate with you about products and promotions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Information Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell your personal information. We may share your
              information with trusted service providers who assist us in
              operating our website and conducting our business, subject to
              confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate security measures to protect your personal
              information. However, no method of transmission over the Internet
              is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Cookies</h2>
            <p className="text-muted-foreground">
              We use cookies to enhance your experience, remember your
              preferences, and analyze site traffic. You can control cookie
              settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to access, correct, or delete your personal
              information. You can manage most of your information through your
              account settings, or contact us for assistance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy, please contact us
              at privacy@ponnaloy.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
