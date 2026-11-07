"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validation";

export function LoginForm({
  callbackUrl,
  demo = false,
}: {
  callbackUrl: string;
  demo?: boolean;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function fillDemo(role: "admin" | "staff") {
    setValue("email", `${role}@trenterprise.com`, { shouldValidate: true });
    setValue("password", role === "admin" ? "REDACTED" : "REDACTED", {
      shouldValidate: true,
    });
    toast.info(`${role === "admin" ? "Admin" : "Staff"} demo credentials filled in.`);
  }

  async function onSubmit(values: LoginInput) {
    setPending(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (!result || result.error) {
        toast.error("Invalid email or password. Please try again.");
        return;
      }
      toast.success("Welcome back to TR Enterprise.");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Could not sign in. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@trenterprise.com"
          disabled={pending}
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-xs font-medium text-red-600">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            className="pr-12"
            disabled={pending}
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password ? (
          <p className="text-xs font-medium text-red-600">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {pending ? "Signing in..." : "Sign in"}
      </Button>

      {demo ? (
        <div className="rounded-lg border border-dashed border-teal-200 bg-teal-50/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
            Demo access
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Fill a seeded account, then press Sign in.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fillDemo("admin")}>
              Use admin
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fillDemo("staff")}>
              Use staff
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
