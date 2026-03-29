"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth";

/* ── Step 1: request code ── */

const emailSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .refine(
      (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Enter a valid email address"
    ),
});

type EmailFormValues = z.infer<typeof emailSchema>;

/* ── Step 2: verify & reset ── */

const resetSchema = z
  .object({
    code: z
      .string()
      .min(1, "Code is required")
      .length(6, "Code must be 6 digits"),
    newPassword: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ── Step 1 form ── */
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    mode: "onChange",
  });

  async function handleEmailSubmit(values: EmailFormValues) {
    try {
      await authService.forgotPassword(values.email);
      setEmail(values.email);
      setStep(2);
      toast.success("Verification code sent to your email");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to send reset code";
      toast.error(message);
    }
  }

  /* ── Step 2 form ── */
  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    mode: "onChange",
  });

  async function handleResetSubmit(values: ResetFormValues) {
    try {
      await authService.setPassword(email, values.code, values.newPassword);
      toast.success("Password reset successfully");
      router.push("/login");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to reset password";
      toast.error(message);
    }
  }

  function handleBack() {
    setStep(1);
    resetForm.reset();
  }

  const emailDisabled =
    emailForm.formState.isSubmitting ||
    !emailForm.formState.isDirty ||
    !emailForm.formState.isValid;

  const resetDisabled =
    resetForm.formState.isSubmitting || !resetForm.formState.isValid;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 sm:justify-center sm:pt-0 bg-[#F6F7F8] px-4 sm:px-6">
      <div className="w-full max-w-[520px] flex flex-col items-center gap-7">
        {/* Card */}
        <div className="w-full bg-white rounded-xl shadow-md border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 px-6 sm:px-10 pt-8 pb-6">
            <div className="w-8 h-8 flex-shrink-0">
              <img
                src="/logo.png"
                alt="Aquio logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-[#0F1720] text-2xl font-extrabold tracking-[0.06em]">
              Aquio
            </span>
          </div>

          {step === 1 ? (
            /* ── Step 1: Email ── */
            <form
              onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
              className="px-6 sm:px-10 py-8 flex flex-col gap-6"
            >
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Forgot your password?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your email and we&apos;ll send you a verification code
                </p>
              </div>

              {/* Email field */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  {...emailForm.register("email")}
                  className={`w-full border ${
                    emailForm.formState.errors.email
                      ? "border-[#dc2626]"
                      : "border-gray-300"
                  } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-[12px] text-[#dc2626] mt-1">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={emailDisabled}
                className="w-full h-12 rounded-md !bg-[#0d9488] hover:!bg-[#0f766e] text-white text-sm font-semibold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>

              {/* Back to login */}
              <p className="text-center text-[13px] text-gray-500">
                <Link
                  href="/login"
                  className="text-[#0d9488] font-medium hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  Back to login
                </Link>
              </p>
            </form>
          ) : (
            /* ── Step 2: Code + New Password ── */
            <form
              onSubmit={resetForm.handleSubmit(handleResetSubmit)}
              className="px-6 sm:px-10 py-8 flex flex-col gap-6"
            >
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Reset your password
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter the code sent to{" "}
                  <span className="font-medium text-gray-700">{email}</span>
                </p>
              </div>

              {/* Email (read-only) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-500 outline-none cursor-not-allowed"
                />
              </div>

              {/* Verification code */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="code"
                  className="text-sm font-medium text-gray-700"
                >
                  Verification Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  {...resetForm.register("code")}
                  className={`w-full border ${
                    resetForm.formState.errors.code
                      ? "border-[#dc2626]"
                      : "border-gray-300"
                  } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] tracking-[0.3em] text-center font-mono`}
                />
                {resetForm.formState.errors.code && (
                  <p className="text-[12px] text-[#dc2626] mt-1">
                    {resetForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              {/* New password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="newPassword"
                  className="text-sm font-medium text-gray-700"
                >
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    {...resetForm.register("newPassword")}
                    className={`w-full border ${
                      resetForm.formState.errors.newPassword
                        ? "border-[#dc2626]"
                        : "border-gray-300"
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
                {resetForm.formState.errors.newPassword && (
                  <p className="text-[12px] text-[#dc2626] mt-1">
                    {resetForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-gray-700"
                >
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••••••"
                    {...resetForm.register("confirmPassword")}
                    className={`w-full border ${
                      resetForm.formState.errors.confirmPassword
                        ? "border-[#dc2626]"
                        : "border-gray-300"
                    } rounded-md px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-[12px] text-[#dc2626] mt-1">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={resetDisabled}
                className="w-full h-12 rounded-md !bg-[#0d9488] hover:!bg-[#0f766e] text-white text-sm font-semibold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>

              {/* Back link */}
              <p className="text-center text-[13px] text-gray-500">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-[#0d9488] font-medium hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
              </p>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-[11px] text-gray-400">
          © 2024 Aquio Inc. Enterprise Platform.
        </p>
      </div>
    </div>
  );
}
