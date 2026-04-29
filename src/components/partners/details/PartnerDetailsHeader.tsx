"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/PageHeader";
import { partnersService, type Partner } from "@/services/partners";

interface Props {
  partner: Partner;
  isEditing: boolean;
  isSaving: boolean;
  onEditStart: () => void;
  onEditCancel: () => void;
  onSave: () => void;
}

export function PartnerDetailsHeader({
  partner,
  isEditing,
  isSaving,
  onEditStart,
  onEditCancel,
  onSave,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    if (!confirm(`Deactivate "${partner.name}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await partnersService.delete(partner._id);
      toast.success(`${partner.name} has been deactivated`);
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      router.push("/partners");
    } catch {
      setDeleteError("Failed to deactivate partner");
    } finally {
      setIsDeleting(false);
    }
  }

  const badge = (
    <span
      className={`inline-flex items-center rounded-[6px] px-2 h-6 text-[12px] font-medium ${
        partner.status === "active"
          ? "bg-[#d1fae5] text-[#065f46]"
          : "bg-[#f3f4f6] text-[#374151]"
      }`}
    >
      {partner.status === "active" ? "Active" : "Inactive"}
    </span>
  );

  const actions = isEditing ? (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="h-9 px-3.5 rounded-[6px] text-[13px] font-medium"
        onClick={onEditCancel}
        disabled={isSaving}
      >
        Cancel
      </Button>
      <Button
        className="h-9 px-3.5 rounded-[6px] text-[13px] font-medium bg-[#0F1720] text-white hover:bg-[#1a2533]"
        onClick={onSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</>
        ) : "Save"}
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      {partner.status === "active" && (
        <Button
          variant="outline"
          className="h-9 px-3.5 rounded-[6px] text-[13px] font-medium"
          onClick={onEditStart}
        >
          Edit
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 w-9 rounded-[6px] p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {partner.status === "active" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-[#DC2626] focus:text-[#DC2626]"
              >
                {isDeleting ? "Deactivating…" : "Deactivate"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <>
      <PageHeader title={partner.name} left={badge} right={actions} />
      {deleteError && (
        <p className="px-6 py-2 text-[13px] text-[#dc2626] bg-red-50 border-b border-red-100">{deleteError}</p>
      )}
    </>
  );
}
