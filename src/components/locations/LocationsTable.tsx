"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Location } from "@/services/locations";
import { SetDefaultLocationModal } from "@/components/locations/SetDefaultLocationModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAddress(line1: string, line2: string): string {
  const parts = [line1, line2].filter(Boolean);
  return parts.join(", ") || "—";
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow className="animate-pulse">
      <TableCell><div className="h-4 w-4 rounded-full bg-gray-200" /></TableCell>
      <TableCell><div className="h-6 w-6 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-32 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-40 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-24 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-16 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-28 rounded bg-gray-200" /></TableCell>
    </TableRow>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
      <div className="h-4 w-32 rounded bg-gray-200 mb-3" />
      <div className="space-y-2">
        <div className="h-3 w-48 rounded bg-gray-200" />
        <div className="h-3 w-36 rounded bg-gray-200" />
        <div className="h-3 w-28 rounded bg-gray-200" />
      </div>
    </div>
  );
}

// ── Table header styles ──────────────────────────────────────────────────────

const TH = "px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400";

// ── Default badge ────────────────────────────────────────────────────────────

function DefaultToggle({
  location,
  onSetDefault,
}: {
  location: Location;
  onSetDefault: (loc: Location) => void;
}) {
  return (
    <button
      onClick={() => {
        if (!location.isDefault) onSetDefault(location);
      }}
      className="inline-flex items-center justify-center"
      aria-label={
        location.isDefault
          ? "Current default location"
          : `Set ${location.name} as default`
      }
    >
      {location.isDefault ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0d9488]">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1.5 5.5L3.5 7.5L8.5 2.5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-300 transition-colors hover:border-[#0d9488]" />
      )}
    </button>
  );
}

// ── Actions menu ─────────────────────────────────────────────────────────────

function ActionsMenu({ locationId }: { locationId: string }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
          aria-label="More actions"
        >
          <MoreHorizontal className="h-[15px] w-[15px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem
          onClick={() => router.push(`/locations/${locationId}/edit`)}
        >
          Edit Location
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface LocationsTableProps {
  locations: Location[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function LocationsTable({ locations, isLoading, onRefresh }: LocationsTableProps) {
  const router = useRouter();
  const [defaultCandidate, setDefaultCandidate] = useState<Location | null>(null);

  return (
    <>
      {/* ── Mobile card list ── */}
      <div className="lg:hidden flex flex-col gap-3 p-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : locations.length === 0 ? (
          <p className="text-center text-[13px] text-gray-400 py-12">No locations found.</p>
        ) : (
          locations.map((location) => (
            <div
              key={location._id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              {/* Row 1: Name | GST */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[14px] font-medium text-[#0F1720]">
                  {location.name}
                </span>
                {location.gstNumber && (
                  <span className="text-[12px] text-gray-500">{location.gstNumber}</span>
                )}
              </div>
              {/* Row 2: Address | Actions */}
              <div className="flex items-start justify-between mb-1.5">
                <p className="text-[13px] text-gray-600">
                  {formatAddress(location.addressLine1, location.addressLine2)}
                </p>
                <ActionsMenu locationId={location._id} />
              </div>
              {/* Row 3: City, State, Zip | Default chip/link */}
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-600">
                  {[location.city, location.state, location.zip].filter(Boolean).join(", ") || "—"}
                </span>
                {location.isDefault ? (
                  <span className="text-[11px] font-medium text-[#0d9488] bg-[#f0fdfa] rounded-full px-2 py-0.5">
                    Default
                  </span>
                ) : (
                  <button
                    onClick={() => setDefaultCandidate(location)}
                    className="text-[11px] font-medium text-[#0d9488] hover:underline"
                  >
                    Set as default
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden lg:block w-full overflow-x-auto bg-white border border-gray-200 rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              <TableHead className={`${TH} w-[40px] pl-3 pr-0 text-center`}>Default</TableHead>
              <TableHead className={`${TH} w-[40px] px-0`} />
              <TableHead className={TH}>Name</TableHead>
              <TableHead className={TH}>Address</TableHead>
              <TableHead className={TH}>City, Zip</TableHead>
              <TableHead className={TH}>GST Number</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : locations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-[13px] text-gray-400"
                >
                  No locations found.
                </TableCell>
              </TableRow>
            ) : (
              locations.map((location) => (
                <TableRow
                  key={location._id}
                  className="group border-b border-gray-100 hover:bg-gray-50"
                >
                  {/* Default radio */}
                  <TableCell className="pl-3 pr-0 w-[40px] text-center">
                    <DefaultToggle location={location} onSetDefault={setDefaultCandidate} />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="pl-2 pr-0 w-[40px]">
                    <ActionsMenu locationId={location._id} />
                  </TableCell>

                  <TableCell className="px-3">
                    <span className="text-[13px] font-medium text-[#0F1720]">
                      {location.name}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 text-[13px] text-gray-600">
                    {formatAddress(location.addressLine1, location.addressLine2)}
                  </TableCell>
                  <TableCell className="px-3 text-[13px] text-gray-600">
                    {[location.city, location.zip].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="px-3 text-[13px] text-gray-600">
                    {location.gstNumber || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Set default confirmation modal */}
      {defaultCandidate && (
        <SetDefaultLocationModal
          isOpen={!!defaultCandidate}
          onClose={() => setDefaultCandidate(null)}
          onSuccess={onRefresh}
          location={defaultCandidate}
        />
      )}
    </>
  );
}
