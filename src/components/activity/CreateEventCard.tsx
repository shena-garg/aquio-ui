"use client";

import { useState } from "react";
import { EventBadge } from "./EventBadge";
import { EventCardShell } from "./EventCardShell";
import type { ParsedEvent } from "./types";

interface CreateEventCardProps {
  parsed: ParsedEvent;
  isExpanded: boolean;
  onToggle: () => void;
  orderType?: "purchase" | "sales";
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

function readPrice(price: any): number {
  const v = price?.value;
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object" && "$numberDecimal" in v) return parseFloat(v.$numberDecimal);
  return parseFloat(String(v));
}

function fmt(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PartnerCard({ label, partner }: { label: string; partner: any }) {
  if (!partner?.name) return null;
  const addr = partner.address ?? {};
  const addrLine = [addr.addressLine1, addr.addressLine2].filter(Boolean).join(", ");
  const cityLine = [addr.city, addr.state, addr.country].filter(Boolean).join(", ");
  const postalLine = addr.postalCode;

  return (
    <div>
      <p className="text-xs font-medium text-[#6b7280]">{label}</p>
      <div className="mt-1 pl-3 border-l-2 border-[#e5e7eb] space-y-0.5">
        <p className="text-sm font-medium text-[#111827]">{partner.name}</p>
        {partner.taxNumber && (
          <p className="text-xs text-[#6b7280]">Tax No: {partner.taxNumber}</p>
        )}
        {partner.contactNumber && (
          <p className="text-xs text-[#6b7280]">Contact: {partner.contactNumber}</p>
        )}
        {addrLine && <p className="text-xs text-[#6b7280]">{addrLine}</p>}
        {(cityLine || postalLine) && (
          <p className="text-xs text-[#6b7280]">
            {cityLine}{postalLine ? ` — ${postalLine}` : ""}
          </p>
        )}
        {addr.gstNumber && (
          <p className="text-xs text-[#6b7280]">GST: {addr.gstNumber}</p>
        )}
      </div>
    </div>
  );
}

export function CreateEventCard({
  parsed,
  isExpanded,
  onToggle,
  orderType,
}: CreateEventCardProps) {
  const isSales = orderType === "sales";
  const nv = parsed.event.newValues ?? {};
  const [showAllTerms, setShowAllTerms] = useState(false);

  const status = nv.status as string | undefined;
  const products: any[] = nv.products ?? [];
  const terms: any[] = nv.termsAndConditions ?? [];
  const files: any[] = nv.files ?? [];

  const visibleTerms = showAllTerms ? terms : terms.slice(0, 3);
  const hiddenCount = terms.length - 3;

  const row1 = [
    { label: "Order Number", value: nv.poNumber ?? "—" },
    { label: "Ref. ID", value: nv.referenceId ?? "—" },
    { label: isSales ? "Buyer Ref. ID" : "Supplier Ref. ID", value: nv.supplierReferenceId ?? "—" },
  ];

  const row2 = [
    { label: "Issue Date", value: formatDate(nv.issueDate) },
    { label: "Delivery Date", value: formatDate(nv.deliveryDate) },
    { label: "Payment Terms", value: nv.paymentTerms ?? "—" },
  ];

  return (
    <EventCardShell
      dotColor="bg-[#0d9488]"
      title={isSales ? "Sales Order Created" : "Purchase Order Created"}
      badge={status ? <EventBadge status={status} /> : undefined}
      userName={parsed.userName}
      formattedDate={parsed.formattedDate}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="space-y-5">
        {/* Row 1: Order Number, Ref. ID, Supplier/Buyer Ref. ID */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
          {row1.map((cell) => (
            <div key={cell.label}>
              <p className="text-xs font-medium text-[#6b7280]">{cell.label}</p>
              <p className="text-sm text-[#111827] break-words">{cell.value}</p>
            </div>
          ))}
        </div>

        {/* Row 2: Issue Date, Delivery Date, Payment Terms */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
          {row2.map((cell) => (
            <div key={cell.label}>
              <p className="text-xs font-medium text-[#6b7280]">{cell.label}</p>
              <p className="text-sm text-[#111827] break-words">{cell.value}</p>
            </div>
          ))}
        </div>

        {/* Row 3: Supplier, Consignee, Buyer side-by-side */}
        <div className="grid grid-cols-3 gap-x-4">
          <PartnerCard label={isSales ? "Seller" : "Supplier"} partner={nv.supplier} />
          <PartnerCard label="Consignee (Ship To)" partner={nv.consignee} />
          <PartnerCard label="Buyer (Bill To)" partner={nv.buyer} />
        </div>

        {/* Notes */}
        {nv.notes && (
          <div>
            <p className="text-xs font-medium text-[#6b7280]">Notes</p>
            <p className="text-sm text-[#111827] whitespace-pre-wrap">{nv.notes}</p>
          </div>
        )}

        {/* Products */}
        {products.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#6b7280]">Products</p>
            {products.map((p: any, i: number) => {
              const price = readPrice(p.price);
              const qty = p.quantity?.value ?? 0;
              const uom = p.quantity?.postfix ?? "";
              const gst = p.gst?.value ?? 0;
              const discount = p.discount?.value ?? 0;
              return (
                <div key={i} className="pl-3 border-l-2 border-[#e5e7eb] py-1">
                  <p className="text-sm text-[#111827]">
                    {p.product?.value ?? "—"}
                    {p.variant?.value && (
                      <span className="text-[#6b7280]"> · {p.variant.value}</span>
                    )}
                  </p>
                  <p className="text-xs text-[#6b7280] mt-0.5">
                    {qty.toLocaleString("en-IN")} {uom}
                    {" · "}₹{fmt(price)} / unit
                    {" · "}GST {gst}%
                    {discount > 0 && ` · Discount ${discount}%`}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Terms & Conditions */}
        {terms.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[#6b7280] mb-1">Terms & Conditions</p>
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
                onClick={(e) => { e.stopPropagation(); setShowAllTerms(true); }}
                className="text-xs text-[#0d9488] mt-1"
              >
                + {hiddenCount} more
              </button>
            )}
            {showAllTerms && hiddenCount > 0 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowAllTerms(false); }}
                className="text-xs text-[#0d9488] mt-1"
              >
                Show less
              </button>
            )}
          </div>
        )}

        {/* Attachments */}
        {files.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#6b7280]">Attachments</p>
            {files.map((f: any, i: number) => (
              <p key={i} className="text-sm text-[#111827]">{f.name}</p>
            ))}
          </div>
        )}
      </div>
    </EventCardShell>
  );
}
