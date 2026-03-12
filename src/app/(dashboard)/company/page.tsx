"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { organizationService } from "@/services/organization";

interface FormErrors {
  name?: string;
  email?: string;
  taxNumber?: string;
  phoneNumber?: string;
}

export default function CompanyPage() {
  const router = useRouter();

  const { data: org, isLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: () => organizationService.get().then((r) => r.data),
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
          Company Information
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-[#f9fafb]">
        <div className="mx-auto max-w-[600px] p-6">
          <CompanyForm org={org} />
        </div>
      </div>
    </div>
  );
}

// ── Company Form ────────────────────────────────────────────────────────────

interface OrgData {
  name?: string;
  email?: string;
  taxNumber?: string;
  phoneNumber?: string;
  countryCode?: string;
}

function CompanyForm({ org }: { org: OrgData | undefined }) {
  const [name, setName] = useState(org?.name ?? "");
  const [email, setEmail] = useState(org?.email ?? "");
  const [taxNumber, setTaxNumber] = useState(org?.taxNumber ?? "");
  const [phoneNumber, setPhoneNumber] = useState(org?.phoneNumber ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  async function handleSave() {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = "Company name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Enter a valid email address";
    if (!taxNumber.trim()) errs.taxNumber = "Tax number is required";
    if (!phoneNumber.trim()) errs.phoneNumber = "Contact number is required";
    else if (!/^\d{10}$/.test(phoneNumber.trim()))
      errs.phoneNumber = "Enter a valid 10-digit contact number";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await organizationService.update({
        name: name.trim(),
        email: email.trim(),
        taxNumber: taxNumber.trim(),
        phoneNumber: phoneNumber.trim(),
        countryCode: "91",
      });
      toast.success("Company information updated successfully");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update company information";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
      <div className="flex flex-col gap-5">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter company name"
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

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            placeholder="Enter company email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full border ${
              errors.email ? "border-[#dc2626]" : "border-gray-300"
            } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
          />
          {errors.email && (
            <p className="text-[12px] text-[#dc2626] mt-1">{errors.email}</p>
          )}
        </div>

        {/* Tax Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tax Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter tax number"
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value)}
            className={`w-full border ${
              errors.taxNumber ? "border-[#dc2626]" : "border-gray-300"
            } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
          />
          {errors.taxNumber && (
            <p className="text-[12px] text-[#dc2626] mt-1">{errors.taxNumber}</p>
          )}
        </div>

        {/* Contact Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Contact Number <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <span className="flex items-center rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
              +91
            </span>
            <input
              type="text"
              placeholder="Enter contact number"
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
