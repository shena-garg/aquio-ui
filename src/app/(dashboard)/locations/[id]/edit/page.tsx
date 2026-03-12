"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { locationsService } from "@/services/locations";
import { LocationForm } from "@/components/locations/LocationForm";

function EditSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-6">
        <div className="h-5 w-32 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="flex-1 bg-[#f9fafb] p-6">
        <div className="mx-auto max-w-[600px]">
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div className="flex flex-col gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="h-3.5 w-24 rounded bg-gray-200 animate-pulse mb-2" />
                  <div className="h-[38px] w-full rounded-md bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditLocationPage() {
  const { id } = useParams<{ id: string }>();

  const { data: location, isLoading, isError } = useQuery({
    queryKey: ["location", id],
    queryFn: () => locationsService.getById(id).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <EditSkeleton />;

  if (isError || !location) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-500">Failed to load location.</p>
      </div>
    );
  }

  return (
    <LocationForm
      mode="edit"
      locationId={location._id}
      initialValues={{
        name: location.name,
        addressLine1: location.addressLine1,
        addressLine2: location.addressLine2,
        city: location.city,
        state: location.state,
        zip: location.zip,
        country: location.country,
        gstNumber: location.gstNumber,
        isDefault: location.isDefault,
      }}
    />
  );
}
