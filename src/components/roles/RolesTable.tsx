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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Role, RolePermission } from "@/services/roles";

// -- Entity label mapping --

const entityLabels: Record<string, string> = {
  category: "Category",
  product: "Product",
  vendor: "Vendor",
  "purchase-order": "Purchase Order",
  "sales-order": "Sales Order",
  "auction-buy": "Auctions (Buy)",
  "auction-sale": "Auctions (Sell)",
  notification: "Notifications",
};

// -- Permission chip --

function PermissionChip({ perm }: { perm: RolePermission }) {
  const label = entityLabels[perm.entity] ?? perm.entity;
  const isFull = perm.access === "full";

  const chipClass = isFull
    ? "bg-green-100 text-green-700"
    : "bg-blue-100 text-blue-700";

  const tooltipText = isFull
    ? "Full Access"
    : perm.permissions
        .map((p) => {
          const parts = p.split(".");
          return parts[parts.length - 1];
        })
        .join(" | ");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${chipClass} cursor-default`}
        >
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// -- Skeleton row --

function SkeletonRow() {
  return (
    <TableRow className="animate-pulse">
      <TableCell className="w-[50px]">
        <div className="h-3.5 w-6 rounded bg-gray-200" />
      </TableCell>
      <TableCell>
        <div className="h-3.5 w-32 rounded bg-gray-200" />
      </TableCell>
      <TableCell>
        <div className="h-3.5 w-48 rounded bg-gray-200" />
      </TableCell>
      <TableCell>
        <div className="flex gap-1.5">
          <div className="h-5 w-16 rounded-full bg-gray-200" />
          <div className="h-5 w-20 rounded-full bg-gray-200" />
          <div className="h-5 w-14 rounded-full bg-gray-200" />
        </div>
      </TableCell>
    </TableRow>
  );
}

// -- Table header style --

const TH =
  "px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400";

// -- Props --

interface RolesTableProps {
  roles: Role[];
  isLoading: boolean;
}

// -- Clean description text --

function cleanDescription(text: string | undefined): string {
  if (!text) return "---";
  return text.replace(/\\n/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

// -- Main component --

export function RolesTable({ roles, isLoading }: RolesTableProps) {
  const router = useRouter();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full overflow-x-auto bg-white border border-gray-200 rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              <TableHead className={`${TH} w-[50px]`} />
              <TableHead className={TH}>Name</TableHead>
              <TableHead className={TH}>Description</TableHead>
              <TableHead className={TH}>Permissions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-32 text-center text-[13px] text-gray-400"
                >
                  No roles found
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow
                  key={role._id}
                  className="group border-b border-gray-100 hover:bg-gray-50"
                >
                  {/* Three dot menu — only for org roles */}
                  <TableCell className="px-3 w-[50px]">
                    {role.organizationId !== null ? (
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
                            onClick={() =>
                              router.push(`/roles/${role._id}/edit`)
                            }
                          >
                            Edit Role
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>

                  {/* Name */}
                  <TableCell className="px-3">
                    <span className="text-[13px] font-medium text-[#0F1720]">
                      {role.name}
                    </span>
                  </TableCell>

                  {/* Description */}
                  <TableCell className="px-3">
                    <span className="text-[13px] text-gray-600 line-clamp-2">
                      {cleanDescription(role.description)}
                    </span>
                  </TableCell>

                  {/* Permissions */}
                  <TableCell className="px-3">
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissionsPerEntity
                        ?.filter((perm) => perm.access !== "none")
                        .map((perm) => (
                          <PermissionChip key={perm.entity} perm={perm} />
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
