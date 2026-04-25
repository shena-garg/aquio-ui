"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: "Weak", color: "#dc2626" };
  if (score <= 2) return { score, label: "Fair", color: "#f59e0b" };
  if (score <= 3) return { score, label: "Good", color: "#3b82f6" };
  return { score, label: "Strong", color: "#0d9488" };
}

const signupSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  name: z.string().min(1, "Name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Enter a valid email address"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => /^[0-9]{10}$/.test(val), "Enter a valid 10-digit phone number"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
  });

  async function onSubmit(values: SignupFormValues) {
    try {
      const response = await authService.signup({
        name: values.name,
        email: values.email,
        password: values.password,
        companyName: values.companyName,
        phoneNumber: values.phone,
      });
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      toast.success("Account created successfully!");
      router.push("/onboarding");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Sign up failed. Please try again.";
      toast.error(message);
    }
  }

  const isDisabled = isSubmitting || !isDirty || !isValid;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-12 sm:justify-center sm:pt-0 bg-[#F6F7F8] px-4 sm:px-6">
      <div className="w-full max-w-[520px] flex flex-col items-center gap-7">

        {/* Card */}
        <div className="w-full bg-white rounded-xl shadow-md border border-gray-200">

          {/* Header */}
          <div className="flex items-center justify-center gap-3 px-6 sm:px-10 pt-8 pb-4">
            <div className="w-8 h-8 flex-shrink-0">
              <img src="/logo.png" alt="Aquio logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-[#0F1720] text-2xl font-extrabold tracking-[0.06em]">
              Aquio
            </span>
          </div>

          <p className="text-center text-[14px] text-gray-500 px-6 sm:px-10 pb-6">
            Create your account to get started
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 sm:px-10 pb-8 flex flex-col gap-5">

            {/* Company Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                placeholder="Your company name"
                {...register("companyName")}
                className={`w-full border ${
                  errors.companyName ? "border-[#dc2626]" : "border-gray-300"
                } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
              />
              {errors.companyName && (
                <p className="text-[12px] text-[#dc2626]">{errors.companyName.message}</p>
              )}
            </div>

            {/* Name + Phone — side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Full name"
                  {...register("name")}
                  className={`w-full border ${
                    errors.name ? "border-[#dc2626]" : "border-gray-300"
                  } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
                />
                {errors.name && (
                  <p className="text-[12px] text-[#dc2626]">{errors.name.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit number"
                  {...register("phone")}
                  className={`w-full border ${
                    errors.phone ? "border-[#dc2626]" : "border-gray-300"
                  } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
                />
                {errors.phone && (
                  <p className="text-[12px] text-[#dc2626]">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                {...register("email")}
                className={`w-full border ${
                  errors.email ? "border-[#dc2626]" : "border-gray-300"
                } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
              />
              {errors.email && (
                <p className="text-[12px] text-[#dc2626]">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  {...register("password")}
                  onChange={(e) => {
                    register("password").onChange(e);
                    setPasswordValue(e.target.value);
                  }}
                  className={`w-full border ${
                    errors.password ? "border-[#dc2626]" : "border-gray-300"
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
              {errors.password && (
                <p className="text-[12px] text-[#dc2626]">{errors.password.message}</p>
              )}

              {/* Password strength indicator */}
              {passwordValue.length > 0 && (() => {
                const { score, label, color } = getPasswordStrength(passwordValue);
                const checks = [
                  { label: "At least 8 characters", met: passwordValue.length >= 8 },
                  { label: "Uppercase letter", met: /[A-Z]/.test(passwordValue) },
                  { label: "Number", met: /[0-9]/.test(passwordValue) },
                  { label: "Special character", met: /[^A-Za-z0-9]/.test(passwordValue) },
                ];
                return (
                  <div className="mt-1 space-y-2">
                    {/* Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{ backgroundColor: score >= i ? color : "#e5e7eb" }}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
                    </div>
                    {/* Checklist */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {checks.map((c) => (
                        <div key={c.label} className="flex items-center gap-1">
                          {c.met
                            ? <Check size={11} className="text-[#0d9488] flex-shrink-0" />
                            : <X size={11} className="text-[#9ca3af] flex-shrink-0" />}
                          <span className={`text-[11px] ${c.met ? "text-[#374151]" : "text-[#9ca3af]"}`}>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isDisabled}
              className="w-full h-12 rounded-md !bg-[#0d9488] hover:!bg-[#0f766e] text-white text-sm font-semibold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </Button>

            {/* Login link */}
            <p className="text-center text-[13px] text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-[#0d9488] font-medium hover:underline">
                Log in
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
