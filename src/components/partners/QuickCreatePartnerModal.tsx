"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { partnersService, Partner } from "@/services/partners";
import {
  LocationFormFields,
  LocationValues,
  LocationFieldErrors,
  EMPTY_LOCATION,
  validateGst,
} from "@/components/locations/LocationFormFields";

interface FormErrors {
  name?: string;
  contactNumber?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (partner: Partner) => void;
}

export function QuickCreatePartnerModal({ open, onClose, onCreated }: Props) {
  const queryClient = useQueryClient();

  // Details
  const [name, setName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  // Location
  const [loc, setLoc] = useState<LocationValues>(EMPTY_LOCATION);
  const [locErrors, setLocErrors] = useState<LocationFieldErrors>({});
  const [gstError, setGstError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleLocChange(updates: Partial<LocationValues>) {
    setLoc((prev) => ({ ...prev, ...updates }));
  }

  const [submitError, setSubmitError] = useState("");

  function reset() {
    setName(""); setTaxNumber(""); setContactNumber("");
    setErrors({});
    setLoc(EMPTY_LOCATION);
    setLocErrors({});
    setGstError("");
    setIsSubmitting(false);
    setSubmitError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = "Company name is required";
    if (!contactNumber.trim()) errs.contactNumber = "Contact number is required";
    setErrors(errs);

    const lErrs: LocationFieldErrors = {};
    if (!loc.name.trim()) lErrs.name = "Location name is required";
    if (!loc.addressLine1.trim()) lErrs.addressLine1 = "Address is required";
    if (!loc.city.trim()) lErrs.city = "City is required";
    if (!loc.state.trim()) lErrs.state = "State is required";
    if (!loc.zip.trim()) lErrs.zip = "Zip code is required";
    if (!loc.country.trim()) lErrs.country = "Country is required";
    setLocErrors(lErrs);

    if (loc.gstNumber.trim()) {
      const r = validateGst(loc.gstNumber);
      if (!r.valid) { setGstError(r.error ?? "Invalid GST"); return false; }
    }

    return Object.keys(errs).length === 0 && Object.keys(lErrs).length === 0 && !gstError;
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const { data } = await partnersService.create({
        name: name.trim(),
        taxNumber: taxNumber.trim() || undefined,
        contactNumber: contactNumber.trim(),
        address: {
          name: loc.name.trim(),
          gstNumber: loc.gstNumber.trim() || undefined,
          addressLine1: loc.addressLine1.trim(),
          addressLine2: loc.addressLine2.trim() || undefined,
          city: loc.city.trim(),
          state: loc.state.trim(),
          country: loc.country.trim(),
          zip: loc.zip.trim(),
        },
      });
      toast.success("Partner created successfully");
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      onCreated(data);
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create partner";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inp = (error?: string) =>
    `w-full border ${
      error ? "border-[#dc2626]" : "border-gray-300"
    } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent showCloseButton={false} className="max-w-[600px] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <DialogTitle className="text-base font-semibold text-gray-900">
            New Partner
          </DialogTitle>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-6 max-h-[72vh] overflow-y-auto">

          {/* ── Details ── */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Details
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Firm / Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Enterprises"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    className={inp(errors.name)}
                  />
                  {errors.name && (
                    <p className="text-[12px] text-[#dc2626] mt-1">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tax Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className={inp()}
                  />
                </div>
              </div>
              <div className="max-w-[50%] pr-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className={inp(errors.contactNumber)}
                />
                {errors.contactNumber && (
                  <p className="text-[12px] text-[#dc2626] mt-1">{errors.contactNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Location ── */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Location <span className="text-red-500">*</span>
            </p>
            <LocationFormFields
              values={loc}
              onChange={handleLocChange}
              errors={locErrors}
              gstError={gstError}
              onGstError={setGstError}
              nameLabel="Location Name"
              namePlaceholder="e.g. Mumbai Head Office"
            />
          </div>

        </div>

        {/* Error */}
        {submitError && <p className="px-5 pb-1 text-[13px] text-[#dc2626]">{submitError}</p>}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="border-gray-200 text-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
          >
            {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Create Partner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
