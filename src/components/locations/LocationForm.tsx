"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { locationsService } from "@/services/locations";

interface LocationFormProps {
  mode: "create" | "edit";
  locationId?: string;
  initialValues?: {
    name: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    gstNumber: string;
    isDefault: boolean;
  };
}

interface FormErrors {
  name?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// ── Pin code lookup ──────────────────────────────────────────────────────────

// ── GST validation & state extraction ─────────────────────────────────────

const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
  "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
  "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
  "16": "Tripura", "17": "Meghalaya", "18": "Assam",
  "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
  "22": "Chattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra",
  "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa",
  "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman & Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh (New)", "38": "Ladakh",
  "97": "Other Territory",
};

const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d][A-Z\d]$/;

function validateGst(gst: string): { valid: boolean; state?: string; error?: string } {
  const cleaned = gst.trim().toUpperCase();
  if (!cleaned) return { valid: true }; // optional field
  if (cleaned.length !== 15) return { valid: false, error: "GST must be 15 characters" };
  if (!GST_REGEX.test(cleaned)) return { valid: false, error: "Invalid GST format" };

  const stateCode = cleaned.substring(0, 2);
  const stateName = GST_STATE_CODES[stateCode];
  if (!stateName) return { valid: false, error: `Invalid state code: ${stateCode}` };

  return { valid: true, state: stateName };
}

// ── Pin code lookup ──────────────────────────────────────────────────────────

