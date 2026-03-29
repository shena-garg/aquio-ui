"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export function VerificationBanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  if (!user || user.accountVerified !== false) return null;

  async function handleVerify() {
    if (!code || code.length !== 6 || isVerifying) return;
    setIsVerifying(true);
    try {
      const response = await authService.verifyCode(code);
      const updatedUser = { ...user!, accountVerified: true, ...response.data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Email verified successfully!");
      setShowModal(false);
      setCode("");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Verification failed";
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (isResending) return;
    setIsResending(true);
    try {
      await authService.resendVerificationCode();
      toast.success("Verification code sent to your email");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to resend code";
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-center gap-3 text-sm text-amber-800">
        <span>
          Please verify your email address. Check your inbox for a 6-digit code.
        </span>
        <button
          onClick={() => setShowModal(true)}
          className="font-semibold text-amber-900 underline hover:no-underline"
        >
          Verify now
        </button>
        <button
          onClick={handleResend}
          disabled={isResending}
          className="font-medium text-amber-700 underline hover:no-underline disabled:opacity-50"
        >
          {isResending ? "Sending…" : "Resend email"}
        </button>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[400px] p-0 gap-0"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <DialogTitle className="text-base font-semibold text-gray-900">
              Verify Your Email
            </DialogTitle>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-6 flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Enter the 6-digit code sent to{" "}
              <span className="font-medium text-gray-900">{user.email}</span>
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] tracking-[0.3em] text-center font-mono text-lg"
            />

            <Button
              onClick={handleVerify}
              disabled={code.length !== 6 || isVerifying}
              className="w-full h-10 !bg-[#0d9488] hover:!bg-[#0f766e] text-white text-sm font-semibold disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Verify"
              )}
            </Button>

            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-sm text-[#0d9488] font-medium hover:underline disabled:opacity-50"
            >
              {isResending ? "Sending…" : "Resend verification code"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
