import { Info } from "lucide-react";
import type { SalesOrder } from "@/services/sales-orders";

interface SODetailsMetaStripProps {
  order: SalesOrder;
}

export function SODetailsMetaStrip({ order }: SODetailsMetaStripProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">
          Supplier
        </span>
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111827]">
          {order.supplier?.name ?? "\u2014"}
          <Info className="h-4 w-4 text-[#9ca3af] flex-shrink-0" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">
          Consignee
        </span>
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111827]">
          {order.buyer?.name ?? "\u2014"}
          <Info className="h-4 w-4 text-[#9ca3af] flex-shrink-0" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">
          Buyer
        </span>
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111827]">
          {order.biller?.name ?? "\u2014"}
          <Info className="h-4 w-4 text-[#9ca3af] flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