async function lookupPinCode(
  pin: string
): Promise<{ city: string; state: string; country: string } | null> {
  if (!/^\d{6}$/.test(pin)) return null; // Indian pin codes are 6 digits
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    if (
      data?.[0]?.Status === "Success" &&
      data[0].PostOffice?.length > 0
    ) {
      const po = data[0].PostOffice[0];
      return {
        city: po.District ?? po.Division ?? "",
        state: po.State ?? "",
        country: po.Country ?? "India",
      };
    }
  } catch {
    // Silently fail — user can fill manually
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export function LocationForm({ mode, locationId, initialValues }: LocationFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const [name, setName] = useState(initialValues?.name ?? "");
  const [addressLine1, setAddressLine1] = useState(initialValues?.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(initialValues?.addressLine2 ?? "");
  const [city, setCity] = useState(initialValues?.city ?? "");
  const [state, setState] = useState(initialValues?.state ?? "");
  const [zip, setZip] = useState(initialValues?.zip ?? "");
  const [country, setCountry] = useState(initialValues?.country ?? "India");
  const [gstNumber, setGstNumber] = useState(initialValues?.gstNumber ?? "");
  const [isDefault, setIsDefault] = useState(initialValues?.isDefault ?? false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [gstError, setGstError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinLooking, setPinLooking] = useState(false);

  // ── Pin code auto-fill ─────────────────────────────────────────────────────

  const handleZipChange = useCallback(
    async (value: string) => {
      setZip(value);

      // Auto-lookup when 6 digits entered (Indian pin code)
      if (/^\d{6}$/.test(value)) {
        setPinLooking(true);
        const result = await lookupPinCode(value);
        setPinLooking(false);

        if (result) {
          setCity((prev) => prev || result.city);
          setState((prev) => prev || result.state);
          setCountry((prev) => prev || result.country);
        }
      }
    },
    []
  );

  // ── GST auto-fill ───────────────────────────────────────────────────────────

  function handleGstChange(value: string) {
    const upper = value.toUpperCase();
    setGstNumber(upper);

    if (!upper.trim()) {
      setGstError("");
      return;
    }

    if (upper.length === 15) {
      const result = validateGst(upper);
      if (!result.valid) {
        setGstError(result.error ?? "Invalid GST");
      } else {
        setGstError("");
        if (result.state) {
          setState((prev) => prev || result.state!);
          setCountry((prev) => prev || "India");
        }
      }
    } else if (upper.length > 15) {
      setGstError("GST must be 15 characters");
    } else {
      setGstError(""); // still typing
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!addressLine1.trim()) errs.addressLine1 = "Address is required";
    if (!city.trim()) errs.city = "City is required";
    if (!state.trim()) errs.state = "State is required";
    if (!zip.trim()) errs.zip = "Zip code is required";
    if (!country.trim()) errs.country = "Country is required";
    return errs;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    // Also check GST validity
    if (gstNumber.trim()) {
      const gstResult = validateGst(gstNumber);
      if (!gstResult.valid) {
        setGstError(gstResult.error ?? "Invalid GST");
        return;
      }
    }
    if (Object.keys(errs).length > 0 || gstError || isSubmitting) return;

    const payload = {
      name: name.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      country: country.trim(),
      gstNumber: gstNumber.trim(),
      isDefault,
    };

    setIsSubmitting(true);
    try {
      if (isEdit && locationId) {
        await locationsService.update(locationId, payload);
        toast.success("Location updated successfully");
      } else {
        await locationsService.create(payload);
        toast.success("Location created successfully");
      }
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
      router.push("/locations");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        `Failed to ${isEdit ? "update" : "create"} location`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const inputClass = (error?: string) =>
    `w-full border ${error ? "border-[#dc2626]" : "border-gray-300"} rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
        {isEdit && (
          <button
            onClick={() => router.push("/locations")}
            className="mr-3 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
            aria-label="Back to locations"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-[16px] sm:text-[18px] font-semibold text-[#111827]">
          {isEdit ? "Edit Location" : "Create Location"}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-[#f9fafb]">
        <div className="mx-auto max-w-[600px] p-4 sm:p-6">
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 sm:px-6 py-4 sm:py-5">
            <div className="flex flex-col gap-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter location name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass(errors.name)}
                />
                {errors.name && (
                  <p className="text-[12px] text-[#dc2626] mt-1">{errors.name}</p>
                )}
              </div>

              {/* GST Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  GST Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  maxLength={15}
                  value={gstNumber}
                  onChange={(e) => handleGstChange(e.target.value)}
                  className={inputClass(gstError || undefined)}
                />
                {gstError ? (
                  <p className="text-[12px] text-[#dc2626] mt-1">{gstError}</p>
                ) : gstNumber.length === 15 && !gstError ? (
                  <p className="text-[11px] text-[#059669] mt-1">
                    ✓ Valid GST — {GST_STATE_CODES[gstNumber.substring(0, 2)] ?? ""}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-400 mt-1">
                    15-character GST number — auto-fills state from state code
                  </p>
                )}
              </div>

              {/* Address Line 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter address"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className={inputClass(errors.addressLine1)}
                />
                {errors.addressLine1 && (
                  <p className="text-[12px] text-[#dc2626] mt-1">{errors.addressLine1}</p>
                )}
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Address Line 2
                </label>
                <input
                  type="text"
                  placeholder="Enter address line 2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className={inputClass()}
                />
              </div>

              {/* Pin Code & Country — side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Pin / Zip Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 110001"
                      value={zip}
                      onChange={(e) => handleZipChange(e.target.value)}
                      className={inputClass(errors.zip)}
                    />
                    {pinLooking && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#0d9488]" />
                      </div>
                    )}
                  </div>
                  {errors.zip && (
                    <p className="text-[12px] text-[#dc2626] mt-1">{errors.zip}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                    <MapPin size={10} />
                    Enter 6-digit pin code to auto-fill city &amp; state
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={inputClass(errors.country)}
                  />
                  {errors.country && (
                    <p className="text-[12px] text-[#dc2626] mt-1">{errors.country}</p>
                  )}
                </div>
              </div>

              {/* City & State — side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass(errors.city)}
                  />
                  {errors.city && (
                    <p className="text-[12px] text-[#dc2626] mt-1">{errors.city}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className={inputClass(errors.state)}
                  />
                  {errors.state && (
                    <p className="text-[12px] text-[#dc2626] mt-1">{errors.state}</p>
                  )}
                </div>
              </div>

              {/* Set as Default */}
              {(() => {
                const alreadyDefault = isEdit && initialValues?.isDefault;
                return (
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!!alreadyDefault}
                        onClick={() => {
                          if (!alreadyDefault) setIsDefault(!isDefault);
                        }}
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                          isDefault
                            ? "border-[#0d9488] bg-[#0d9488]"
                            : "border-gray-300 bg-white hover:border-[#0d9488]"
                        } ${alreadyDefault ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        {isDefault && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path
                              d="M1.5 5.5L3.5 7.5L8.5 2.5"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                      <label
                        className={`text-sm text-gray-700 select-none ${alreadyDefault ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                        onClick={() => {
                          if (!alreadyDefault) setIsDefault(!isDefault);
                        }}
                      >
                        Set as default location
                      </label>
                    </div>
                    {alreadyDefault && (
                      <p className="text-[12px] text-gray-400 mt-1">
                        To change the default, select another location from the locations list.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex justify-end gap-2 border-t border-gray-200 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/locations")}
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
                {isEdit ? "Update Location" : "Create Location"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
