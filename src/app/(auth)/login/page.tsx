"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address";
    if (!password) errs.password = "Password is required";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0 || isSubmitting) return;

    setLoginError(null);
    setIsSubmitting(true);
    try {
      const loginResponse = await authService.login({ email: email.trim(), password });
      localStorage.setItem("accessToken", loginResponse.data.accessToken);
      if (loginResponse.data.refreshToken) {
        localStorage.setItem("refreshToken", loginResponse.data.refreshToken);
      }
      const userResponse = await authService.me();
      localStorage.setItem("user", JSON.stringify(userResponse.data));
      router.push("/dashboard");
    } catch {
      setLoginError("Incorrect email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 sm:justify-center sm:pt-0 bg-[#F6F7F8] px-4 sm:px-6">
      <div className="w-full max-w-[520px] flex flex-col items-center gap-7">

        {/* Card */}
        <div className="w-full bg-white rounded-xl shadow-md border border-gray-200">

          {/* Header */}
          <div className="flex items-center justify-center gap-3 px-6 sm:px-10 pt-8 pb-6">
            <div className="w-8 h-8 flex-shrink-0">
              <img src="/logo.png" alt="Aquio logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-[#0F1720] text-2xl font-extrabold tracking-[0.06em]">
              Aquio
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 sm:px-10 py-8 flex flex-col gap-6">

            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full border ${
                  fieldErrors.email ? "border-[#dc2626]" : "border-gray-300"
                } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
              />
              {fieldErrors.email && (
                <p className="text-[12px] text-[#dc2626] mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full border ${
                    fieldErrors.password ? "border-[#dc2626]" : "border-gray-300"
                  } rounded-md px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[12px] text-[#dc2626] mt-1">{fieldErrors.password}</p>
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

            {/* Login error */}
            {loginError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {loginError}
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isSubmitting}
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
          © 2025 Aquio Inc. Enterprise Platform.
        </p>
      </div>
    </div>
  );
}
