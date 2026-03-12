"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usersService } from "@/services/users";
import axios from "axios";

interface DeactivateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  userName: string;
}

export function DeactivateUserModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  userName,
}: DeactivateUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    if (!isSubmitting) onClose();
  }

  async function handleDeactivate() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await usersService.deactivate(userId);
      toast.success(`${userName} has been deactivated`);
      onSuccess();
      onClose();
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to deactivate user";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[480px] p-0 gap-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <DialogTitle className="text-base font-semibold text-gray-900">
            Deactivate User
          </DialogTitle>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to deactivate{" "}
            <span className="font-semibold text-[#111827]">{userName}</span>?
            They will lose access to Aquio immediately and won&apos;t be able to
            log in until reactivated.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            No, Don&apos;t Deactivate
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleDeactivate}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
          >
            {isSubmitting && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Yes, Deactivate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
