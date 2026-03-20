import type { SalesOrder } from "@/services/sales-orders";

function formatDate(iso: string): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface SODetailsDateStripProps {
  order: SalesOrder;
}

export function SODetailsDateStrip({ order }: SODetailsDateStripProps) {
  return (
    <div className="grid grid-cols-3 gap-4 border-t border-[#e5e7eb] pt-2 mt-2">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">
          Issue Date
        </span>
        <span className="text-[13px] font-medium text-[#111827]">
          {formatDate(order.issueDate)}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">
          Delivery Date
        </span>
        <span className="text-[13px] font-medium text-[#111827]">
          {formatDate(order.deliveryDate)}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">
          Payment Terms
        </span>
        <span className="text-[13px] font-medium text-[#111827]">
          {order.paymentTerms || "\u2014"}
        </span>
      </div>
    </div>
  );
}
