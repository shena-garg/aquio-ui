"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Loader2, X, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { POSummaryStrip } from "@/components/purchase-orders/modals/POSummaryStrip";
import { organizationSettingsService } from "@/services/organization-settings";
import { purchaseOrdersService } from "@/services/purchase-orders";

interface CancelPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderId: string;
  poNumber: string;
  status: string;
  receiptStatus: string;
  supplierName: string;
  issueDate: string;
  orderType?: "purchase" | "sales";
}

export function CancelPOModal({
  isOpen,
  onClose,
  onSuccess,
  orderId,
  poNumber,
  status,
  receiptStatus,
  supplierName,
  issueDate,
  orderType = "purchase",
}: CancelPOModalProps) {
  const isSales = orderType === "sales";
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingReason, setIsAddingReason] = useState(false);

  const { data: settings, isLoading: loadingReasons } = useQuery({
    queryKey: ["organization-settings"],
    queryFn: () => organizationSettingsService.getMyOwn().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  const reasons = isSales
    ? settings?.soCancelReasons ?? []
    : settings?.poCancelReasons ?? [];
  const filteredReasons = reasons.filter((r) =>
    r.toLowerCase().includes(inputValue.toLowerCase())
  );

  const canAddNewReason =
    inputValue.trim().length > 0 &&
    !reasons.some((r) => r.toLowerCase() === inputValue.trim().toLowerCase());

  function resetForm() {
    setReason("");
    setInputValue("");
    setDropdownOpen(false);
    setNotes("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSelectReason(r: string) {
    setReason(r);
    setInputValue(r);
    setDropdownOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    setReason("");
    setDropdownOpen(true);
  }

  function handleInputBlur() {
    // Give mousedown on dropdown items time to fire before closing
    setTimeout(() => {
      setDropdownOpen(false);
      // Restore display to selected reason (or clear if nothing selected)
      setInputValue(reason);
    }, 150);
  }

  async function handleAddNewReason() {
    const newReason = inputValue.trim();
    if (!newReason || isAddingReason) return;

    setIsAddingReason(true);
    try {
      if (isSales) {
        await organizationSettingsService.addSOCancelReason(newReason);
      } else {
        await organizationSettingsService.addPOCancelReason(newReason);
      }
      await queryClient.invalidateQueries({
        queryKey: ["organization-settings"],
      });
      handleSelectReason(newReason);
      toast.success("Reason added");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to add reason";
      toast.error(message);
    } finally {
      setIsAddingReason(false);
    }
  }

  async function handleSubmit() {
    if (!reason || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await purchaseOrdersService.cancel(orderId, {
        cancellationReason: reason,
        ...(notes.trim() ? { cancellationNotes: notes.trim() } : {}),
      });
      toast.success(isSales ? "Sales order cancelled successfully" : "Purchase order cancelled successfully");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? (isSales ? "Failed to cancel sales order" : "Failed to cancel purchase order");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Reset form whenever the modal is dismissed externally
  useEffect(() => {
    if (!isOpen) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {isSales ? "Cancel SO Confirmation" : "Cancel PO Confirmation"}
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
            orderType={orderType}
          />

          {/* Reason combobox */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {isSales ? "Select the reason to cancel SO" : "Select the reason to cancel PO"}{" "}
              <span className="text-red-500">*</span>
            </label>

            {loadingReasons ? (
              <div className="h-9 rounded-md bg-gray-100 animate-pulse" />
            ) : (
              <div className="relative">
                <div className="relative flex items-center border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
                  <Search
                    size={14}
                    className="absolute left-3 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Search or add a reason..."
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={handleInputBlur}
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-md bg-transparent outline-none"
                  />
                </div>

                {dropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredReasons.map((r) => (
                      <button
                        key={r}
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent input blur before selection
                          handleSelectReason(r);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {r}
                      </button>
                    ))}

                    {canAddNewReason && (
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAddNewReason();
                        }}
                        disabled={isAddingReason}
                        className="w-full text-left px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 border-t border-gray-100 flex items-center gap-1.5"
                      >
                        {isAddingReason ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Plus size={14} />
                        )}
                        Add &quot;{inputValue.trim()}&quot;
                      </button>
                    )}

                    {filteredReasons.length === 0 && !canAddNewReason && (
                      <div className="px-3 py-2 text-sm text-gray-400">
                        No reasons found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes
            </label>
            <textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
            No, Don&apos;t Cancel
          </Button>
          <Button
            disabled={!reason || isSubmitting}
            onClick={handleSubmit}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
          >
            {isSubmitting && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Yes, Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
