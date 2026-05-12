"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Link2, Calendar, CheckCircle2, ChevronDown, ChevronRight, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { purchaseOrdersService, type PurchaseOrder, type POProduct } from "@/services/purchase-orders";

interface LinkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentOrder: PurchaseOrder;
  /** "purchase" means current is a PO, search for SOs; "sales" means current is a SO, search for POs */
  orderType: "purchase" | "sales";
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  issued: "bg-blue-50 text-blue-700",
  confirmed: "bg-teal-50 text-teal-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

export function LinkOrderModal({
  isOpen,
  onClose,
  onSuccess,
  currentOrder,
  orderType,
}: LinkOrderModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [linking, setLinking] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [productCache, setProductCache] = useState<Record<string, POProduct[]>>({});
  const [loadingProducts, setLoadingProducts] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const targetType = orderType === "purchase" ? "sales" : "purchase";
  const targetLabel = targetType === "sales" ? "Sales Order" : "Purchase Order";

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setExpandedId(null);
      setProductCache({});
      setLoadingProducts(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  async function handleToggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!productCache[id]) {
      setLoadingProducts(id);
      try {
        const res = await purchaseOrdersService.getById(id);
        setProductCache((prev) => ({ ...prev, [id]: res.data.products ?? [] }));
      } catch {
        setProductCache((prev) => ({ ...prev, [id]: [] }));
      } finally {
        setLoadingProducts(null);
      }
    }
  }

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await purchaseOrdersService.searchForLink(targetType, query.trim());
        const currentId = currentOrder._id ?? currentOrder.id;
        const filtered = (res.data.data ?? []).filter((o) => {
          const oid = o._id ?? o.id;
          return oid !== currentId;
        });
        setResults(filtered.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, targetType, currentOrder]);

  async function handleLink() {
    if (!selected) return;
    setLinking(true);
    try {
      const currentId = currentOrder._id ?? currentOrder.id;
      await purchaseOrdersService.linkOrder(currentId, selected._id ?? selected.id);
      toast.success(`Orders linked successfully.`);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to link orders.";
      toast.error(msg);
    } finally {
      setLinking(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Link2 size={16} className="text-teal-600" />
            <span className="text-[14px] font-semibold text-gray-900">
              Link to a {targetLabel}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search by order number...`}
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="px-5 pb-2 min-h-[140px] max-h-[280px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-1">
              <p className="text-[13px] text-gray-500">No {targetLabel.toLowerCase()}s found.</p>
            </div>
          )}

          {!loading && !query && (
            <div className="flex items-center justify-center py-8">
              <p className="text-[13px] text-gray-400">Type to search for a {targetLabel.toLowerCase()}...</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1.5">
              {results.map((order) => {
                const id = order._id ?? order.id;
                const isSelected = selected?._id === id || selected?.id === id;
                const isExpanded = expandedId === id;
                const counterparty = targetType === "purchase"
                  ? order.supplier?.name
                  : order.biller?.name;
                const cachedProducts = productCache[id];

                return (
                  <div
                    key={id}
                    className={cn(
                      "rounded-lg border transition-all",
                      isSelected
                        ? "border-teal-500 bg-teal-50/60"
                        : "border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <button
                      onClick={() => setSelected(isSelected ? null : order)}
                      className="w-full text-left px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected && <CheckCircle2 size={14} className="text-teal-600 flex-shrink-0" />}
                          <span className="text-[13px] font-semibold text-gray-900 truncate">
                            {order.poNumber}
                          </span>
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded capitalize",
                            STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"
                          )}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 flex-shrink-0">
                          <Calendar size={10} />
                          {order.deliveryDate
                            ? new Date(order.deliveryDate).toLocaleDateString("en-GB", {
                                day: "2-digit", month: "short", year: "numeric",
                              })
                            : "—"}
                        </div>
                      </div>
                      {counterparty && (
                        <p className="text-[11px] text-gray-500 mt-0.5 ml-5 truncate">{counterparty}</p>
                      )}
                    </button>

                    {/* Products sneak peek toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleToggleExpand(id); }}
                      className="w-full flex items-center gap-1 px-3 pb-2 text-[11px] text-gray-400 hover:text-teal-600 transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      <Package size={10} />
                      <span>Products</span>
                    </button>

                    {/* Products list */}
                    {isExpanded && (
                      <div className="px-3 pb-2.5 border-t border-gray-100">
                        {loadingProducts === id ? (
                          <div className="flex items-center gap-1.5 py-2 text-[11px] text-gray-400">
                            <div className="w-3 h-3 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
                            Loading products…
                          </div>
                        ) : cachedProducts && cachedProducts.length > 0 ? (
                          <ul className="mt-1.5 space-y-0.5">
                            {cachedProducts.map((p, i) => (
                              <li key={i} className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                                <span className="font-medium">{p.metadata.product.name}</span>
                                <span className="text-gray-400">({p.metadata.variant.name})</span>
                                <span className="text-gray-400 ml-auto flex-shrink-0">
                                  {p.quantity.value} {p.quantity.postfix}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1.5 text-[11px] text-gray-400">No products found.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400">
            {selected ? (
              <span>
                Linking <span className="font-medium text-gray-600">{currentOrder.poNumber}</span> ↔{" "}
                <span className="font-medium text-gray-600">{selected.poNumber}</span>
              </span>
            ) : (
              "Select an order above to link"
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-[13px] text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selected || linking}
              className="px-4 py-1.5 text-[13px] font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {linking && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {linking ? "Linking..." : "Link Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
