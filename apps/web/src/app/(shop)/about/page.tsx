import { Shield, Heart, Star, Users } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">About Ponnaloy</h1>
        <p className="text-muted-foreground mb-8">
          Your premium destination for quality products and exceptional shopping
          experience.
        </p>

        <div className="prose prose-sm max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3">Our Story</h2>
            <p className="text-muted-foreground">
              Ponnaloy was founded with a simple mission: to make premium
              quality products accessible to everyone. We believe that shopping
              should be a delightful experience, from browsing our carefully
              curated collections to receiving your order at your doorstep.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Our Values</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Quality First</h3>
                  <p className="text-sm text-muted-foreground">
                    Every product is vetted for quality and authenticity.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Heart className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Customer Love</h3>
                  <p className="text-sm text-muted-foreground">
                    Your satisfaction is our top priority.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Star className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Curated Selection</h3>
                  <p className="text-sm text-muted-foreground">
                    Handpicked products that meet our standards.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Community</h3>
                  <p className="text-sm text-muted-foreground">
                    Building connections through great products.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Our Promise</h2>
            <p className="text-muted-foreground">
              We stand behind every product we sell. With secure checkout, fast
              shipping, and hassle-free returns, we&apos;re committed to making
              your shopping experience seamless from start to finish.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
