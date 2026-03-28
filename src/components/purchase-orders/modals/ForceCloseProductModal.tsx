"use client";

import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ForceCloseProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  variantName: string;
  mode: "close" | "undo";
  isSubmitting: boolean;
}

export function ForceCloseProductModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  variantName,
  mode,
  isSubmitting,
}: ForceCloseProductModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[420px] p-0 gap-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <DialogTitle className="text-base font-semibold text-gray-900">
            {mode === "close" ? "Force Close Product" : "Undo Force Close"}
          </DialogTitle>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-[13px] text-[#374151]">
            {mode === "close" ? (
              <>
                Are you sure you want to force close{" "}
                <span className="font-semibold text-[#111827]">{productName}</span>
                {variantName && (
                  <> — <span className="font-medium text-[#6b7280]">{variantName}</span></>
                )}
                ? The pending quantity will no longer be expected.
              </>
            ) : (
              <>
                Are you sure you want to undo force close for{" "}
                <span className="font-semibold text-[#111827]">{productName}</span>
                {variantName && (
                  <> — <span className="font-medium text-[#6b7280]">{variantName}</span></>
                )}
                ? This will reopen the pending quantity.
              </>
            )}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={onConfirm}
            className={
              mode === "close"
                ? "bg-[#ea580c] hover:bg-[#c2410c] text-white"
                : "bg-[#0d9488] hover:bg-[#0f766e] text-white"
            }
          >
            {isSubmitting && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            {mode === "close" ? "Force Close" : "Undo Force Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
