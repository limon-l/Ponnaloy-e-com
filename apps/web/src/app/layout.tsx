import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Ponnaloy - Premium Shopping Experience",
    template: "%s | Ponnaloy",
  },
  description:
    "Discover premium products at Ponnaloy. Shop electronics, fashion, home goods, and more with fast shipping and secure checkout.",
  keywords: ["e-commerce", "online shopping", "premium products"],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Ponnaloy",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
