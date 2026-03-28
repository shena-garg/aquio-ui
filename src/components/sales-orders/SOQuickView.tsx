"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SalesOrder, SOOrderStatus } from "@/services/sales-orders";

// ── Badge configs ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SOOrderStatus, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  issued:    { label: "Issued",    className: "bg-blue-50 text-blue-700 border border-blue-200" },
  completed: { label: "Completed", className: "bg-green-50 text-green-700 border border-green-200" },
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-500 border border-gray-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border border-red-200" },
};

type SOReceiptStatus = SalesOrder["receiptStatus"];

const RECEIPT_STATUS_CONFIG: Record<SOReceiptStatus, { label: string; className: string }> = {
  pending:            { label: "Pending",          className: "bg-gray-100 text-gray-500 border border-gray-200" },
  partial:            { label: "Partial",          className: "bg-amber-50 text-amber-700 border border-amber-200" },
  completed:          { label: "Completed",        className: "bg-green-50 text-green-700 border border-green-200" },
  "force closed":     { label: "Force Closed",     className: "bg-red-50 text-red-600 border border-red-200" },
  "excess delivered": { label: "Excess Delivered", className: "bg-purple-50 text-purple-700 border border-purple-200" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Component ────────────────────────────────────────────────────────────────

interface SOQuickViewProps {
  po: SalesOrder;
  onClose: () => void;
}

export function SOQuickView({ po, onClose }: SOQuickViewProps) {
  const router = useRouter();
  const products = po.products ?? [];
  const remainingItems = po.remainingItems ?? [];

  const totalAmount =
    typeof po.totalAmount === "number"
      ? po.totalAmount
      : parseFloat(po.totalAmount.$numberDecimal);

  // Compute shipped qty per product from remainingItems
  function getShippedQty(productId: string, variantId: string, ordered: number): number {
    const rem = remainingItems.find(
      (r) => r.productId === productId && r.variantId === variantId
    );
    return ordered - (rem?.remainingQuantity ?? 0);
  }

  // Totals for summary
  const totalOrdered = products.reduce((s, p) => s + p.quantity.value, 0);
  const totalShipped = products.reduce((s, p) => {
    return s + getShippedQty(p.product._id, p.variant._id, p.quantity.value);
  }, 0);

  const hasUniformUOM = po.hasUniformUOM !== false;
  const commonUOM = po.commonUOM ?? "";

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const statusCfg = STATUS_CONFIG[po.status];
  const receiptCfg = RECEIPT_STATUS_CONFIG[po.receiptStatus];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[580px] bg-white shadow-xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2.5">
            <span className="text-[16px] font-semibold text-[#111827]">
              {po.poNumber}
            </span>
            {statusCfg && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCfg.className}`}>
                {statusCfg.label}
              </span>
            )}
            {receiptCfg && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${receiptCfg.className}`}>
                {receiptCfg.label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Meta row */}
          <div className="flex items-center gap-4 px-6 py-4 text-[12px] text-[#6b7280]">
            <span>Issued {formatDate(po.issueDate)}</span>
            <span>·</span>
            <span>Due {formatDate(po.deliveryDate)}</span>
            {po.paymentTerms && (
              <>
                <span>·</span>
                <span>{po.paymentTerms}</span>
              </>
            )}
          </div>

          {/* Partners */}
          <div className="grid grid-cols-3 gap-3 px-6 pb-4">
            <div>
              <span className="block text-[11px] font-semibold text-[#6b7280] mb-0.5">Supplier</span>
              <span className="text-[13px] font-medium text-[#111827]">{po.supplier?.name ?? "—"}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-[#6b7280] mb-0.5">Consignee</span>
              <span className="text-[13px] font-medium text-[#111827]">{po.buyer?.name ?? "—"}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-[#6b7280] mb-0.5">Buyer</span>
              <span className="text-[13px] font-medium text-[#111827]">{po.biller?.name ?? "—"}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#e5e7eb]" />

          {/* Products table */}
          {products.length > 0 ? (
            <div className="px-6 py-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    <th className="text-left py-2 pr-2 text-[11px] font-semibold text-[#6b7280]">Product</th>
                    <th className="text-right py-2 px-2 text-[11px] font-semibold text-[#6b7280] whitespace-nowrap">Qty</th>
                    <th className="text-right py-2 px-2 text-[11px] font-semibold text-[#6b7280] whitespace-nowrap">Remaining</th>
                    <th className="text-right py-2 px-2 text-[11px] font-semibold text-[#6b7280] whitespace-nowrap">Price</th>
                    <th className="text-right py-2 px-2 text-[11px] font-semibold text-[#6b7280] whitespace-nowrap">GST%</th>
                    <th className="text-right py-2 pl-2 text-[11px] font-semibold text-[#6b7280] whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, idx) => {
                    const lineTotal = parseFloat(p.totalAmount.$numberDecimal);
                    const price = parseFloat(p.price.value.$numberDecimal);
                    const ordered = p.quantity.value;
                    const rem = remainingItems.find(
                      (r) => r.productId === p.product._id && r.variantId === p.variant._id
                    );
                    const remainingQty = rem?.remainingQuantity ?? 0;
                    const isForceClosed = rem?.status === "forcefully closed";

                    return (
                      <tr
                        key={`${p.product._id}-${p.variant._id}-${idx}`}
                        className="border-b border-[#f3f4f6] last:border-b-0"
                      >
                        <td className="py-3 pr-2">
                          <div className="text-[13px] font-medium text-[#111827] leading-tight">
                            {p.metadata.product.name}
                          </div>
                          <div className="text-[11px] text-[#6b7280] leading-tight">
                            {p.metadata.variant.name}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right text-[13px] text-[#111827] whitespace-nowrap">
                          {ordered.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                          {p.quantity.postfix && (
                            <span className="text-[11px] text-[#9ca3af] ml-0.5">{p.quantity.postfix}</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          {isForceClosed ? (
                            <div className="flex flex-col items-end">
                              <span className="text-[13px] line-through text-[#9ca3af]">
                                {remainingQty.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                                {p.quantity.postfix && (
                                  <span className="text-[11px] ml-0.5">{p.quantity.postfix}</span>
                                )}
                              </span>
                              <span className="text-[10px] font-medium text-[#ea580c]">Force Closed</span>
                            </div>
                          ) : (
                            <span className={`text-[13px] ${remainingQty > 0 ? "text-[#dc2626] font-medium" : "text-[#111827]"}`}>
                              {remainingQty.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                              {p.quantity.postfix && (
                                <span className="text-[11px] text-[#9ca3af] ml-0.5">{p.quantity.postfix}</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right text-[13px] text-[#111827] whitespace-nowrap">
                          ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right text-[13px] text-[#9ca3af] whitespace-nowrap">
                          {p.gst.value}%
                        </td>
                        <td className="py-3 pl-2 text-right text-[13px] font-medium text-[#111827] whitespace-nowrap">
                          ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#e5e7eb]">
                    {/* Product column — empty */}
                    <td className="py-3 pr-2" />
                    {/* Qty column — Total Qty */}
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      {hasUniformUOM && po.totalQuantity != null ? (
                        <span className="text-[13px] font-semibold text-[#111827]">
                          {totalOrdered.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                          <span className="text-[11px] text-[#9ca3af] font-normal ml-0.5">{commonUOM}</span>
                        </span>
                      ) : null}
                    </td>
                    {/* Remaining column — Total Remaining */}
                    <td className="py-3 px-2 text-right whitespace-nowrap">
                      {hasUniformUOM && po.totalQuantity != null ? (
                        <span className="text-[13px] font-semibold text-[#111827]">
                          {(totalOrdered - totalShipped).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                          <span className="text-[11px] text-[#9ca3af] font-normal ml-0.5">{commonUOM}</span>
                        </span>
                      ) : null}
                    </td>
                    {/* Price column — empty */}
                    <td className="py-3 px-2" />
                    {/* GST% column — "Total" label */}
                    <td className="py-3 px-2 text-right text-[13px] font-semibold text-[#111827]">Total</td>
                    {/* Total column — Total Amount */}
                    <td className="py-3 pl-2 text-right whitespace-nowrap">
                      <span className="text-[15px] font-semibold text-[#111827]">
                        ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-[13px] text-[#6b7280]">
              No products
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e5e7eb]">
          <Button
            className="w-full h-9 bg-[#0d9488] hover:bg-[#0f766e] text-white text-[13px] font-medium rounded-[6px]"
            onClick={() => {
              onClose();
              router.push(`/sales-orders/${po._id}`);
            }}
          >
            View Full Details →
          </Button>
        </div>
      </div>
    </>
  );
}
