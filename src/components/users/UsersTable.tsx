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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/services/users";
import type { Role } from "@/services/roles";
import { DeactivateUserModal } from "@/components/users/DeactivateUserModal";

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow className="animate-pulse">
      <TableCell><div className="h-6 w-6 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-32 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-40 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-28 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-24 rounded bg-gray-200" /></TableCell>
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
        <div className="h-3 w-24 rounded bg-gray-200" />
      </div>
    </div>
  );
}

// ── Table header styles ──────────────────────────────────────────────────────

const TH = "px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400";

// ── Props ────────────────────────────────────────────────────────────────────

interface UsersTableProps {
  users: User[];
  roles: Role[];
  isLoading: boolean;
  activeTab: "active" | "inactive";
  onRefresh: () => void;
}

// ── Main component ──────────────────────────────────────────────────────────

export function UsersTable({ users, roles, isLoading, activeTab, onRefresh }: UsersTableProps) {
  const router = useRouter();
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);

  function getRoleName(roleId: string): string {
    const role = roles.find((r) => r._id === roleId);
    return role?.name ?? "—";
  }

  const showActions = activeTab === "active";

  function UserActionsMenu({ user }: { user: User }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded p-2.5 lg:p-1 -m-1.5 lg:m-0 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4 lg:h-[15px] lg:w-[15px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => router.push(`/users/${user._id}/edit`)}
          >
            Edit User
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeactivateUser(user)}
            className="text-[#DC2626] focus:text-[#DC2626]"
          >
            Deactivate User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      {/* ── Mobile card list ── */}
      <div className="lg:hidden flex flex-col gap-3 p-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : users.length === 0 ? (
          <p className="text-center text-[13px] text-gray-400 py-12">No users found.</p>
        ) : (
          users.map((user) => (
            <div
              key={user._id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[14px] font-medium text-[#0F1720]">
                  {user.name}
                </span>
                <span className="text-[12px] font-medium text-gray-700">{getRoleName(user.roleId)}</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="space-y-0.5 text-[13px] text-gray-500">
                  <p>{user.email || "—"}</p>
                  <p>
                    {user.countryCode && user.phoneNumber
                      ? `${user.countryCode} ${user.phoneNumber}`
                      : user.phoneNumber || "—"}
                  </p>
                </div>
                {showActions && <UserActionsMenu user={user} />}
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
              {showActions && <TableHead className={`${TH} w-[50px]`} />}
              <TableHead className={TH}>Name</TableHead>
              <TableHead className={TH}>Email Address</TableHead>
              <TableHead className={TH}>Mobile Number</TableHead>
              <TableHead className={TH}>Role</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showActions ? 5 : 4}
                  className="h-32 text-center text-[13px] text-gray-400"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user._id}
                  className="group border-b border-gray-100 hover:bg-gray-50"
                >
                  {showActions && (
                    <TableCell className="px-3 w-[50px]">
                      <UserActionsMenu user={user} />
                    </TableCell>
                  )}
                  <TableCell className="px-3">
                    <span className="text-[13px] font-medium text-[#0F1720]">
                      {user.name}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 text-[13px] text-gray-600">
                    {user.email || "—"}
                  </TableCell>
                  <TableCell className="px-3 text-[13px] text-gray-600">
                    {user.countryCode && user.phoneNumber
                      ? `${user.countryCode} ${user.phoneNumber}`
                      : user.phoneNumber || "—"}
                  </TableCell>
                  <TableCell className="px-3 text-[13px] text-gray-600">
                    {getRoleName(user.roleId)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Deactivation confirmation modal */}
      {deactivateUser && (
        <DeactivateUserModal
          isOpen={!!deactivateUser}
          onClose={() => setDeactivateUser(null)}
          onSuccess={onRefresh}
          userId={deactivateUser._id}
          userName={deactivateUser.name}
        />
      )}
    </>
  );
}
