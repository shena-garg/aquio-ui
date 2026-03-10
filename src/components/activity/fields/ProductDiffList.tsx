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

function formatDetail(diff: ProductDiff): string {
  if (diff.type === "removed") return "Removed from order";

  if (diff.type === "added") {
    const parts: string[] = [];
    if (diff.quantity != null) parts.push(`Qty ${diff.quantity} ${diff.uom ?? ""}`);
    if (diff.price != null) parts.push(`₹${diff.price}`);
    if (diff.gst != null) parts.push(`GST ${diff.gst}%`);
    return parts.join(" · ");
  }

  // updated — show only what changed
  const changes: string[] = [];
  if (diff.oldPrice != null && diff.price != null && diff.oldPrice !== diff.price) {
    changes.push(`Price ₹${diff.oldPrice} → ₹${diff.price}`);
  }
  if (diff.oldQuantity != null && diff.quantity != null && diff.oldQuantity !== diff.quantity) {
    changes.push(`Qty ${diff.oldQuantity} → ${diff.quantity}`);
  }
  if (diff.oldGst != null && diff.gst != null && diff.oldGst !== diff.gst) {
    changes.push(`GST ${diff.oldGst}% → ${diff.gst}%`);
  }
  return changes.join(" · ");
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
          <p className="text-xs text-[#6b7280] mt-0.5">{formatDetail(diff)}</p>
        </div>
      ))}
    </div>
  );
}
