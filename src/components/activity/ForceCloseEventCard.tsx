"use client";

import { EventBadge } from "./EventBadge";
import { EventCardShell } from "./EventCardShell";
import type { ParsedEvent } from "./types";

interface ForceCloseEventCardProps {
  parsed: ParsedEvent;
  poProducts: any[];
  isExpanded: boolean;
  onToggle: () => void;
}

function resolveProductName(
  poProducts: any[],
  productId: string,
  variantId?: string
): { name: string; variantName: string } {
  const line = poProducts.find(
    (p: any) =>
      (p.product?._id === productId || p.product?.id === productId) &&
      (!variantId ||
        p.variant?._id === variantId ||
        p.variant?.id === variantId)
  );
  return {
    name: line?.product?.value ?? line?.metadata?.product?.name ?? "Unknown Product",
    variantName: line?.variant?.value ?? line?.metadata?.variant?.name ?? "",
  };
}

export function ForceCloseEventCard({
  parsed,
  poProducts,
  isExpanded,
  onToggle,
}: ForceCloseEventCardProps) {
  const nv = parsed.event.newValues ?? {};
  const meta = parsed.event.metadata ?? {};
  const { name, variantName } = resolveProductName(
    poProducts,
    nv.productId,
    nv.variantId
  );
  const poStatus = meta.purchaseOrderStatus as string | undefined;

  return (
    <EventCardShell
      dotColor="bg-[#f97316]"
      title="Item Force Closed"
      userName={parsed.userName}
      formattedDate={parsed.formattedDate}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-[#6b7280]">Product Closed</p>
          <p className="text-sm text-[#111827]">
            {name}
            {variantName && (
              <span className="text-[#6b7280]"> · {variantName}</span>
            )}
          </p>
        </div>

        {poStatus && (
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-[#6b7280]">
              PO Status changed to
            </p>
            <EventBadge status={poStatus} />
          </div>
        )}
      </div>
    </EventCardShell>
  );
}
