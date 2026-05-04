"use client";

import { useState } from "react";
import { Plus, MapPin, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { partnersService, type Partner, type PartnerLocation } from "@/services/partners";
import { getEntityActivityLog, getUsers } from "@/services/activity";
import { SimpleActivityTimeline } from "@/components/activity/SimpleActivityTimeline";
import {
  LocationFormFields,
  LocationValues,
  LocationFieldErrors,
  EMPTY_LOCATION,
  validateGst,
} from "@/components/locations/LocationFormFields";

// ---------------------------------------------------------------------------
// Add Partner Location Modal
// ---------------------------------------------------------------------------

interface AddLocationModalProps {
  open: boolean;
  partnerId: string;
  onClose: () => void;
  onCreated: () => void;
}

function AddPartnerLocationModal({ open, partnerId, onClose, onCreated }: AddLocationModalProps) {
  const queryClient = useQueryClient();
  const [loc, setLoc] = useState<LocationValues>(EMPTY_LOCATION);
  const [errors, setErrors] = useState<LocationFieldErrors>({});
  const [gstError, setGstError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function handleChange(updates: Partial<LocationValues>) {
    setLoc((prev) => ({ ...prev, ...updates }));
  }

  function reset() {
    setLoc(EMPTY_LOCATION);
    setErrors({});
    setGstError("");
    setIsSubmitting(false);
    setSubmitError("");
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
    if (!loc.zip.trim()) errs.zip = "Zip code is required";
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
      await partnersService.addLocation(partnerId, {
        name: loc.name.trim(),
        addressLine1: loc.addressLine1.trim(),
        addressLine2: loc.addressLine2.trim() || undefined,
        city: loc.city.trim(),
        state: loc.state.trim(),
        zip: loc.zip.trim(),
        country: loc.country.trim(),
        gstNumber: loc.gstNumber.trim() || undefined,
        isDefault: loc.isDefault,
      });
      toast.success("Location added successfully");
      queryClient.invalidateQueries({ queryKey: ["partner", partnerId] });
      onCreated();
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to add location";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent showCloseButton={false} className="max-w-[560px] p-0 gap-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <DialogTitle className="text-base font-semibold text-gray-900">
            Add Location
          </DialogTitle>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

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

        {submitError && (
          <p className="px-5 pb-1 text-[13px] text-[#dc2626]">{submitError}</p>
        )}
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
            Add Location
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Location card
// ---------------------------------------------------------------------------

function LocationCard({ location }: { location: PartnerLocation }) {
  const address = [
    location.addressLine1,
    location.addressLine2,
    location.city,
    location.state,
    location.zip,
    location.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="rounded-[8px] border border-[#e5e7eb] bg-white p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-[#0d9488] shrink-0" />
          <span className="text-[13px] font-semibold text-[#111827]">
            {location.name}
          </span>
        </div>
        {location.isDefault && (
          <span className="inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium bg-[#d1fae5] text-[#065f46]">
            Default
          </span>
        )}
      </div>
      <p className="text-[12px] text-[#6b7280] pl-5">{address}</p>
      {location.gstNumber && (
        <p className="text-[11px] text-[#9ca3af] pl-5">GST: {location.gstNumber}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabKey = "locations" | "activity";

interface PartnerDetailsTabsProps {
  partner: Partner;
}

export function PartnerDetailsTabs({ partner }: PartnerDetailsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("locations");
  const [addLocationOpen, setAddLocationOpen] = useState(false);

  const locations = partner.locations ?? [];

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "locations", label: "Locations", count: locations.length },
    { key: "activity", label: "Activity" },
  ];

  const { data: activityEvents = [], isLoading: loadingActivity } = useQuery({
    queryKey: ["activity", "partner", partner._id],
    queryFn: () => getEntityActivityLog("partner", partner._id),
    staleTime: 0,
    enabled: activeTab === "activity",
  });
  const { data: activityUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["audit-users"],
    queryFn: getUsers,
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "activity",
  });

  return (
    <div className="flex flex-col flex-1 mt-2 min-h-0">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-[#0d9488] text-[#111827]"
                  : "border-transparent text-[#6b7280] hover:text-[#111827]",
              )}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span
                  className={cn(
                    "rounded-[10px] px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                    isActive
                      ? "bg-[#fef3c7] text-[#b45309]"
                      : "bg-[#f3f4f6] text-[#6b7280]",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-4 sm:px-8 py-4">
        {activeTab === "locations" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-[#6b7280]">
                {locations.length === 0
                  ? "No locations added yet."
                  : `${locations.length} location${locations.length !== 1 ? "s" : ""}`}
              </p>
              {partner.status === "active" && (
                <Button
                  size="sm"
                  onClick={() => setAddLocationOpen(true)}
                  className="h-8 gap-1.5 text-[13px] bg-[#0d9488] hover:bg-[#0f766e] text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Location
                </Button>
              )}
            </div>

            {locations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {locations.map((loc) => (
                  <LocationCard key={loc._id} location={loc} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <MapPin className="h-8 w-8 text-[#d1d5db]" />
                <p className="text-[14px] font-medium text-[#374151]">No locations yet</p>
                <p className="text-[13px] text-[#9ca3af]">
                  Add a location to track addresses and GST numbers for this partner.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          (loadingActivity || loadingUsers) ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-gray-400" size={20} />
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5 text-[12px] text-[#9ca3af] mb-4">
                <Clock size={12} />
                <span>Activity may take a moment to appear after changes</span>
              </div>
              <SimpleActivityTimeline events={activityEvents} users={activityUsers} />
            </div>
          )
        )}
      </div>

      <AddPartnerLocationModal
        open={addLocationOpen}
        partnerId={partner._id}
        onClose={() => setAddLocationOpen(false)}
        onCreated={() => setAddLocationOpen(false)}
      />
    </div>
  );
}
