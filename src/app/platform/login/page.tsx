"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { platformService } from "@/services/platform";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await platformService.login({ email: email.trim(), password });
      localStorage.setItem("platformAccessToken", res.data.accessToken);
      localStorage.setItem("platformRefreshToken", res.data.refreshToken);
      localStorage.setItem("platformAdmin", JSON.stringify(res.data.admin));
      router.push("/platform/orgs");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-50 px-4">
      <div className="w-full max-w-[420px]">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8">
            <img src="/logo.png" alt="Aquio" className="w-full h-full object-contain" />
          </div>
          <span className="text-[#0F1720] text-2xl font-extrabold tracking-[0.06em]">Aquio</span>
          <span className="ml-1 text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
            Platform
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-md border border-indigo-100 p-8">
          <h1 className="text-lg font-semibold text-gray-900 mb-6">Platform Admin Login</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@aquio.ai"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
