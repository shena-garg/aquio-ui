"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Shield } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Role, RolePermission } from "@/services/roles";
import { EmptyState } from "@/components/ui/EmptyState";

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

// -- Permission chip (tap to reveal, for mobile) --

function PermissionChipMobile({ perm }: { perm: RolePermission }) {
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
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${chipClass}`}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto px-3 py-1.5 text-[12px]" side="top">
        {tooltipText}
      </PopoverContent>
    </Popover>
  );
}

// -- Skeleton --

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

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
      <div className="h-4 w-32 rounded bg-gray-200 mb-3" />
      <div className="h-3 w-48 rounded bg-gray-200 mb-3" />
      <div className="flex gap-1.5">
        <div className="h-5 w-16 rounded-full bg-gray-200" />
        <div className="h-5 w-20 rounded-full bg-gray-200" />
      </div>
    </div>
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

  function RoleActionsMenu({ role }: { role: Role }) {
    if (role.organizationId === null) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded p-2.5 sm:p-1 -m-1.5 sm:m-0 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4 sm:h-[15px] sm:w-[15px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => router.push(`/roles/${role._id}/edit`)}
          >
            Edit Role
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      {/* ── Mobile card list ── */}
      <div className="lg:hidden flex flex-col gap-3 p-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : roles.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-6 w-6 text-[#0d9488]" />}
            title="No roles yet"
            description="Create roles to manage permissions for your team members."
            actionLabel="Add Role"
            onAction={() => router.push("/roles/create")}
          />
        ) : (
          roles.map((role) => (
            <div
              key={role._id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-medium text-[#0F1720]">
                  {role.name}
                </span>
                <RoleActionsMenu role={role} />
              </div>
              {role.description && (
                <p className="text-[13px] text-gray-500 line-clamp-2 mb-2">
                  {cleanDescription(role.description)}
                </p>
              )}
              {role.permissionsPerEntity && role.permissionsPerEntity.filter((p) => p.access !== "none").length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {role.permissionsPerEntity
                    .filter((perm) => perm.access !== "none")
                    .map((perm) => (
                      <PermissionChipMobile key={perm.entity} perm={perm} />
                    ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden lg:block w-full overflow-x-auto bg-white border border-gray-200 rounded-md">
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
                <TableCell colSpan={4} className="p-0">
                  <EmptyState
                    icon={<Shield className="h-6 w-6 text-[#0d9488]" />}
                    title="No roles yet"
                    description="Create roles to manage permissions for your team members."
                    actionLabel="Add Role"
                    onAction={() => router.push("/roles/create")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow
                  key={role._id}
                  className="group border-b border-gray-100 hover:bg-gray-50"
                >
                  <TableCell className="px-3 w-[50px]">
                    <RoleActionsMenu role={role} />
                  </TableCell>

                  <TableCell className="px-3">
                    <span className="text-[13px] font-medium text-[#0F1720]">
                      {role.name}
                    </span>
                  </TableCell>

                  <TableCell className="px-3">
                    <span className="text-[13px] text-gray-600 line-clamp-2">
                      {cleanDescription(role.description)}
                    </span>
                  </TableCell>

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
