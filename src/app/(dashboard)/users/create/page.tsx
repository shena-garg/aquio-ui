"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usersService } from "@/services/users";
import { rolesService } from "@/services/roles";

interface FormErrors {
  name?: string;
  phoneNumber?: string;
  email?: string;
  roleId?: string;
}

export default function CreateUserPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => rolesService.list().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const selectedRole = roles?.find((r) => r._id === roleId);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!phoneNumber.trim()) errs.phoneNumber = "Mobile number is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Enter a valid email address";
    if (!roleId) errs.roleId = "Role is required";
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await usersService.create({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        countryCode: "+91",
        email: email.trim(),
        roleId,
      });
      toast.success("User created successfully");
      router.push("/users");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create user";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const accessOrder = { full: 0, custom: 1, none: 2 } as const;
  const visiblePermissions = selectedRole
    ? [...selectedRole.permissionsPerEntity].sort(
        (a, b) => (accessOrder[a.access] ?? 2) - (accessOrder[b.access] ?? 2)
      )
    : [];

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-6">
        <button
          onClick={() => router.push("/users")}
          className="mr-3 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
          aria-label="Back to users"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[18px] font-semibold text-[#111827]">
          Create User
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-[#f9fafb]">
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-6 p-6">
          {/* ── Left column: Form ── */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="flex flex-col gap-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full border ${
                    errors.name ? "border-[#dc2626]" : "border-gray-300"
                  } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
                />
                {errors.name && (
                  <p className="text-[12px] text-[#dc2626] mt-1">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex h-[38px] items-center rounded-md border border-gray-300 bg-[#f9fafb] px-3 text-sm text-[#6b7280]">
                    +91
                  </div>
                  <input
                    type="text"
                    placeholder="Enter mobile number"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPhoneNumber(val);
                    }}
                    className={`flex-1 border ${
                      errors.phoneNumber
                        ? "border-[#dc2626]"
                        : "border-gray-300"
                    } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="text-[12px] text-[#dc2626] mt-1">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full border ${
                    errors.email ? "border-[#dc2626]" : "border-gray-300"
                  } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
                />
                {errors.email && (
                  <p className="text-[12px] text-[#dc2626] mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Assign Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Assign Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className={`w-full border ${
                    errors.roleId ? "border-[#dc2626]" : "border-gray-300"
                  } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] bg-white`}
                >
                  <option value="">Select a role</option>
                  {(roles ?? []).map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {errors.roleId && (
                  <p className="text-[12px] text-[#dc2626] mt-1">
                    {errors.roleId}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex justify-end gap-2 border-t border-gray-200 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/users")}
                disabled={isSubmitting}
                className="border-gray-200 text-gray-600 hover:text-[#0F1720]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
              >
                {isSubmitting && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Create User
              </Button>
            </div>
          </div>

          {/* ── Right column: Permissions panel ── */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-5 py-5 h-fit">
            <h3 className="text-sm font-semibold text-[#111827] mb-4">
              Role Permissions
            </h3>

            {!selectedRole ? (
              <p className="text-sm text-gray-400">
                Select a role to preview permissions
              </p>
            ) : visiblePermissions.length === 0 ? (
              <p className="text-sm text-gray-400">
                No permissions defined for this role
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Access
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePermissions.map((perm) => (
                    <tr
                      key={perm.entity}
                      className={`border-b border-gray-100 last:border-0 ${
                        perm.access === "full"
                          ? "bg-[#f0fdfa]"
                          : perm.access === "none"
                            ? "bg-[#fef2f2]"
                            : "bg-[#fffbeb]"
                      }`}
                    >
                      <td className="py-2.5 px-3 text-[13px] text-[#111827] capitalize">
                        {perm.entity.replace(/-/g, " ")}
                      </td>
                      <td className="py-2.5 px-3">
                        {perm.access === "full" ? (
                          <span className="text-[13px] font-medium text-[#0d9488]">
                            Full
                          </span>
                        ) : perm.access === "none" ? (
                          <span className="text-[13px] font-medium text-[#dc2626]">
                            None
                          </span>
                        ) : (
                          <div>
                            <span className="text-[13px] font-medium text-amber-600">
                              Custom
                            </span>
                            {perm.permissions.length > 0 && (
                              <div className="mt-0.5 flex flex-col gap-0.5">
                                {perm.permissions.map((p) => (
                                  <span
                                    key={p}
                                    className="text-[11px] text-gray-500"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
