"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth";

export default function ProfilePage() {
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authService.me().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-6">
        <button
          onClick={() => router.back()}
          className="mr-3 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[18px] font-semibold text-[#111827]">
          My Profile
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-[#f9fafb]">
        <div className="mx-auto max-w-[600px] p-6 flex flex-col gap-6">
          <ProfileSection user={user} />
          <ChangePasswordSection />
        </div>
      </div>
    </div>
  );
}

// ── Profile Section ─────────────────────────────────────────────────────────

interface UserData {
  name?: string;
  email?: string;
  phoneNumber?: string;
  countryCode?: string;
}

function ProfileSection({ user }: { user: UserData | undefined }) {
  const [name, setName] = useState(user?.name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phoneNumber?: string }>({});

  async function handleSave() {
    const errs: { name?: string; phoneNumber?: string } = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!phoneNumber.trim()) errs.phoneNumber = "Mobile number is required";
    else if (!/^\d{10}$/.test(phoneNumber.trim()))
      errs.phoneNumber = "Enter a valid 10-digit mobile number";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await authService.updateProfile({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        countryCode: "+91",
      });
      toast.success("Profile updated successfully");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update profile";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
      <h3 className="text-sm font-semibold text-[#111827] mb-5">Profile Information</h3>
      <div className="flex flex-col gap-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full border ${
              errors.name ? "border-[#dc2626]" : "border-gray-300"
            } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
          />
          {errors.name && (
            <p className="text-[12px] text-[#dc2626] mt-1">{errors.name}</p>
          )}
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            value={user?.email ?? ""}
            readOnly
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <span className="flex items-center rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
              +91
            </span>
            <input
              type="text"
              placeholder="Enter mobile number"
              value={
                phoneNumber.length > 5
                  ? `${phoneNumber.slice(0, 5)} ${phoneNumber.slice(5)}`
                  : phoneNumber
              }
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhoneNumber(val);
              }}
              className={`flex-1 border ${
                errors.phoneNumber ? "border-[#dc2626]" : "border-gray-300"
              } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
            />
          </div>
          {errors.phoneNumber && (
            <p className="text-[12px] text-[#dc2626] mt-1">{errors.phoneNumber}</p>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="mt-8 flex justify-end border-t border-gray-200 pt-4">
        <Button
          onClick={handleSave}
          disabled={isSubmitting}
          className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
        >
          {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// ── Change Password Section ─────────────────────────────────────────────────

function ChangePasswordSection() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    oldPassword?: string;
    newPassword?: string;
  }>({});

  async function handleChangePassword() {
    const errs: { oldPassword?: string; newPassword?: string } = {};
    if (!oldPassword) errs.oldPassword = "Current password is required";
    if (!newPassword) errs.newPassword = "New password is required";
    else if (newPassword.length < 6)
      errs.newPassword = "Password must be at least 6 characters";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await authService.changePassword({ oldPassword, newPassword });
      toast.success("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setErrors({});
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to change password";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
      <h3 className="text-sm font-semibold text-[#111827] mb-5">Change Password</h3>
      <div className="flex flex-col gap-5">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Current Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            placeholder="Enter current password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className={`w-full border ${
              errors.oldPassword ? "border-[#dc2626]" : "border-gray-300"
            } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
          />
          {errors.oldPassword && (
            <p className="text-[12px] text-[#dc2626] mt-1">{errors.oldPassword}</p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            New Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={`w-full border ${
              errors.newPassword ? "border-[#dc2626]" : "border-gray-300"
            } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
          />
          {errors.newPassword && (
            <p className="text-[12px] text-[#dc2626] mt-1">{errors.newPassword}</p>
          )}
        </div>
      </div>

      {/* Change Password button */}
      <div className="mt-8 flex justify-end border-t border-gray-200 pt-4">
        <Button
          onClick={handleChangePassword}
          disabled={isSubmitting}
          className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
        >
          {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Change Password
        </Button>
      </div>
    </div>
  );
}
