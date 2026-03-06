"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PurchaseOrder } from "@/services/purchase-orders";
import { QuantityCell } from "@/components/ui/QuantityCell";

interface PODetailsTabsProps {
  order: PurchaseOrder;
}

const TAB_KEYS = ["products", "receipts", "notifications", "activity"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export function PODetailsTabs({ order }: PODetailsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("products");

  const products = order.products ?? [];
  const receiptsCount = order.receipts?.length ?? 0;
  const received = order.totalQuantity - order.pendingQuantity;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "products", label: "Products", count: products.length },
    { key: "receipts", label: "Receipts", count: receiptsCount },
    { key: "notifications", label: "Notifications" },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="flex flex-col flex-1">
      {/* Tab bar */}
      <div className="flex border-b border-[#e5e7eb] bg-white px-8">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-[#0d9488] text-[#111827]"
                  : "border-transparent text-[#6b7280] hover:text-[#111827]",
              )}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span
                  className={cn(
                    "rounded-[10px] px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                    isActive
                      ? "bg-[#fef3c7] text-[#b45309]"
                      : "bg-[#f3f4f6] text-[#6b7280]",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {activeTab === "products" ? (
          <ProductsTable order={order} products={products} received={received} />
        ) : (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            Coming soon
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Products table ──────────────────────────────────────────────────────────── */

function ProductsTable({
  order,
  products,
  received: totalReceived,
}: {
  order: PurchaseOrder;
  products: NonNullable<PurchaseOrder["products"]>;
  received: number;
}) {
  const remainingItems = order.remainingItems ?? [];

  return (
    <div className="border border-[#e5e7eb] rounded-[10px] overflow-hidden mx-8 mt-6 mb-6">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-6 py-3 font-medium">Product</th>
            <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Ordered Qty</th>
            <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Received Qty</th>
            <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Pending Qty</th>
            <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Unit Price</th>
            <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Tax %</th>
            <th className="px-6 py-3 font-medium text-right whitespace-nowrap">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, idx) => {
            const remaining = remainingItems.find(
              (r) =>
                r.productId === product.product._id &&
                r.variantId === product.variant._id,
            );
            const ordered = product.quantity.value;
            const remainingQty = remaining?.remainingQuantity ?? 0;
            const receivedQty = ordered - remainingQty;
            const receivedPct = ordered > 0 ? (receivedQty / ordered) * 100 : 0;
            const isNotReceived = receivedQty === 0;
            const receivedTextColor = isNotReceived
              ? "text-gray-400"
              : "text-green-600";
            const receivedBarColor = isNotReceived
              ? "bg-gray-300"
              : "bg-green-500";

            return (
              <tr
                key={`${product.product._id}-${product.variant._id}-${idx}`}
                className="border-b border-gray-100"
              >
                {/* Product */}
                <td className="px-6 py-3">
                  <div className="font-medium text-gray-900">
                    {product.metadata.product.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {product.metadata.variant.name}
                  </div>
                </td>

                {/* Ordered Qty */}
                <td className="px-6 py-3 text-right text-gray-700 whitespace-nowrap">
                  <QuantityCell value={ordered} uom={product.quantity.postfix} />
                </td>

                {/* Received Qty */}
                <td className="px-6 py-3 text-right whitespace-nowrap">
                  <div className={receivedTextColor}>
                    <QuantityCell value={receivedQty} uom={product.quantity.postfix} />
                  </div>
                  <div className="mt-1 bg-gray-200 rounded h-1 w-20 ml-auto">
                    <div
                      className={cn(receivedBarColor, "rounded h-1")}
                      style={{
                        width: `${Math.min(receivedPct, 100)}%`,
                      }}
                    />
                  </div>
                </td>

                {/* Pending Qty */}
                <td className="px-6 py-3 text-right text-gray-700 whitespace-nowrap">
                  <QuantityCell value={remainingQty} uom={product.quantity.postfix} />
                </td>

                {/* Unit Price */}
                <td className="px-6 py-3 text-right text-gray-700 whitespace-nowrap">
                  ₹ {product.price.value.$numberDecimal}
                </td>

                {/* Tax% */}
                <td className="px-6 py-3 text-right text-gray-700 whitespace-nowrap">
                  {product.gst.value}%
                </td>

                {/* Line Total */}
                <td className="px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                  ₹ {parseFloat(
                    product.totalAmount.$numberDecimal,
                  ).toLocaleString("en-IN")}
                </td>
              </tr>
            );
          })}
        </tbody>

        {/* Footer Total Summary */}
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50 font-bold text-gray-900">
            <td className="px-6 py-3">Total Summary</td>
            <td className="px-6 py-3 text-right whitespace-nowrap">
              <QuantityCell value={order.totalQuantity} uom={order.commonUOM} />
            </td>
            <td className="px-6 py-3 text-right whitespace-nowrap">
              <QuantityCell value={totalReceived} uom={order.commonUOM} />
            </td>
            <td className="px-6 py-3 text-right whitespace-nowrap">
              <QuantityCell value={order.pendingQuantity} uom={order.commonUOM} />
            </td>
            <td className="px-6 py-3" />
            <td className="px-6 py-3" />
            <td className="px-6 py-3 text-right whitespace-nowrap">
              ₹ {(typeof order.totalAmount === "number"
                ? order.totalAmount
                : parseFloat(order.totalAmount.$numberDecimal)
              ).toLocaleString("en-IN")}
            </td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  );
}
