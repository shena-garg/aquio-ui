import type { ProductDiff } from "@/services/activity";

const BORDER_COLORS: Record<string, string> = {
  added: "border-[#22c55e]",
  removed: "border-[#ef4444]",
  updated: "border-[#f59e0b]",
};

const SYMBOLS: Record<string, string> = {
  added: "+",
  removed: "−",
  updated: "~",
};

interface ProductDiffListProps {
  diffs: ProductDiff[];
}

function fmt(price: number): string {
  return price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function detailLines(diff: ProductDiff): string[] {
  if (diff.type === "removed") return ["Removed from order"];

  if (diff.type === "added") {
    const lines: string[] = [];
    if (diff.quantity != null) lines.push(`Qty: ${diff.quantity} ${diff.uom ?? ""}`.trim());
    if (diff.price != null) lines.push(`Price: ₹${fmt(diff.price)} / unit`);
    if (diff.gst != null) lines.push(`GST: ${diff.gst}%`);
    if (diff.discount != null && diff.discount > 0) lines.push(`Discount: ${diff.discount}%`);
    return lines;
  }

  // updated — one line per changed field
  const lines: string[] = [];
  if (diff.oldQuantity != null && diff.quantity != null && diff.oldQuantity !== diff.quantity) {
    lines.push(`Qty: ${diff.oldQuantity} → ${diff.quantity} ${diff.uom ?? ""}`.trim());
  }
  if (diff.oldPrice != null && diff.price != null && diff.oldPrice !== diff.price) {
    lines.push(`Price: ₹${fmt(diff.oldPrice)} → ₹${fmt(diff.price)}`);
  }
  if (diff.oldGst != null && diff.gst != null && diff.oldGst !== diff.gst) {
    lines.push(`GST: ${diff.oldGst}% → ${diff.gst}%`);
  }
  if (diff.oldDiscount != null && diff.discount != null && diff.oldDiscount !== diff.discount) {
    lines.push(`Discount: ${diff.oldDiscount}% → ${diff.discount}%`);
  }
  return lines;
}

export function ProductDiffList({ diffs }: ProductDiffListProps) {
  if (diffs.length === 0) return null;

  return (
    <div className="space-y-2">
      {diffs.map((diff) => (
        <div
          key={`${diff.productId}-${diff.variantId}`}
          className={`border-l-2 ${BORDER_COLORS[diff.type]} pl-3 py-1`}
        >
          <p className="text-sm text-[#111827]">
            <span className="font-medium mr-1">{SYMBOLS[diff.type]}</span>
            {diff.name}
            {diff.variantName && (
              <span className="text-[#6b7280]"> · {diff.variantName}</span>
            )}
          </p>
          {detailLines(diff).map((line, i) => (
            <p key={i} className="text-xs text-[#6b7280] mt-0.5">{line}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
