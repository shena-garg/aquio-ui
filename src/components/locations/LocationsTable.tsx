"use client";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAddress(line1: string, line2: string): string {
  const parts = [line1, line2].filter(Boolean);
  return parts.join(", ") || "—";
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow className="animate-pulse">
      <TableCell><div className="h-6 w-6 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-32 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-40 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-20 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-24 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-16 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-28 rounded bg-gray-200" /></TableCell>
    </TableRow>
  );
}

// ── Table header styles ──────────────────────────────────────────────────────

const TH = "px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400";

// ── Main component ──────────────────────────────────────────────────────────

interface LocationsTableProps {
  locations: Location[];
  isLoading: boolean;
}

export function LocationsTable({ locations, isLoading }: LocationsTableProps) {
  const router = useRouter();

  return (
    <div className="w-full overflow-x-auto bg-white border border-gray-200 rounded-md">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
            <TableHead className={`${TH} w-[50px]`} />
            <TableHead className={TH}>Name</TableHead>
            <TableHead className={TH}>Address</TableHead>
            <TableHead className={TH}>City</TableHead>
            <TableHead className={TH}>State</TableHead>
            <TableHead className={TH}>Zip</TableHead>
            <TableHead className={TH}>GST Number</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : locations.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
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
                <TableCell className="px-3 w-[50px]">
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
                        onClick={() => router.push(`/locations/${location._id}/edit`)}
                      >
                        Edit Location
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[#0F1720]">
                      {location.name}
                    </span>
                    {location.isDefault && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-700">
                        Default
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-3 text-[13px] text-gray-600">
                  {formatAddress(location.addressLine1, location.addressLine2)}
                </TableCell>
                <TableCell className="px-3 text-[13px] text-gray-600">
                  {location.city || "—"}
                </TableCell>
                <TableCell className="px-3 text-[13px] text-gray-600">
                  {location.state || "—"}
                </TableCell>
                <TableCell className="px-3 text-[13px] text-gray-600">
                  {location.zip || "—"}
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
  );
}
