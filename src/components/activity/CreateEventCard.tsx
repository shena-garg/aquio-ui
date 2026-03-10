"use client";

import { useState } from "react";
import { EventBadge } from "./EventBadge";
import { EventCardShell } from "./EventCardShell";
import { FieldGrid } from "./fields/FieldGrid";
import type { ParsedEvent } from "./types";

interface CreateEventCardProps {
  parsed: ParsedEvent;
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

export function CreateEventCard({
  parsed,
  isExpanded,
  onToggle,
}: CreateEventCardProps) {
  const nv = parsed.event.newValues ?? {};
  const [showAllTerms, setShowAllTerms] = useState(false);

  const gridItems = [
    { label: "Issue Date", value: formatDate(nv.issueDate) },
    { label: "Delivery Date", value: formatDate(nv.deliveryDate) },
    { label: "Payment Terms", value: nv.paymentTerms ?? "—" },
    { label: "Supplier", value: nv.supplier?.name ?? "—" },
    { label: "Consignee (Ship To)", value: nv.consignee?.name ?? "—" },
    { label: "Buyer (Bill To)", value: nv.buyer?.name ?? "—" },
  ];

  const products: any[] = nv.products ?? [];
  const terms: any[] = nv.termsAndConditions ?? [];
  const status = nv.status as string | undefined;

  const visibleTerms = showAllTerms ? terms : terms.slice(0, 3);
  const hiddenCount = terms.length - 3;

  return (
    <EventCardShell
      dotColor="bg-[#0d9488]"
      title="Purchase Order Created"
      badge={status ? <EventBadge status={status} /> : undefined}
      userName={parsed.userName}
      formattedDate={parsed.formattedDate}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        <FieldGrid items={gridItems} />

        {terms.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[#6b7280] mb-1">
              Terms & Conditions
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              {visibleTerms.map((t: any, i: number) => (
                <li key={i} className="text-sm text-[#111827]">
                  {typeof t === "string" ? t : t.value ?? t.text ?? String(t)}
                </li>
              ))}
            </ul>
            {hiddenCount > 0 && !showAllTerms && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllTerms(true);
                }}
                className="text-xs text-[#0d9488] mt-1"
              >
                + {hiddenCount} more
              </button>
            )}
            {showAllTerms && hiddenCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllTerms(false);
                }}
                className="text-xs text-[#0d9488] mt-1"
              >
                Show less
              </button>
            )}
          </div>
        )}

        {products.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#6b7280]">Products</p>
            {products.map((p: any, i: number) => (
              <div key={i} className="pl-3 border-l-2 border-[#e5e7eb] py-1">
                <p className="text-sm text-[#111827]">
                  {p.product?.value ?? "—"}
                  {p.variant?.value && (
                    <span className="text-[#6b7280]">
                      {" "}
                      · {p.variant.value}
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  {(p.quantity?.value ?? 0).toLocaleString("en-IN")}{" "}
                  {p.quantity?.postfix ?? ""} · ₹
                  {parseFloat(p.price?.value?.$numberDecimal ?? "0")} / unit ·
                  GST {p.gst?.value ?? 0}%
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </EventCardShell>
  );
}
