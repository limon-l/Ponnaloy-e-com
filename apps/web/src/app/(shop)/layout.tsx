import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { CartSync } from "@/components/cart-sync";

export const metadata: Metadata = {
  title: {
    default: "Ponnaloy - Premium Shopping Experience",
    template: "%s | Ponnaloy",
  },
  description:
    "Discover curated products with exceptional quality, fast shipping, and a seamless shopping experience.",
  keywords: ["e-commerce", "online shopping", "premium products", "fast shipping"],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Ponnaloy",
    title: "Ponnaloy - Premium Shopping Experience",
    description:
      "Discover curated products with exceptional quality, fast shipping, and a seamless shopping experience.",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <CartSync />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
