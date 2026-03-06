"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { POSummaryStrip } from "@/components/purchase-orders/modals/POSummaryStrip";
import { purchaseOrdersService } from "@/services/purchase-orders";

interface ConfirmPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderId: string;
  poNumber: string;
  status: string;
  receiptStatus: string;
  supplierName: string;
  issueDate: string;
}

export function ConfirmPOModal({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  poNumber,
  status,
  receiptStatus,
  supplierName,
  issueDate,
}: ConfirmPOModalProps) {
  const [supplierReferenceId, setSupplierReferenceId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setSupplierReferenceId("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await purchaseOrdersService.confirm(
        orderId,
        supplierReferenceId.trim()
          ? { supplierReferenceId: supplierReferenceId.trim() }
          : undefined
      );
      toast.success("Purchase order confirmed successfully");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to confirm purchase order";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

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
            Confirm PO
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
          <POSummaryStrip
            orderId={orderId}
            poNumber={poNumber}
            status={status}
            receiptStatus={receiptStatus}
            supplierName={supplierName}
            issueDate={issueDate}
          />

          {/* Supplier Reference ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Supplier Reference ID
            </label>
            <input
              type="text"
              placeholder="Enter supplier reference"
              value={supplierReferenceId}
              onChange={(e) => setSupplierReferenceId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            No, Don&apos;t Confirm
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
          >
            {isSubmitting && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Yes, Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
