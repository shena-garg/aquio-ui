"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X, Plus, Paperclip } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { getUOMAbbreviation } from "@/lib/uom";
import apiClient from "@/lib/api-client";
import type {
  PurchaseOrder,
  POReceipt,
} from "@/services/purchase-orders";

interface ReceiptFormModalProps {
  mode: "create" | "edit";
  orderId: string;
  order: PurchaseOrder;
  receipt?: POReceipt;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderType?: "purchase" | "sales";
}

interface ProductRow {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  unitPrice: string;
  taxRate: number;
  ordered: number;
  uom: string;
  alreadyReceived: number;
  remaining: number;
  deliveredQuantity: number;
}

interface UploadedFile {
  id: string;
  name: string;
}

function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayString(): string {
  return formatDateInput(new Date());
}

export function ReceiptFormModal({
  mode,
  orderId,
  order,
  receipt,
  isOpen,
  onClose,
  onSuccess,
  orderType = "purchase",
}: ReceiptFormModalProps) {
  const isSales = orderType === "sales";
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const products = order.products ?? [];
  const receipts = order.receipts ?? [];

  function buildRows(): ProductRow[] {
    return products.map((p) => {
      const ordered = p.quantity.value;

      const alreadyReceived = receipts.reduce((sum, r) => {
        if (mode === "edit" && receipt && r._id === receipt._id) return sum;
        const rp = r.products.find(
          (rp) =>
            rp.productId === p.product._id && rp.variantId === p.variant._id,
        );
        return sum + (rp?.deliveredQuantity ?? 0);
      }, 0);

      const remaining = Math.max(0, ordered - alreadyReceived);

      let deliveredQuantity = 0;
      if (mode === "edit" && receipt) {
        const rp = receipt.products.find(
          (rp) =>
            rp.productId === p.product._id && rp.variantId === p.variant._id,
        );
        deliveredQuantity = rp?.deliveredQuantity ?? 0;
      }

      return {
        productId: p.product._id,
        variantId: p.variant._id,
        productName: p.metadata.product.name,
        variantName: p.metadata.variant.name,
        unitPrice: p.price.value.$numberDecimal,
        taxRate: p.gst.value,
        ordered,
        uom: p.quantity.postfix,
        alreadyReceived,
        remaining,
        deliveredQuantity,
      };
    });
  }

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(todayString());
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dateError, setDateError] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRows(buildRows());
      setDeliveryDate(
        mode === "edit" && receipt
          ? formatDateInput(new Date(receipt.deliveryDate))
          : todayString(),
      );
      setNotes(mode === "edit" && receipt ? receipt.notes ?? "" : "");
      setFiles(
        mode === "edit" && receipt && receipt.files
          ? receipt.files.map((f: any) => ({
              id: f.id ?? f._id ?? "",
              name: f.name ?? f.fileName ?? "File",
            }))
          : [],
      );
      setDateError("");
      setAttempted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  function handleDateChange(value: string) {
    setDeliveryDate(value);
    if (value > todayString()) {
      setDateError("Future dates are not allowed");
    } else {
      setDateError("");
    }
  }

  function updateQuantity(index: number, value: number) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], deliveredQuantity: Math.max(0, value) };
      return next;
    });
  }

  function resetQuantity(index: number) {
    updateQuantity(index, 0);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await apiClient.post("/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const uploaded = res.data;
        setFiles((prev) => [
          ...prev,
          {
            id: uploaded.id ?? uploaded._id ?? "",
            name: uploaded.name ?? uploaded.fileName ?? file.name,
          },
        ]);
      }
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const totalReceiving = rows.reduce((s, r) => s + r.deliveredQuantity, 0);
  const hasAnyQuantity = rows.some((r) => r.deliveredQuantity > 0);
  const includedCount = rows.filter((r) => r.deliveredQuantity > 0).length;
  const notesRequired = !hasAnyQuantity;

  // Calculate total value of included products (qty * unit price * (1 + tax/100))
  const totalValue = rows.reduce((sum, r) => {
    if (r.deliveredQuantity <= 0) return sum;
    const price = parseFloat(r.unitPrice) || 0;
    return sum + r.deliveredQuantity * price * (1 + r.taxRate / 100);
  }, 0);

  const canSubmit =
    !isSubmitting &&
    !dateError &&
    deliveryDate &&
    (hasAnyQuantity || notes.trim().length > 0);

  async function handleSubmit() {
    setAttempted(true);
    if (!canSubmit) return;
    console.log("orderId:", orderId);
    setIsSubmitting(true);

    const payload = {
      products: rows
        .filter((r) => r.deliveredQuantity > 0)
        .map((r) => ({
          productId: r.productId,
          variantId: r.variantId,
          deliveredQuantity: r.deliveredQuantity,
          allowExcess: r.deliveredQuantity > r.remaining,
        })),
      deliveryDate,
      notes: notes.trim(),
      files: files.map((f) => ({ id: f.id, name: f.name })),
    };

    try {
      if (mode === "create") {
        await apiClient.post(`/purchase-orders/${orderId}/receipts`, payload);
        toast.success(isSales ? "Shipment created successfully" : "Receipt created successfully");
      } else {
        await apiClient.patch(
          `/purchase-orders/${orderId}/receipts/${receipt!._id}`,
          payload,
        );
        toast.success(isSales ? "Shipment updated successfully" : "Receipt updated successfully");
      }
      if (isSales) {
        queryClient.invalidateQueries({ queryKey: ["sales-order", orderId] });
        queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] });
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        `Failed to ${mode === "create" ? "create" : "update"} ${isSales ? "shipment" : "receipt"}`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeRows = rows.filter((r) => r.deliveredQuantity > 0);
  const activeUOMs = [...new Set(activeRows.map((r) => getUOMAbbreviation(r.uom)))];
  const totalQtyDisplay = activeUOMs.length === 1
    ? `${totalReceiving.toLocaleString("en-IN")} ${activeUOMs[0]}`
    : activeUOMs.length === 0
      ? "—"
      : `${totalReceiving.toLocaleString("en-IN")} (mixed units)`;

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-[780px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] flex-shrink-0">
          <h2 className="text-[16px] font-semibold text-[#111827]">
            {mode === "create"
              ? (isSales ? "Create Shipment" : "Create Receipt")
              : (isSales ? "Edit Shipment" : "Edit Receipt")}
          </h2>
          <button
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#6b7280] transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Delivery date */}
          <div className="mb-4">
            <label className="block text-[11px] font-semibold text-[#6b7280] mb-1.5 uppercase tracking-[0.5px]">
              Delivery Date <span className="text-[#dc2626]">*</span>
            </label>
            <input
              type="date"
              value={deliveryDate}
              max={todayString()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full h-9 border border-[#e5e7eb] rounded-[6px] px-3 text-[13px] text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
            />
            {dateError && (
              <p className="mt-1 text-[12px] text-[#dc2626]">{dateError}</p>
            )}
          </div>

          {/* Products table */}
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#6b7280] mb-2 uppercase tracking-[0.5px]">
              Products
            </div>
            <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
              <table className="w-full min-w-[500px]">
                <colgroup>
                  <col style={{ width: '35%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                    <th className="text-left py-2 pl-3 pr-2 text-[11px] font-semibold text-[#6b7280]">
                      Product
                    </th>
                    <th className="text-right py-2 px-2 text-[11px] font-semibold text-[#6b7280] whitespace-nowrap">
                      Price
                    </th>
                    <th className="text-right py-2 px-2 text-[11px] font-semibold text-[#6b7280] whitespace-nowrap">
                      Order
                    </th>
                    <th className="text-right py-2 px-2 text-[11px] font-semibold text-[#6b7280] whitespace-nowrap">
                      Remaining
                    </th>
                    <th className="text-right py-2 pl-2 pr-3 text-[11px] font-semibold text-[#6b7280] whitespace-nowrap">
                      {isSales ? "Qty Shipped" : "Qty Received"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const isActive = row.deliveredQuantity > 0;
                    return (
                      <tr
                        key={`${row.productId}:${row.variantId}`}
                        className={`border-b border-[#e5e7eb] last:border-b-0 ${isActive ? "bg-[#f0fdfa]" : ""}`}
                      >
                        {/* Product */}
                        <td className="py-2.5 pl-3 pr-2">
                          <div className="flex flex-col gap-[2px]">
                            <span className="text-[13px] font-medium text-[#111827] leading-[16.9px]">
                              {row.productName}
                            </span>
                            <span className="text-[12px] font-normal text-[#6b7280] leading-[15.6px]">
                              {row.variantName}
                            </span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-2.5 px-2 text-right text-[13px] text-[#6b7280] whitespace-nowrap">
                          ₹ {parseFloat(row.unitPrice).toLocaleString("en-IN")} @ {row.taxRate}%
                        </td>

                        {/* Order */}
                        <td className="py-2.5 px-2 text-right text-[13px] text-[#6b7280] whitespace-nowrap">
                          {row.ordered.toLocaleString("en-IN")}
                        </td>

                        {/* Remaining */}
                        <td className="py-2.5 px-2 text-right text-[13px] text-[#6b7280] whitespace-nowrap">
                          {row.remaining.toLocaleString("en-IN")}
                        </td>

                        {/* Qty Received input */}
                        <td className="py-2.5 pl-2 pr-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={row.deliveredQuantity === 0 ? "" : row.deliveredQuantity.toLocaleString("en-IN")}
                              placeholder="0"
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9]/g, "");
                                updateQuantity(idx, raw === "" ? 0 : parseInt(raw, 10));
                              }}
                              onFocus={(e) => {
                                const len = e.target.value.length;
                                e.target.setSelectionRange(len, len);
                              }}
                              className="w-full h-8 border border-[#e5e7eb] rounded-[6px] px-2.5 text-[13px] text-right text-[#111827] outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                            />
                            <span className="text-[12px] text-[#6b7280] whitespace-nowrap">
                              {getUOMAbbreviation(row.uom)}
                            </span>
                            <button
                              type="button"
                              onClick={() => resetQuantity(idx)}
                              className={`flex items-center justify-center w-5 h-5 rounded-full text-[#9ca3af] hover:text-[#dc2626] hover:bg-[#fee2e2] transition-colors flex-shrink-0 ${isActive ? "visible" : "invisible"}`}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary bar — 3 columns */}
          <div className="grid grid-cols-3 divide-x divide-[#e5e7eb] border border-[#e5e7eb] rounded-lg bg-[#f9fafb] mb-4">
            <div className="px-4 py-3">
              <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                Products Included
              </div>
              <div className="text-[15px] font-semibold text-[#111827] mt-0.5">
                {includedCount} of {rows.length}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                Total Value
              </div>
              <div className="text-[15px] font-semibold text-[#111827] mt-0.5">
                ₹ {totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                {isSales ? "Total Qty Shipped" : "Total Qty Received"}
              </div>
              <div className="text-[15px] font-semibold text-[#111827] mt-0.5">
                {totalQtyDisplay}
              </div>
            </div>
          </div>

          {/* Notes & Documents — side by side */}
          <div className="grid grid-cols-2 gap-6">
          {/* Notes */}
          <div>
            <label className="flex items-baseline gap-1.5 text-[11px] font-semibold text-[#6b7280] mb-1.5 uppercase tracking-[0.5px]">
              Notes
              <span
                className={
                  attempted && notesRequired && !notes.trim()
                    ? "text-[#dc2626] normal-case tracking-normal font-normal"
                    : "text-[#9ca3af] normal-case tracking-normal font-normal"
                }
              >
                (required if no quantities entered)
              </span>
            </label>
            <textarea
              placeholder={isSales ? "Add notes about this shipment..." : "Add notes about this receipt..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`w-full border rounded-[6px] px-3 py-2 text-[13px] text-[#111827] resize-none outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] ${
                attempted && notesRequired && !notes.trim()
                  ? "border-[#dc2626]"
                  : "border-[#e5e7eb]"
              }`}
            />
          </div>

          {/* Documents */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
              Documents
            </span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2 items-center">
              {files.map((file, idx) => (
                <div
                  key={`${file.id}-${idx}`}
                  className="flex items-center gap-1.5 bg-[#f3f4f6] rounded px-2 py-1"
                >
                  <Paperclip size={12} className="text-[#6b7280]" />
                  <span className="text-[12px] text-[#111827]">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-[#9ca3af] hover:text-[#dc2626] transition-colors ml-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1 text-[13px] font-medium text-[#0d9488] hover:text-[#0f766e] transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                {isUploading ? "Uploading..." : "Attach"}
              </button>
              <span className="text-[11px] text-[#9ca3af]">Max 10MB per file</span>
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e5e7eb] flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 px-3.5 rounded-[6px] text-[13px] font-medium"
          >
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="h-9 px-3.5 rounded-[6px] bg-[#0d9488] hover:bg-[#0f766e] text-white text-[13px] font-medium"
          >
            {isSubmitting && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            {mode === "create" ? (isSales ? "Create Shipment" : "Create Receipt") : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
