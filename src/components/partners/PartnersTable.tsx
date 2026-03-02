"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Partner } from "@/services/partners";

function SkeletonRow() {
  return (
    <TableRow className="animate-pulse">
      <TableCell className="px-3">
        <div className="h-3.5 w-32 rounded bg-gray-200" />
      </TableCell>
      <TableCell className="px-3">
        <div className="h-3.5 w-28 rounded bg-gray-200" />
      </TableCell>
      <TableCell className="px-3">
        <div className="h-3.5 w-24 rounded bg-gray-200" />
      </TableCell>
      <TableCell className="px-3">
        <div className="h-3.5 w-14 rounded bg-gray-200" />
      </TableCell>
    </TableRow>
  );
}

const TH =
  "px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400";

interface PartnersTableProps {
  partners: Partner[];
  isLoading: boolean;
}

export function PartnersTable({ partners, isLoading }: PartnersTableProps) {
  const router = useRouter();

  return (
    <div className="w-full overflow-x-auto bg-white border border-gray-200 rounded-md">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
            <TableHead className={TH}>Name</TableHead>
            <TableHead className={TH}>Contact Number</TableHead>
            <TableHead className={TH}>Tax Number</TableHead>
            <TableHead className={TH}>PO Reminder</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : partners.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-32 text-center text-[13px] text-gray-400"
              >
                No partners found.
              </TableCell>
            </TableRow>
          ) : (
            partners.map((partner) => (
              <TableRow
                key={partner._id}
                onClick={() => router.push(`/partners/${partner._id}`)}
                className="group cursor-pointer border-b border-gray-100 hover:bg-gray-50"
              >
                <TableCell className="px-3">
                  <span className="text-[13px] font-medium text-[#0F1720]">
                    {partner.name}
                  </span>
                </TableCell>
                <TableCell className="px-3 text-[13px] text-[#0F1720]">
                  {partner.countryCode} {partner.contactNumber}
                </TableCell>
                <TableCell className="px-3 text-[13px] text-[#0F1720]">
                  {partner.taxNumber || "–"}
                </TableCell>
                <TableCell className="px-3">
                  {partner.poReminder ? (
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-green-100 text-green-700">
                      On
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-600">
                      Off
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
