"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetInput = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(data: ResetInput) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password: data.password }),
        }
      );
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          result.error || "This reset link is invalid or has expired. Request a new one."
        );
        return;
      }

      setDone(true);
    } catch {
      setError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const inputClasses =
    "h-11 w-full rounded-xl border border-input bg-background/50 px-4 pl-11 pr-11 text-sm transition-all duration-200 placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none hover:border-primary/40";

  if (!token) {
    return (
      <>
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Invalid reset link</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            This page needs a valid reset token. Request a new link and open it
            from your email.
          </p>
        </div>
        <Button asChild className="w-full h-11 rounded-xl text-sm font-medium">
          <Link href="/forgot-password">
            Request a new link
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Link
          href="/sign-in"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </>
    );
  }

  if (done) {
    return (
      <>
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Password updated</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Your password has been changed and any other reset links are now
            invalid. Sign in with your new password.
          </p>
        </div>
        <Button asChild className="w-full h-11 rounded-xl text-sm font-medium">
          <Link href="/sign-in">
            Continue to sign in
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Use at least 8 characters, including an uppercase letter and a number.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            New password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              className={inputClasses}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive pl-1">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm new password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              className={inputClasses}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              aria-label={showConfirm ? "Hide password" : "Show password"}
              aria-pressed={showConfirm}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive pl-1">
              {errors.confirmPassword.message}
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
              Update password
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="lg:hidden flex justify-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Ponnaloy</span>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-10" role="status" aria-label="Loading">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
