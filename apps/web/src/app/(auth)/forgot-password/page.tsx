"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email }),
        }
      );

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || "Something went wrong. Please try again.");
        return;
      }

      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  }

  const inputClasses =
    "h-11 w-full rounded-xl border border-input bg-background/50 px-4 pl-11 text-sm transition-all duration-200 placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none hover:border-primary/40";

  return (
    <div className="space-y-8">
      {/* Mobile Logo */}
      <div className="lg:hidden flex justify-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Ponnaloy</span>
        </Link>
      </div>

      {sent ? (
        <>
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              We sent a password reset link to your email address. Please check
              your inbox and follow the instructions.
            </p>
          </div>
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl text-sm font-medium"
              onClick={() => setSent(false)}
            >
              Didn&apos;t receive the email? Try again
            </Button>
            <Link
              href="/sign-in"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Forgot your password?
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Enter your email address and we&apos;ll send you a link to reset
              your password.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputClasses}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive pl-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Send Reset Link
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <Link
            href="/sign-in"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}
