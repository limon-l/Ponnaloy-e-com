"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { signInSchema, type SignInInput } from "@/lib/validations/auth";
import { useAuth } from "@/contexts/auth-context";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const justCreated = searchParams.get("created") === "true";
  const redirectTo = searchParams.get("redirect") || "/";
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const watchedRememberMe = watch("rememberMe");

  async function onSubmit(data: SignInInput) {
    setIsLoading(true);
    setError(null);

    const result = await signIn(data.email, data.password);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

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

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Sign in to your account to continue shopping and track your orders.
        </p>
      </div>

      {/* Success Alert */}
      {justCreated && (
        <div className="rounded-xl bg-success/10 border border-success/20 px-4 py-3 text-sm text-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Account created successfully. Please sign in.
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            icon={<Mail className="h-4 w-4" />}
            error={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            icon={<Lock className="h-4 w-4" />}
            error={!!errors.password}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="rememberMe"
            checked={watchedRememberMe}
            onCheckedChange={(checked) =>
              setValue("rememberMe", checked === true)
            }
          />
          <label
            htmlFor="rememberMe"
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            Remember me for 30 days
          </label>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          className="w-full"
          size="lg"
        >
          Sign In
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>



      {/* Sign Up Link */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
