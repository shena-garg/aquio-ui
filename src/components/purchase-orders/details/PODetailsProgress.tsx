import type { PurchaseOrder } from "@/services/purchase-orders";
import { QuantityCell } from "@/components/ui/QuantityCell";

interface PODetailsProgressProps {
  order: PurchaseOrder;
}

export function PODetailsProgress({ order }: PODetailsProgressProps) {
  const received = order.totalQuantity - order.pendingQuantity;

  return (
    <div className="mx-8 mt-3 mb-3">
      <div className="rounded-[10px] border border-[#f3f4f6] bg-white px-4 pt-[10px] pb-3 flex flex-col gap-2">
        {/* KPI Row */}
        <div className="flex gap-4">
          <div className="flex-1 flex flex-col gap-[2px] border-r border-[#e5e7eb] pr-3">
            <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">
              Total Ordered
            </span>
            <span className="text-[13px] font-semibold text-[#111827]">
              <QuantityCell value={order.totalQuantity} uom={order.commonUOM} />
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-[2px] border-r border-[#e5e7eb] pr-3">
            <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">
              Received
            </span>
            <span className="text-[13px] font-semibold text-[#111827]">
              <QuantityCell value={received} uom={order.commonUOM} />
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-[2px] border-r border-[#e5e7eb] pr-3">
            <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">
              Pending
            </span>
            <span className="text-[13px] font-semibold text-[#111827]">
              <QuantityCell value={order.pendingQuantity} uom={order.commonUOM} />
            </span>
          </div>

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
              style={{ width: `${order.receiptCompletionPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
