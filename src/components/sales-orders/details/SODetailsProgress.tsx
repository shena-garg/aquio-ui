import type { SalesOrder } from "@/services/sales-orders";
import { QuantityCell } from "@/components/ui/QuantityCell";

interface SODetailsProgressProps {
  order: SalesOrder;
}

export function SODetailsProgress({ order }: SODetailsProgressProps) {
  const isUniformUOM = order.hasUniformUOM !== false;
  const uom = order.commonUOM ?? "";

  const totalQuantity = order.totalQuantity ?? order.products?.reduce((sum, p) => sum + p.quantity.value, 0) ?? 0;
  const totalShipped = order.receipts?.reduce((sum, r) => sum + r.products.reduce((s, p) => s + p.deliveredQuantity, 0), 0) ?? 0;
  const pendingQuantity = order.pendingQuantity ?? (totalQuantity - totalShipped);

  const completionPct = order.receiptCompletionPercentage > 0
    ? order.receiptCompletionPercentage
    : totalQuantity > 0
      ? Math.min(100, Math.round((totalShipped / totalQuantity) * 100))
      : 0;

  const totalValueDisplay = (
    <span className="text-[13px] font-semibold text-[#111827]">
      ₹{" "}
      {(typeof order.totalAmount === "number"
        ? order.totalAmount
        : parseFloat(order.totalAmount.$numberDecimal)
      ).toLocaleString("en-IN")}
    </span>
  );

  const progressBar = (
    <div className="h-2 rounded-full bg-[#f3f4f6]">
      <div
        className="h-2 rounded-full bg-[#0d9488]"
        style={{ width: `${completionPct}%` }}
      />
    </div>
  );

  return (
    <div className="mx-4 sm:mx-8 mt-3 mb-3">
      {/* -- Desktop: single row -- */}
      <div className="hidden sm:block rounded-[10px] border border-[#f3f4f6] bg-white px-4 pt-[10px] pb-3 flex flex-col gap-2">
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
                  Shipped
                </span>
                <span className="text-[13px] font-semibold text-[#111827]">
                  <QuantityCell value={totalShipped} uom={uom} />
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
            {totalValueDisplay}
          </div>
        </div>

        <div className="mt-[2px]">
          {progressBar}
        </div>
      </div>

      {/* -- Mobile: Total Ordered + Total Value -> Progress -> Shipped + Pending -- */}
      <div className="sm:hidden rounded-[10px] border border-[#f3f4f6] bg-white px-4 pt-[10px] pb-3 flex flex-col gap-2.5">
        {/* Top row: Total Ordered (left) | Total Value (right) */}
        <div className="flex items-start justify-between">
          {isUniformUOM ? (
            <div className="flex flex-col gap-[2px]">
              <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">
                Total Ordered
              </span>
              <span className="text-[13px] font-semibold text-[#111827]">
                <QuantityCell value={totalQuantity} uom={uom} />
              </span>
            </div>
          ) : (
            <div className="flex items-center">
              <span className="text-[12px] text-[#6b7280]">
                Mixed units
              </span>
            </div>
          )}

          <div className="flex flex-col gap-[2px] items-end">
            <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">
              Total Value
            </span>
            {totalValueDisplay}
          </div>
        </div>

        {/* Progress bar */}
        {progressBar}

        {/* Bottom row: Shipped (left) | Pending (right) */}
        {isUniformUOM && (
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-[2px]">
              <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">
                Shipped
              </span>
              <span className="text-[13px] font-semibold text-[#111827]">
                <QuantityCell value={totalShipped} uom={uom} />
              </span>
            </div>

            <div className="flex flex-col gap-[2px] items-end">
              <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">
                Pending
              </span>
              <span className="text-[13px] font-semibold text-[#111827]">
                <QuantityCell value={pendingQuantity} uom={uom} />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
