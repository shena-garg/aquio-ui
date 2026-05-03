"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { partnersService } from "@/services/partners";
import { PartnerDetailsHeader } from "@/components/partners/details/PartnerDetailsHeader";
import {
  PartnerDetailsInfoCard,
  type PartnerEditState,
} from "@/components/partners/details/PartnerDetailsInfoCard";
import { PartnerDetailsTabs } from "@/components/partners/details/PartnerDetailsTabs";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function FullPageSkeleton() {
  return (
    <div className="flex flex-col h-full gap-0 animate-pulse">
      <div className="flex items-center justify-between px-4 sm:px-6 h-[55px] border-b border-[#e5e7eb]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-40 rounded bg-gray-200" />
          <div className="h-5 w-14 rounded bg-gray-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded bg-gray-200" />
          <div className="h-8 w-8 rounded bg-gray-200" />
        </div>
      </div>
      <div className="mx-4 sm:mx-8 mt-3 rounded-[10px] border border-[#f3f4f6] px-4 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="h-3 w-16 rounded bg-gray-200" />
              <div className="h-4 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-4 border-b border-[#e5e7eb] px-6 py-3 mt-2">
        <div className="h-4 w-24 rounded bg-gray-200" />
      </div>
      <div className="flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[8px] bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editState, setEditState] = useState<PartnerEditState | null>(null);
  const [editError, setEditError] = useState("");

  const { data: partner, isLoading, isError } = useQuery({
    queryKey: ["partner", id],
    queryFn: () => partnersService.getById(id).then((r) => r.data),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load partner. Please try again.");
    }
  }, [isError]);

  function handleEditStart() {
    if (!partner) return;
    setEditState({
      name: partner.name,
      countryCode: partner.countryCode,
      contactNumber: partner.contactNumber,
      taxNumber: partner.taxNumber ?? "",
      poReminder: partner.poReminder,
    });
    setIsEditing(true);
  }

  function handleEditCancel() {
    setIsEditing(false);
    setEditState(null);
    setEditError("");
  }

  async function handleSave() {
    if (!partner || !editState) return;

    if (!editState.name.trim()) {
      setEditError("Partner name is required.");
      return;
    }
    if (!editState.contactNumber.trim()) {
      setEditError("Contact number is required.");
      return;
    }
    setEditError("");

    setIsSaving(true);
    try {
      await partnersService.update(partner._id, {
        name: editState.name.trim(),
        countryCode: editState.countryCode.trim(),
        contactNumber: editState.contactNumber.trim(),
        taxNumber: editState.taxNumber.trim(),
        poReminder: editState.poReminder,
      });
      toast.success("Partner updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["partner", id] });
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      setIsEditing(false);
      setEditState(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update partner.";
      setEditError(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <FullPageSkeleton />
      </div>
    );
  }

  if (isError || !partner) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <p className="text-[15px] text-gray-600">
          {isError
            ? "Something went wrong loading this partner."
            : "Partner not found."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="h-8 gap-1.5 text-[13px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ErrorBoundary>
        <PartnerDetailsHeader
          partner={partner}
          isEditing={isEditing}
          isSaving={isSaving}
          onEditStart={handleEditStart}
          onEditCancel={handleEditCancel}
          onSave={handleSave}
        />
        {editError && (
          <p className="px-6 py-2 text-[13px] text-[#dc2626] bg-red-50 border-b border-red-100">{editError}</p>
        )}
        <PartnerDetailsInfoCard
          partner={partner}
          isEditing={isEditing}
          editState={editState}
          onEditStateChange={setEditState}
        />
        <PartnerDetailsTabs partner={partner} />
      </ErrorBoundary>
    </div>
  );
}
