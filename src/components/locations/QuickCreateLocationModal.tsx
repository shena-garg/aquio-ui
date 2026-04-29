"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { locationsService } from "@/services/locations";
import {
  LocationFormFields,
  LocationValues,
  LocationFieldErrors,
  EMPTY_LOCATION,
  validateGst,
  getZipValidation,
} from "./LocationFormFields";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (created: { _id: string; name: string }) => void;
}

export function QuickCreateLocationModal({ open, onClose, onCreated }: Props) {
  const queryClient = useQueryClient();
  const [loc, setLoc] = useState<LocationValues>(EMPTY_LOCATION);
  const [errors, setErrors] = useState<LocationFieldErrors>({});
  const [gstError, setGstError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(updates: Partial<LocationValues>) {
    setLoc((prev) => ({ ...prev, ...updates }));
  }

  function reset() {
    setLoc(EMPTY_LOCATION);
    setErrors({});
    setGstError("");
    setIsSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function validate(): LocationFieldErrors {
    const errs: LocationFieldErrors = {};
    if (!loc.name.trim()) errs.name = "Name is required";
    if (!loc.addressLine1.trim()) errs.addressLine1 = "Address is required";
    if (!loc.city.trim()) errs.city = "City is required";
    if (!loc.state.trim()) errs.state = "State is required";
    if (!loc.zip.trim()) {
      errs.zip = "Zip code is required";
    } else {
      const zipCheck = getZipValidation(loc.zip, loc.country);
      if (zipCheck.error) errs.zip = zipCheck.error;
    }
    if (!loc.country.trim()) errs.country = "Country is required";
    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (loc.gstNumber.trim()) {
      const r = validateGst(loc.gstNumber);
      if (!r.valid) { setGstError(r.error ?? "Invalid GST"); return; }
    }
    if (Object.keys(errs).length > 0 || gstError || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data } = await locationsService.create({
        name: loc.name.trim(),
        addressLine1: loc.addressLine1.trim(),
        addressLine2: loc.addressLine2.trim(),
        city: loc.city.trim(),
        state: loc.state.trim(),
        zip: loc.zip.trim(),
        country: loc.country.trim(),
        gstNumber: loc.gstNumber.trim(),
        isDefault: loc.isDefault,
      });
      toast.success("Location created successfully");
      await queryClient.invalidateQueries({ queryKey: ["locations"] });
      onCreated({ _id: data._id, name: data.name });
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create location";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent showCloseButton={false} className="max-w-[560px] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <DialogTitle className="text-base font-semibold text-gray-900">
            New Location
          </DialogTitle>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 max-h-[70vh] overflow-y-auto">
          <LocationFormFields
            values={loc}
            onChange={handleChange}
            errors={errors}
            gstError={gstError}
            onGstError={setGstError}
            showIsDefault
          />
        </div>

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
            {isSubmitting && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Create Location
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
