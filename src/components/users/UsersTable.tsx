"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User } from "@/services/users";
import { usersService } from "@/services/users";
import type { Role } from "@/services/roles";
import axios from "axios";

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow className="animate-pulse">
      <TableCell><div className="h-3.5 w-32 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-40 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-28 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-3.5 w-24 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-6 w-6 rounded bg-gray-200" /></TableCell>
    </TableRow>
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
  const [isDeactivating, setIsDeactivating] = useState(false);

  function getRoleName(roleId: string): string {
    const role = roles.find((r) => r._id === roleId);
    return role?.name ?? "—";
  }

  async function handleDeactivate() {
    if (!deactivateUser) return;
    setIsDeactivating(true);
    try {
      await usersService.deactivate(deactivateUser._id);
      toast.success(`${deactivateUser.name} has been deactivated`);
      setDeactivateUser(null);
      onRefresh();
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to deactivate user";
      toast.error(message);
    } finally {
      setIsDeactivating(false);
    }
  }

  const showActions = activeTab === "active";

  return (
    <>
      <div className="w-full overflow-x-auto bg-white border border-gray-200 rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              <TableHead className={TH}>Name</TableHead>
              <TableHead className={TH}>Email Address</TableHead>
              <TableHead className={TH}>Mobile Number</TableHead>
              <TableHead className={TH}>Role</TableHead>
              {showActions && <TableHead className={`${TH} w-[50px]`} />}
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
                  {showActions && (
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
                        <DropdownMenuContent align="end" className="w-48">
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
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Deactivation confirmation dialog */}
      <AlertDialog
        open={!!deactivateUser}
        onOpenChange={(open) => {
          if (!open) setDeactivateUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {deactivateUser?.name}? They
              will lose access to Aquio immediately and won&apos;t be able to log
              in until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isDeactivating}
              className="bg-[#DC2626] text-white hover:bg-[#B91C1C]"
            >
              {isDeactivating ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
