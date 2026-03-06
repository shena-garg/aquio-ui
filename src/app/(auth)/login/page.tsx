"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const loginResponse = await authService.login(values);
      localStorage.setItem("accessToken", loginResponse.data.accessToken);
      const userResponse = await authService.me();
      localStorage.setItem("user", JSON.stringify(userResponse.data));
      router.push("/dashboard");
    } catch {
      toast.error("Login failed. Please check your credentials and try again.");
    }
  }

  const isDisabled = isSubmitting || !isDirty || !isValid;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F7F8]">
      <div className="w-full max-w-[520px] flex flex-col items-center gap-7">

        {/* Card */}
        <div className="w-full bg-white rounded-xl shadow-md border border-gray-200">

          {/* Header */}
          <div className="flex items-center justify-center gap-3 px-10 pt-8 pb-6">
            <div className="w-8 h-8 flex-shrink-0">
              <img src="/logo.png" alt="Aquio logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-[#0F1720] text-2xl font-extrabold tracking-[0.06em]">
              Aquio
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-10 py-8 flex flex-col gap-6">

            {/* Email field */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="email"
                className="text-[11px] font-light uppercase tracking-[0.1em] text-gray-500"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                {...register("email")}
                aria-invalid={!!errors.email}
                className="h-[46px] rounded-md border border-gray-200 bg-white text-sm text-[#0F1720] placeholder:text-gray-400 shadow-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/25 focus-visible:border-[#0d9488] aria-invalid:border-red-400 aria-invalid:focus-visible:ring-red-200"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="password"
                className="text-[11px] font-light uppercase tracking-[0.1em] text-gray-500"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                {...register("password")}
                aria-invalid={!!errors.password}
                className="h-[46px] rounded-md border border-gray-200 bg-white text-sm text-[#0F1720] placeholder:text-gray-400 shadow-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/25 focus-visible:border-[#0d9488] aria-invalid:border-red-400 aria-invalid:focus-visible:ring-red-200"
              />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-[12px] font-medium text-[#0d9488] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isDisabled}
              className="w-full h-12 rounded-md !bg-[#0d9488] hover:!bg-[#0f766e] text-white text-sm font-semibold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in…
                </>
              ) : (
                "Log In"
              )}
            </Button>

            {/* Sign up link */}
            <p className="text-center text-[13px] text-gray-500">
              New to Aquio?{" "}
              <Link href="/signup" className="text-[#0d9488] font-medium hover:underline">
                Sign up
              </Link>
            </p>

          </form>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-gray-400">
          © 2024 Aquio Inc. Enterprise Platform.
        </p>
      </div>
    </div>
  );
}
