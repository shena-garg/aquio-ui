"use client";

import { EventBadge } from "./EventBadge";
import { EventCardShell } from "./EventCardShell";
import { FieldGrid } from "./fields/FieldGrid";
import type { ParsedEvent } from "./types";

interface ReceiptEventCardProps {
  parsed: ParsedEvent;
  poProducts: any[];
  isExpanded: boolean;
  onToggle: () => void;
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function resolveProductInfo(
  poProducts: any[],
  productId: string,
  variantId: string
): { name: string; variantName: string; uom: string } {
  const line = poProducts.find(
    (p: any) =>
      (p.product?._id === productId || p.product?.id === productId) &&
      (p.variant?._id === variantId || p.variant?.id === variantId)
  );
  return {
    name: line?.product?.value ?? line?.metadata?.product?.name ?? "Unknown Product",
    variantName: line?.variant?.value ?? line?.metadata?.variant?.name ?? "",
    uom: line?.quantity?.postfix ?? "",
  };
}

export function ReceiptEventCard({
  parsed,
  poProducts,
  isExpanded,
  onToggle,
}: ReceiptEventCardProps) {
  const nv = parsed.event.newValues ?? {};
  const meta = parsed.event.metadata ?? {};
  const deliveryDate = formatDate(nv.deliveryDate);
  const products: any[] = nv.products ?? [];
  const poStatus = meta.purchaseOrderStatus as string | undefined;

  const titleParts = ["Receipt Recorded"];
  if (nv.deliveryDate) titleParts.push(`· ${deliveryDate}`);
  const title = titleParts.join(" ");

  const gridItems = [
    { label: "Delivery Date", value: deliveryDate },
    ...(nv.notes ? [{ label: "Notes", value: nv.notes }] : []),
  ];

  return (
    <EventCardShell
      dotColor="bg-[#8b5cf6]"
      title={title}
      badge={poStatus ? <EventBadge status={poStatus} /> : undefined}
      userName={parsed.userName}
      formattedDate={parsed.formattedDate}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        <FieldGrid items={gridItems} />

        {products.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#6b7280]">
              Products Received
            </p>
            {products.map((p: any, i: number) => {
              const { name, variantName, uom } = resolveProductInfo(
                poProducts,
                p.productId,
                p.variantId
              );
              const qty = p.deliveredQuantity ?? 0;
              return (
                <div
                  key={i}
                  className="pl-3 border-l-2 border-[#e5e7eb] py-1"
                >
                  <p className="text-sm text-[#111827]">
                    {name}
                    {variantName && (
                      <span className="text-[#6b7280]"> · {variantName}</span>
                    )}
                    {" · "}
                    <span className="text-[#0d9488] font-medium">
                      {qty.toLocaleString("en-IN")}
                    </span>
                    {uom && (
                      <span className="text-[#6b7280]"> {uom}</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </EventCardShell>
  );
}
