"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="container py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
        <p className="text-muted-foreground mb-8">
          Sign in to access your account, track orders, and manage your
          wishlist.
        </p>

        <div className="space-y-4">
          <Button className="w-full" size="lg">
            Sign In with Email
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" size="lg">
            Sign In with Google
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/products" className="text-primary hover:underline">
            Start shopping
          </Link>
        </p>
      </div>
    </div>
  );
}
