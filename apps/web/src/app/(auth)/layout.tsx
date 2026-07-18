import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-emerald-700">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDIydi0yaDE0em0wLTRWMjhIMjJ2MmgxNHptMC00VjI0SDIydjJoMTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Ponnaloy
            </span>
          </Link>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Premium Shopping
              <br />
              <span className="text-white/80">Made for You</span>
            </h2>
            <p className="text-white/70 text-lg max-w-md leading-relaxed">
              Discover curated products with exceptional quality, fast shipping,
              and a seamless experience designed around you.
            </p>
            <div className="flex gap-8 pt-2">
              <div>
                <p className="text-2xl font-bold text-white">10K+</p>
                <p className="text-sm text-white/60">Products</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">50K+</p>
                <p className="text-sm text-white/60">Customers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">4.9</p>
                <p className="text-sm text-white/60">Rating</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/40">
            &copy; 2026 Ponnaloy. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
