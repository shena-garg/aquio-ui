import type { PurchaseOrder } from "@/services/purchase-orders";
import { QuantityCell } from "@/components/ui/QuantityCell";

interface PODetailsProgressProps {
  order: PurchaseOrder;
}

export function PODetailsProgress({ order }: PODetailsProgressProps) {
  const isUniformUOM = order.hasUniformUOM !== false;
  const uom = order.commonUOM ?? "";

  const totalQuantity = order.totalQuantity ?? order.products?.reduce((sum, p) => sum + p.quantity.value, 0) ?? 0;
  const totalReceived = order.receipts?.reduce((sum, r) => sum + r.products.reduce((s, p) => s + p.deliveredQuantity, 0), 0) ?? 0;
  const pendingQuantity = order.pendingQuantity ?? (totalQuantity - totalReceived);

  const completionPct = order.receiptCompletionPercentage > 0
    ? order.receiptCompletionPercentage
    : totalQuantity > 0
      ? Math.min(100, Math.round((totalReceived / totalQuantity) * 100))
      : 0;

  return (
    <div className="mx-8 mt-3 mb-3">
      <div className="rounded-[10px] border border-[#f3f4f6] bg-white px-4 pt-[10px] pb-3 flex flex-col gap-2">
        {/* KPI Row */}
        <div className="flex gap-4">
          {isUniformUOM ? (
            <>
              <div className="flex-1 flex flex-col gap-[2px] border-r border-[#e5e7eb] pr-3">
                <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">
                  Total Ordered
                </span>
                <span className="text-[13px] font-semibold text-[#111827]">
                  <QuantityCell value={totalQuantity} uom={uom} />
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-[2px] border-r border-[#e5e7eb] pr-3">
                <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">
                  Received
                </span>
                <span className="text-[13px] font-semibold text-[#111827]">
                  <QuantityCell value={totalReceived} uom={uom} />
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-[2px] border-r border-[#e5e7eb] pr-3">
                <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">
                  Pending
                </span>
                <span className="text-[13px] font-semibold text-[#111827]">
                  <QuantityCell value={pendingQuantity} uom={uom} />
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center border-r border-[#e5e7eb] pr-3">
              <span className="text-[13px] text-[#6b7280]">
                Mixed units — see products tab
              </span>
            </div>
          )}

          <div className="flex-1 flex flex-col gap-[2px]">
            <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">
              Total Value
            </span>
            <span className="text-[13px] font-semibold text-[#111827]">
              ₹{" "}
              {(typeof order.totalAmount === "number"
                ? order.totalAmount
                : parseFloat(order.totalAmount.$numberDecimal)
              ).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-[2px]">
          <div className="h-2 rounded-full bg-[#f3f4f6]">
            <div
              className="h-2 rounded-full bg-[#0d9488]"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
