"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
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

export function LocationForm({ mode, locationId, initialValues }: LocationFormProps) {
  const router = useRouter();
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0 || isSubmitting) return;

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

  const inputClass = (error?: string) =>
    `w-full border ${error ? "border-[#dc2626]" : "border-gray-300"} rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-6">
        <button
          onClick={() => router.push("/locations")}
          className="mr-3 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
          aria-label="Back to locations"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[18px] font-semibold text-[#111827]">
          {isEdit ? "Edit Location" : "Create Location"}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-[#f9fafb]">
        <div className="mx-auto max-w-[600px] p-6">
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
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
                  placeholder="Enter GST number"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className={inputClass()}
                />
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

              {/* Zip & Country — side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Zip Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter zip code"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className={inputClass(errors.zip)}
                  />
                  {errors.zip && (
                    <p className="text-[12px] text-[#dc2626] mt-1">{errors.zip}</p>
                  )}
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
