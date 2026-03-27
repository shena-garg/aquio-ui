"use client";

import { useState, useEffect, useRef } from "react";
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
import type { PurchaseOrder, POProduct } from "@/services/purchase-orders";

interface ForceClosePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  order: PurchaseOrder;
  orderType?: "purchase" | "sales";
}

type TableRow = POProduct & {
  remainingQuantity: number;
  remainingProductId: string;
  remainingVariantId: string;
};

function rowKey(row: TableRow) {
  return `${row.remainingProductId}-${row.remainingVariantId}`;
}

export function ForceClosePOModal({
  isOpen,
  onClose,
  onSuccess,
  order,
  orderType = "purchase",
}: ForceClosePOModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Build table rows: remaining items with qty > 0, matched to product details
  const rows: TableRow[] = (order.remainingItems ?? [])
    .filter((r) => r.remainingQuantity > 0)
    .flatMap((remaining) => {
      const product = (order.products ?? []).find(
        (p) =>
          p.product._id === remaining.productId &&
          p.variant._id === remaining.variantId
      );
      return product
        ? [{
            ...product,
            remainingQuantity: remaining.remainingQuantity,
            remainingProductId: remaining.productId,
            remainingVariantId: remaining.variantId,
          }]
        : [];
    });

  // Sync header checkbox indeterminate state
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        selectedKeys.size > 0 && selectedKeys.size < rows.length;
    }
  }, [selectedKeys.size, rows.length]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) setSelectedKeys(new Set());
  }, [isOpen]);

  function handleClose() {
    setSelectedKeys(new Set());
    onClose();
  }

  function toggleAll() {
    if (selectedKeys.size === rows.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(rows.map(rowKey)));
    }
  }

  function toggleRow(row: TableRow) {
    const key = rowKey(row);
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  }

  // Footer totals
  const totalOrderedQty = rows.reduce((sum, r) => sum + r.quantity.value, 0);
  const totalPendingQty = rows.reduce((sum, r) => sum + r.remainingQuantity, 0);
  const totalLineAmount = rows.reduce(
    (sum, r) => sum + parseFloat(r.totalAmount.$numberDecimal),
    0
  );

  async function handleSubmit() {
    if (selectedKeys.size === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const selectedItems = rows
      .filter((r) => selectedKeys.has(rowKey(r)))
      .map((r) => ({ productId: r.remainingProductId, variantId: r.remainingVariantId }));
    try {
      await purchaseOrdersService.forceCloseMultiple(order.id, selectedItems);
      toast.success("Selected products force closed successfully");
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to force close products";
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
        aria-describedby={undefined}
        className="max-w-[860px] w-full flex flex-col max-h-[90vh] p-0 gap-0"
      >
        {/* Header — fixed */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200">
          <DialogTitle className="text-base font-semibold text-gray-900">
            Force Close
          </DialogTitle>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* PO Summary strip — fixed */}
        <div className="px-6 pt-4">
          <POSummaryStrip
            orderId={order.id}
            poNumber={order.poNumber}
            status={order.status}
            receiptStatus={order.receiptStatus}
            supplierName={order.supplier.name}
            issueDate={order.issueDate}
            orderType={orderType}
          />
        </div>

        {/* Products table — scrollable */}
        <div className="flex-1 overflow-auto px-6">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="py-2 pr-3 w-10">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        checked={
                          rows.length > 0 && selectedKeys.size === rows.length
                        }
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-2 pr-4">Product</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Ordered Qty</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Pending Qty</th>
                    <th className="py-2 pr-4 whitespace-nowrap">Unit Price</th>
                    <th className="py-2 text-right whitespace-nowrap">
                      Line Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-sm text-gray-400"
                      >
                        No pending items to force close
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const key = rowKey(row);
                      const isSelected = selectedKeys.has(key);
                      return (
                        <tr
                          key={key}
                          onClick={() => toggleRow(row)}
                          className={`border-b border-gray-100 cursor-pointer transition-colors ${
                            isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 pr-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(row)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                            />
                          </td>

                          {/* Product */}
                          <td className="py-3 pr-4">
                            <div className="font-medium text-gray-900">
                              {row.metadata.product.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {row.metadata.variant.name}
                            </div>
                          </td>

                          {/* Ordered Qty */}
                          <td className="py-3 pr-4 text-gray-700 whitespace-nowrap">
                            {row.quantity.value.toLocaleString()}{" "}
                            {row.quantity.postfix}
                          </td>

                          {/* Pending Qty */}
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <span className="text-[#DC2626]">
                              {row.remainingQuantity.toLocaleString()}{" "}
                              {row.quantity.postfix}
                            </span>
                          </td>

                          {/* Unit Price */}
                          <td className="py-3 pr-4 whitespace-nowrap">
                            <div className="text-gray-900">
                              ₹{row.price.value.$numberDecimal}
                            </div>
                            <div className="text-xs text-gray-400">
                              @ {row.gst.value}% GST
                            </div>
                          </td>

                          {/* Line Total */}
                          <td className="py-3 text-right text-gray-900 whitespace-nowrap">
                            ₹
                            {parseFloat(
                              row.totalAmount.$numberDecimal
                            ).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="py-3 pr-3" />
                      <td className="py-3 pr-4 font-semibold text-gray-900">
                        Total Summary
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-900 whitespace-nowrap">
                        {totalOrderedQty.toLocaleString()} {order.commonUOM}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-900 whitespace-nowrap">
                        {totalPendingQty.toLocaleString()} {order.commonUOM}
                      </td>
                      <td className="py-3 pr-4" />
                      <td className="py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                        ₹{totalLineAmount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
        </div>

        {/* Footer — fixed */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            disabled={selectedKeys.size === 0 || isSubmitting}
            onClick={handleSubmit}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
          >
            {isSubmitting && (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            )}
            Force Close Selected
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
