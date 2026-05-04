"use client";

import { OrderStatusLabel } from "./EventBadge";
import { EventCardShell } from "./EventCardShell";
import { FieldGrid } from "./fields/FieldGrid";
import type { ParsedEvent } from "./types";

interface ReceiptEventCardProps {
  parsed: ParsedEvent;
  poProducts: any[];
  orderType?: "purchase" | "sales";
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

interface FileMeta { id: string; name: string }

function diffFiles(
  prev: FileMeta[],
  next: FileMeta[]
): { added: FileMeta[]; removed: FileMeta[] } {
  const prevIds = new Set(prev.map((f) => String(f.id)));
  const nextIds = new Set(next.map((f) => String(f.id)));
  return {
    added: next.filter((f) => !prevIds.has(String(f.id))),
    removed: prev.filter((f) => !nextIds.has(String(f.id))),
  };
}

export function ReceiptEventCard({
  parsed,
  poProducts,
  orderType,
  isExpanded,
  onToggle,
}: ReceiptEventCardProps) {
  const isSales = orderType === "sales";
  const isUpdate = parsed.event.action === "receipt_update";
  const nv = parsed.event.newValues ?? {};
  const pv = parsed.event.previousValues ?? {};
  const meta = parsed.event.metadata ?? {};
  const poStatus = meta.purchaseOrderStatus as string | undefined ?? meta.status as string | undefined;

  const deliveryDate = formatDate(nv.deliveryDate);

  // ── Title ──────────────────────────────────────────────────────────────────

  let title: string;
  if (isUpdate) {
    title = isSales ? "Shipment Updated" : "Receipt Updated";
  } else {
    const parts = [isSales ? "Shipment Recorded" : "Receipt Recorded"];
    if (nv.deliveryDate) parts.push(`· ${deliveryDate}`);
    title = parts.join(" ");
  }

  // ── Create view ────────────────────────────────────────────────────────────

  if (!isUpdate) {
    const products: any[] = nv.products ?? [];
    const gridItems = [
      { label: "Delivery Date", value: deliveryDate },
      ...(nv.notes ? [{ label: "Notes", value: nv.notes }] : []),
    ];
    const files: FileMeta[] = Array.isArray(nv.files) ? nv.files : [];

    return (
      <EventCardShell
        dotColor="bg-[#8b5cf6]"
        title={title}
        badge={poStatus ? <OrderStatusLabel status={poStatus} /> : undefined}
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
                {isSales ? "Products Shipped" : "Products Received"}
              </p>
              {products.map((p: any, i: number) => {
                const { name, variantName, uom } = resolveProductInfo(
                  poProducts,
                  p.productId,
                  p.variantId
                );
                const qty = p.deliveredQuantity ?? 0;
                return (
                  <div key={i} className="pl-3 border-l-2 border-[#e5e7eb] py-1">
                    <p className="text-sm text-[#111827]">
                      {name}
                      {variantName && (
                        <span className="text-[#6b7280]"> · {variantName}</span>
                      )}
                      {" · "}
                      <span className="text-[#0d9488] font-medium">
                        {qty.toLocaleString("en-IN")}
                      </span>
                      {uom && <span className="text-[#6b7280]"> {uom}</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#6b7280]">Attachments</p>
              {files.map((f, i) => (
                <p key={i} className="text-sm text-[#111827]">{f.name}</p>
              ))}
            </div>
          )}
        </div>
      </EventCardShell>
    );
  }

  // ── Update diff view ───────────────────────────────────────────────────────

  const prevDate = formatDate(pv.deliveryDate);
  const dateChanged =
    pv.deliveryDate && nv.deliveryDate && pv.deliveryDate !== nv.deliveryDate;
  const notesChanged =
    (pv.notes ?? "") !== (nv.notes ?? "") &&
    !((pv.notes == null || pv.notes === "") && (nv.notes == null || nv.notes === ""));

  // Product quantity diffs
  const prevProducts: any[] = Array.isArray(pv.products) ? pv.products : [];
  const nextProducts: any[] = Array.isArray(nv.products) ? nv.products : [];
  const productDiffs: Array<{
    name: string; variantName: string; uom: string;
    prev: number; next: number;
  }> = [];
  for (const np of nextProducts) {
    const pp = prevProducts.find(
      (p) => p.productId === np.productId && p.variantId === np.variantId
    );
    const prevQty = pp?.deliveredQuantity ?? 0;
    const nextQty = np.deliveredQuantity ?? 0;
    if (prevQty !== nextQty) {
      const { name, variantName, uom } = resolveProductInfo(
        poProducts, np.productId, np.variantId
      );
      productDiffs.push({ name, variantName, uom, prev: prevQty, next: nextQty });
    }
  }
  // Products present in prev but removed from next
  for (const pp of prevProducts) {
    const stillPresent = nextProducts.some(
      (p) => p.productId === pp.productId && p.variantId === pp.variantId
    );
    if (!stillPresent) {
      const { name, variantName, uom } = resolveProductInfo(
        poProducts, pp.productId, pp.variantId
      );
      productDiffs.push({ name, variantName, uom, prev: pp.deliveredQuantity ?? 0, next: 0 });
    }
  }

  // File diffs
  const prevFiles: FileMeta[] = Array.isArray(pv.files) ? pv.files : [];
  const nextFiles: FileMeta[] = Array.isArray(nv.files) ? nv.files : [];
  const { added: filesAdded, removed: filesRemoved } = diffFiles(prevFiles, nextFiles);

  const hasChanges =
    dateChanged || notesChanged || productDiffs.length > 0 ||
    filesAdded.length > 0 || filesRemoved.length > 0;

  return (
    <EventCardShell
      dotColor="bg-[#8b5cf6]"
      title={title}
      badge={poStatus ? <OrderStatusLabel status={poStatus} /> : undefined}
      userName={parsed.userName}
      formattedDate={parsed.formattedDate}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {!hasChanges ? (
        <p className="text-xs text-[#9ca3af] italic">No significant changes detected.</p>
      ) : (
        <div className="space-y-4">
          {/* Field changes */}
          {(dateChanged || notesChanged) && (
            <div className="space-y-2">
              {dateChanged && (
                <div>
                  <p className="text-xs font-medium text-[#6b7280]">Delivery Date</p>
                  <p className="text-sm">
                    <span className="line-through text-[#9ca3af]">{prevDate}</span>
                    {" → "}
                    <span className="text-[#111827]">{deliveryDate}</span>
                  </p>
                </div>
              )}
              {notesChanged && (
                <div>
                  <p className="text-xs font-medium text-[#6b7280]">Notes</p>
                  {pv.notes && (
                    <p className="text-sm line-through text-[#9ca3af]">{pv.notes}</p>
                  )}
                  {nv.notes && (
                    <p className="text-sm text-[#111827]">{nv.notes}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Product quantity changes */}
          {productDiffs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-[#6b7280]">
                {isSales ? "Shipped Quantities" : "Received Quantities"}
              </p>
              {productDiffs.map((d, i) => (
                <div key={i} className="pl-3 border-l-2 border-[#e5e7eb] py-1">
                  <p className="text-sm text-[#111827]">
                    {d.name}
                    {d.variantName && (
                      <span className="text-[#6b7280]"> · {d.variantName}</span>
                    )}
                  </p>
                  <p className="text-xs text-[#6b7280] mt-0.5">
                    <span className="line-through">{d.prev.toLocaleString("en-IN")}</span>
                    {" → "}
                    <span className="text-[#0d9488] font-medium">{d.next.toLocaleString("en-IN")}</span>
                    {d.uom && <span> {d.uom}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* File changes */}
          {(filesAdded.length > 0 || filesRemoved.length > 0) && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#6b7280]">Attachments</p>
              {filesAdded.map((f, i) => (
                <p key={`add-${i}`} className="text-sm text-[#16a34a]">+ {f.name}</p>
              ))}
              {filesRemoved.map((f, i) => (
                <p key={`rem-${i}`} className="text-sm line-through text-[#9ca3af]">{f.name}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </EventCardShell>
  );
}
