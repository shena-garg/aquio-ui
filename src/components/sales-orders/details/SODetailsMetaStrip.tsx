"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import type { SalesOrder, OrderEntity } from "@/services/sales-orders";
import { EntityInfoDrawer } from "@/components/purchase-orders/details/EntityInfoDrawer";

interface SODetailsMetaStripProps {
  order: SalesOrder;
}

export function SODetailsMetaStrip({ order }: SODetailsMetaStripProps) {
  const [activeEntity, setActiveEntity] = useState<{ entity: OrderEntity; label: string } | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">
            Supplier
          </span>
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111827]">
            {order.supplier?.name ?? "—"}
            {order.supplier && (
              <button onClick={() => setActiveEntity({ entity: order.supplier, label: "Supplier" })}>
                <Info className="h-4 w-4 text-[#9ca3af] hover:text-[#6b7280] flex-shrink-0 transition-colors" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">
            Consignee
          </span>
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111827]">
            {order.consignee?.name ?? "—"}
            {order.consignee && (
              <button onClick={() => setActiveEntity({ entity: order.consignee!, label: "Consignee" })}>
                <Info className="h-4 w-4 text-[#9ca3af] hover:text-[#6b7280] flex-shrink-0 transition-colors" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">
            Buyer
          </span>
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#111827]">
            {order.biller?.name ?? "—"}
            {order.biller && (
              <button onClick={() => setActiveEntity({ entity: order.biller!, label: "Buyer" })}>
                <Info className="h-4 w-4 text-[#9ca3af] hover:text-[#6b7280] flex-shrink-0 transition-colors" />
              </button>
            )}
          </div>
        </div>
      </div>

      <EntityInfoDrawer
        entity={activeEntity?.entity ?? null}
        label={activeEntity?.label ?? ""}
        onClose={() => setActiveEntity(null)}
      />
    </>
  );
}
