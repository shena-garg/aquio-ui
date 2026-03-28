"use client";

import { useState, useRef, useEffect } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  salesOrdersService,
  type SalesOrder,
  type SOReceipt,
} from "@/services/sales-orders";
import { QuantityCell } from "@/components/ui/QuantityCell";
import {
  getActivityLog,
  getUsers,
  type AuditEvent,
  type User as ActivityUser,
} from "@/services/activity";
import { ActivityTimeline } from "@/components/activity";

interface SODetailsTabsProps {
  order: SalesOrder;
}

const TAB_KEYS = ["products", "shipments", "notifications", "activity"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export function SODetailsTabs({ order }: SODetailsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("products");
  const [activityEvents, setActivityEvents] = useState<AuditEvent[]>([]);
  const [activityUsers, setActivityUsers] = useState<ActivityUser[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFetched, setActivityFetched] = useState(false);

  useEffect(() => {
    if (activeTab !== "activity" || activityFetched) return;
    const soId = order.id ?? order._id;
    setActivityLoading(true);
    Promise.all([getActivityLog(soId), getUsers()])
      .then(([events, users]) => {
        setActivityEvents(events);
        setActivityUsers(users);
      })
      .catch((err) => {
        console.error("Failed to load activity:", err);
      })
      .finally(() => {
        setActivityFetched(true);
        setActivityLoading(false);
      });
  }, [activeTab, activityFetched, order]);

  const products = order.products ?? [];
  const shipmentsCount = order.receipts?.length ?? 0;
  const totalQuantity = order.totalQuantity ?? products.reduce((sum, p) => sum + p.quantity.value, 0);
  const totalShipped = order.receipts?.reduce((sum, r) => sum + r.products.reduce((s, p) => s + p.deliveredQuantity, 0), 0) ?? 0;
  const shipped = totalQuantity - (order.pendingQuantity ?? (totalQuantity - totalShipped));

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "products", label: "Products", count: products.length },
    { key: "shipments", label: "Shipments", count: shipmentsCount },
    { key: "notifications", label: "Notifications" },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="flex flex-col flex-1">
      {/* Tab bar */}
      <div className="flex border-b border-[#e5e7eb] bg-white px-4 sm:px-8">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-[#0d9488] text-[#111827]"
                  : "border-transparent text-[#6b7280] hover:text-[#111827]",
              )}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span
                  className={cn(
                    "rounded-[10px] px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                    isActive
                      ? "bg-[#fef3c7] text-[#b45309]"
                      : "bg-[#f3f4f6] text-[#6b7280]",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {activeTab === "products" ? (
          <ProductsTable order={order} products={products} shipped={shipped} />
        ) : activeTab === "shipments" ? (
          <ShipmentsTab order={order} />
        ) : activeTab === "activity" ? (
          <div className="px-4 sm:px-8 py-4 sm:py-6">
            {activityLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[#e5e7eb] rounded-lg p-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#e5e7eb] flex-shrink-0" />
                      <div className="flex-1">
                        <div className="animate-pulse bg-[#f3f4f6] rounded h-4 w-3/4 mb-2" />
                        <div className="animate-pulse bg-[#f3f4f6] rounded h-4 w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activityEvents.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-[#6b7280]">No activity recorded yet.</p>
              </div>
            ) : (
              <ActivityTimeline
                events={activityEvents}
                users={activityUsers}
                poProducts={order.products ?? []}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            Coming soon
          </div>
        )}
      </div>
    </div>
  );
}

/* -- Shipments tab --------------------------------------------------------- */

function ShipmentsTab({ order }: { order: SalesOrder }) {
  const receipts = order.receipts ?? [];
  const products = order.products ?? [];

  if (receipts.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[#6b7280]">
        No shipments recorded yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4 sm:py-6">
      <div className="mx-4 sm:mx-8">
        <ShipmentSummaryCard order={order} receipts={receipts} products={products} />
      </div>
      {receipts.map((receipt, idx) => (
        <div key={receipt._id} className="mx-4 sm:mx-8">
          <IndividualShipmentCard
            receipt={receipt}
            index={idx}
            products={products}
          />
        </div>
      ))}
    </div>
  );
}

/* -- Shipment Summary Card ------------------------------------------------- */

function getProductName(
  productId: string,
  products: NonNullable<SalesOrder["products"]>,
): { name: string; variant: string } {
  const p = products.find((p) => p.product._id === productId);
  return {
    name: p?.metadata.product.name ?? "Unknown Product",
    variant: p?.metadata.variant.name ?? "",
  };
}

function getOrderedQuantity(
  productId: string,
  variantId: string,
  products: NonNullable<SalesOrder["products"]>,
): number {
  const p = products.find(
    (p) => p.product._id === productId && p.variant._id === variantId,
  );
  return p?.quantity.value ?? 0;
}

function getProductUOM(
  productId: string,
  variantId: string,
  products: NonNullable<SalesOrder["products"]>,
): string {
  const p = products.find(
    (p) => p.product._id === productId && p.variant._id === variantId,
  );
  return p?.quantity.postfix ?? "";
}

type ProductShipmentStatus =
  | "not_started"
  | "partially_shipped"
  | "fully_shipped"
  | "excess_shipped";

function getShipmentStatus(
  totalShipped: number,
  ordered: number,
): ProductShipmentStatus {
  if (totalShipped === 0) return "not_started";
  if (totalShipped < ordered) return "partially_shipped";
  if (totalShipped > ordered) return "excess_shipped";
  return "fully_shipped";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function StatusBadge({ status }: { status: ProductShipmentStatus }) {
  if (status === "not_started") {
    return (
      <span className="text-[12px] font-medium leading-[15.6px] text-[#6b7280]">
        Not Started
      </span>
    );
  }

  const config = {
    partially_shipped: {
      label: "Partially Shipped",
      iconColor: "#f59e0b",
      icon: (
        <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
          <path
            d="M6 1v4M6 9h.005"
            stroke="#f59e0b"
            strokeWidth="1.167"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    fully_shipped: {
      label: "Fully Shipped",
      iconColor: "#10b981",
      icon: (
        <svg width="9" height="6" viewBox="0 0 9 6" fill="none">
          <path
            d="M1 3l2.5 2.5L8 1"
            stroke="#10b981"
            strokeWidth="1.167"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    excess_shipped: {
      label: "Excess Shipped",
      iconColor: "#0d9488",
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="#0d9488" strokeWidth="1.167" />
          <path d="M6 3.5v5" stroke="#0d9488" strokeWidth="1.167" strokeLinecap="round" />
        </svg>
      ),
    },
  } as const;

  const c = config[status];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center justify-center w-4 h-4 rounded-full bg-[#f3f4f6]">
        {c.icon}
      </div>
      <span className="text-[12px] font-medium leading-[15.6px] text-[#111827]">
        {c.label}
      </span>
    </div>
  );
}

function ShipmentSummaryCard({
  order,
  receipts,
  products,
}: {
  order: SalesOrder;
  receipts: SOReceipt[];
  products: NonNullable<SalesOrder["products"]>;
}) {
  // Build a unique list of product+variant combos across all receipts
  const productKeys = new Map<
    string,
    { productId: string; variantId: string }
  >();
  for (const r of receipts) {
    for (const rp of r.products) {
      const key = `${rp.productId}:${rp.variantId}`;
      if (!productKeys.has(key)) {
        productKeys.set(key, {
          productId: rp.productId,
          variantId: rp.variantId,
        });
      }
    }
  }
  // Also include products from the order that may not have receipts yet
  for (const p of products) {
    const key = `${p.product._id}:${p.variant._id}`;
    if (!productKeys.has(key)) {
      productKeys.set(key, {
        productId: p.product._id,
        variantId: p.variant._id,
      });
    }
  }

  const productList = Array.from(productKeys.values());

  const leftTheadRef = useRef<HTMLTableSectionElement>(null);
  const rightTheadRef = useRef<HTMLTableSectionElement>(null);
  const leftTbodyRef = useRef<HTMLTableSectionElement>(null);
  const rightTbodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    const syncHeights = (
      leftRows: NodeListOf<Element>,
      rightRows: NodeListOf<Element>,
    ) => {
      leftRows.forEach((row, i) => {
        const l = row as HTMLElement;
        const r = rightRows[i] as HTMLElement;
        if (!r) return;
        l.style.height = "auto";
        r.style.height = "auto";
        const height = Math.max(l.offsetHeight, r.offsetHeight);
        l.style.height = `${height}px`;
        r.style.height = `${height}px`;
      });
    };
    if (leftTheadRef.current && rightTheadRef.current)
      syncHeights(
        leftTheadRef.current.querySelectorAll("tr"),
        rightTheadRef.current.querySelectorAll("tr"),
      );
    if (leftTbodyRef.current && rightTbodyRef.current)
      syncHeights(
        leftTbodyRef.current.querySelectorAll("tr"),
        rightTbodyRef.current.querySelectorAll("tr"),
      );
  }, [productList, receipts]);

  async function handleDownloadCSV() {
    try {
      const blob = await salesOrdersService.downloadCSV(order.id ?? order._id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shipment-summary-${order.poNumber}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download CSV:", error);
    }
  }

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[10px] shadow-sm pt-3 sm:pt-4 pb-3">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 px-3 sm:px-5">
          <span className="text-[11px] font-semibold leading-[14.3px] text-[#6b7280]">
            Shipment Summary
          </span>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#0d9488] hover:text-[#0f766e]"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>

        {/* Table with horizontal scroll on mobile */}
        <div className="overflow-x-auto">
          {/* Desktop: Split-table layout */}
          <div className="hidden sm:flex">
            {/* Frozen left panel */}
            <div className="flex-shrink-0 border-r border-gray-200" style={{ width: '640px' }}>
              <table style={{ width: '640px', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '280px' }} />
                  <col style={{ width: '180px' }} />
                </colgroup>
                <thead ref={leftTheadRef}>
                  <tr>
                    <th className="text-center h-[31px] py-2 pl-3 pr-1 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] border-b border-[#e5e7eb]">
                      S.No.
                    </th>
                    <th className="text-left h-[31px] py-2 pr-3 pl-2 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] border-b border-[#e5e7eb]">
                      Status
                    </th>
                    <th className="text-left h-[31px] py-2 pr-3 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] border-b border-[#e5e7eb]">
                      Product
                    </th>
                    <th className="text-left h-[31px] py-2 pr-3 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] whitespace-nowrap border-b border-[#e5e7eb]">
                      Shipped / Ordered
                    </th>
                  </tr>
                </thead>
                <tbody ref={leftTbodyRef} className="[&>tr:last-child>td]:border-b-0">
                  {productList.map(({ productId, variantId }, idx) => {
                    const { name, variant } = getProductName(productId, products);
                    const ordered = getOrderedQuantity(productId, variantId, products);
                    const uom = getProductUOM(productId, variantId, products);
                    const totalShipped = receipts.reduce((sum, r) => {
                      const rp = r.products.find(
                        (p) => p.productId === productId && p.variantId === variantId,
                      );
                      return sum + (rp?.deliveredQuantity ?? 0);
                    }, 0);
                    const status = getShipmentStatus(totalShipped, ordered);

                    return (
                      <tr key={`left-${productId}:${variantId}`}>
                        <td className="h-[52px] py-2.5 pl-3 pr-1 text-center text-[13px] text-[#6b7280] align-top border-b border-[#e5e7eb]">
                          {idx + 1}
                        </td>
                        <td className="h-[52px] py-2.5 pr-3 pl-2 align-top border-b border-[#e5e7eb]">
                          <StatusBadge status={status} />
                        </td>
                        <td className="h-[52px] py-2.5 pr-3 align-top border-b border-[#e5e7eb]">
                          <div className="flex flex-col gap-[3px]">
                            <span className="text-[13px] font-medium leading-[16.9px] text-[#111827] truncate">
                              {name}
                            </span>
                            {variant && (
                              <span className="text-[12px] font-normal leading-[15.6px] text-[#6b7280] truncate">
                                {variant}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="h-[52px] py-2.5 pr-3 align-top text-[13px] font-normal leading-[16.9px] text-black whitespace-nowrap border-b border-[#e5e7eb]">
                          <span className="inline-flex gap-1">
                            <QuantityCell value={totalShipped} uom={uom} />
                            <span>/</span>
                            <QuantityCell value={ordered} uom={uom} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Scrollable right panel */}
            <div className="flex-1 overflow-x-auto">
              <table style={{ minWidth: `${receipts.length * 140 + 120}px` }}>
                <thead ref={rightTheadRef}>
                  <tr>
                    {receipts.map((r, idx) => (
                      <th
                        key={r._id}
                        className={cn(
                          "text-left h-[31px] py-2 pr-3 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] whitespace-nowrap border-b border-[#e5e7eb]",
                          idx === 0 && "pl-3",
                        )}
                      >
                        #{idx + 1} · {formatDate(r.deliveryDate)}
                      </th>
                    ))}
                    <th className="text-left h-[31px] py-2 pr-5 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] border-b border-[#e5e7eb]">
                      Remaining
                    </th>
                  </tr>
                </thead>
                <tbody ref={rightTbodyRef} className="[&>tr:last-child>td]:border-b-0">
                  {productList.map(({ productId, variantId }) => {
                    const ordered = getOrderedQuantity(productId, variantId, products);
                    const uom = getProductUOM(productId, variantId, products);
                    const totalShipped = receipts.reduce((sum, r) => {
                      const rp = r.products.find(
                        (p) => p.productId === productId && p.variantId === variantId,
                      );
                      return sum + (rp?.deliveredQuantity ?? 0);
                    }, 0);
                    const remaining = Math.max(0, ordered - totalShipped);

                    return (
                      <tr key={`right-${productId}:${variantId}`}>
                        {receipts.map((r, rIdx) => {
                          const rp = r.products.find(
                            (p) =>
                              p.productId === productId &&
                              p.variantId === variantId,
                          );
                          return (
                            <td
                              key={r._id}
                              className={cn(
                                "h-[52px] py-2.5 pr-3 align-top text-[13px] font-normal leading-[16.9px] text-black whitespace-nowrap border-b border-[#e5e7eb]",
                                rIdx === 0 && "pl-3",
                              )}
                            >
                              {rp && rp.deliveredQuantity > 0 ? (
                                <QuantityCell
                                  value={rp.deliveredQuantity}
                                  uom={uom}
                                />
                              ) : (
                                "\u2014"
                              )}
                            </td>
                          );
                        })}
                        <td
                          className={cn(
                            "h-[52px] py-2.5 pr-5 align-top text-[13px] leading-[16.9px] whitespace-nowrap border-b border-[#e5e7eb]",
                            remaining > 0
                              ? "font-semibold text-[#dc2626]"
                              : "font-normal text-black",
                          )}
                        >
                          <QuantityCell value={remaining} uom={uom} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: single scrollable table */}
          <div className="sm:hidden">
            <table className="w-full" style={{ minWidth: `${280 + receipts.length * 100 + 90}px` }}>
              <thead>
                <tr>
                  <th className="text-left h-[31px] py-2 pl-3 pr-2 text-[11px] font-semibold text-[#6b7280] border-b border-[#e5e7eb] whitespace-nowrap sticky left-0 bg-white z-10">
                    Product
                  </th>
                  <th className="text-left h-[31px] py-2 px-2 text-[11px] font-semibold text-[#6b7280] border-b border-[#e5e7eb] whitespace-nowrap">
                    Shipped / Ordered
                  </th>
                  {receipts.map((r, idx) => (
                    <th
                      key={r._id}
                      className="text-left h-[31px] py-2 px-2 text-[11px] font-semibold text-[#6b7280] whitespace-nowrap border-b border-[#e5e7eb]"
                    >
                      #{idx + 1}
                    </th>
                  ))}
                  <th className="text-left h-[31px] py-2 px-2 pr-3 text-[11px] font-semibold text-[#6b7280] border-b border-[#e5e7eb] whitespace-nowrap">
                    Left
                  </th>
                </tr>
              </thead>
              <tbody className="[&>tr:last-child>td]:border-b-0">
                {productList.map(({ productId, variantId }) => {
                  const { name, variant } = getProductName(productId, products);
                  const ordered = getOrderedQuantity(productId, variantId, products);
                  const uom = getProductUOM(productId, variantId, products);
                  const totalShippedQty = receipts.reduce((sum, r) => {
                    const rp = r.products.find(
                      (p) => p.productId === productId && p.variantId === variantId,
                    );
                    return sum + (rp?.deliveredQuantity ?? 0);
                  }, 0);
                  const remaining = Math.max(0, ordered - totalShippedQty);

                  return (
                    <tr key={`mobile-${productId}:${variantId}`}>
                      <td className="py-2 pl-3 pr-2 align-top border-b border-[#e5e7eb] sticky left-0 bg-white z-10">
                        <div className="flex flex-col gap-[1px]">
                          <span className="text-[12px] font-medium text-[#111827] truncate max-w-[140px]">{name}</span>
                          {variant && (
                            <span className="text-[11px] text-[#6b7280] truncate max-w-[140px]">{variant}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 align-top text-[12px] text-[#111827] whitespace-nowrap border-b border-[#e5e7eb]">
                        <span className="inline-flex gap-0.5">
                          <QuantityCell value={totalShippedQty} uom={uom} />
                          <span>/</span>
                          <QuantityCell value={ordered} uom={uom} />
                        </span>
                      </td>
                      {receipts.map((r) => {
                        const rp = r.products.find(
                          (p) => p.productId === productId && p.variantId === variantId,
                        );
                        return (
                          <td
                            key={r._id}
                            className="py-2 px-2 align-top text-[12px] text-[#111827] whitespace-nowrap border-b border-[#e5e7eb]"
                          >
                            {rp && rp.deliveredQuantity > 0 ? (
                              <QuantityCell value={rp.deliveredQuantity} uom={uom} />
                            ) : (
                              "\u2014"
                            )}
                          </td>
                        );
                      })}
                      <td
                        className={cn(
                          "py-2 px-2 pr-3 align-top text-[12px] whitespace-nowrap border-b border-[#e5e7eb]",
                          remaining > 0 ? "font-semibold text-[#dc2626]" : "text-[#111827]",
                        )}
                      >
                        <QuantityCell value={remaining} uom={uom} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -- Individual Shipment Card ---------------------------------------------- */

function IndividualShipmentCard({
  receipt,
  index,
  products,
}: {
  receipt: SOReceipt;
  index: number;
  products: NonNullable<SalesOrder["products"]>;
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[10px] shadow-sm py-3 sm:py-3.5 px-3 sm:px-5">
      <div className="flex flex-col gap-2.5">
        {/* Header */}
        <div className="flex items-center">
          <span className="font-mono text-[13px] font-semibold leading-[16.9px] text-[#111827]">
            Shipment #{index + 1} · {formatDate(receipt.deliveryDate)}
          </span>
        </div>

        {/* Notes & Documents */}
        {(receipt.notes || (receipt.files && receipt.files.length > 0)) && (
          <div className="border-t border-[#e5e7eb] pt-2 flex flex-col gap-2">
            {receipt.notes && (
              <div className="flex items-start gap-2">
                <span className="text-[11px] font-semibold leading-[14.3px] text-[#6b7280] shrink-0">
                  Notes
                </span>
                <span className="text-[12px] font-normal leading-[15.6px] text-[#6b7280]">
                  {receipt.notes}
                </span>
              </div>
            )}
            {receipt.files && receipt.files.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-[11px] font-semibold leading-[14.3px] text-[#6b7280] shrink-0">
                  Documents
                </span>
                <div className="flex flex-wrap gap-2">
                  {receipt.files.map((file: any, fIdx: number) => (
                    <span
                      key={fIdx}
                      className="text-[12px] font-normal leading-[15.6px] text-[#0d9488]"
                    >
                      {file.name ?? file.fileName ?? `File ${fIdx + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products - mobile: compact list */}
        <div className="sm:hidden border-t border-[#e5e7eb] pt-2 space-y-1.5">
          {receipt.products.map((rp) => {
            const { name, variant } = getProductName(rp.productId, products);
            const uom = getProductUOM(rp.productId, rp.variantId, products);
            return (
              <div
                key={`${rp.productId}:${rp.variantId}`}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex flex-col gap-[1px] min-w-0">
                  <span className="text-[13px] font-medium text-[#111827] truncate">{name}</span>
                  {variant && (
                    <span className="text-[11px] text-[#6b7280] truncate">{variant}</span>
                  )}
                </div>
                <span className="text-[13px] font-semibold text-[#0d9488] whitespace-nowrap flex-shrink-0">
                  <QuantityCell value={rp.deliveredQuantity} uom={uom} />
                </span>
              </div>
            );
          })}
        </div>

        {/* Products - desktop: table */}
        <div className="hidden sm:block pt-2">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="text-left py-2 pr-3 text-[11px] font-semibold leading-[14.3px] text-[#6b7280]">
                  Product
                </th>
                <th className="text-left py-2 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] whitespace-nowrap">
                  Quantity Shipped
                </th>
              </tr>
            </thead>
            <tbody>
              {receipt.products.map((rp) => {
                const { name, variant } = getProductName(rp.productId, products);
                const uom = getProductUOM(rp.productId, rp.variantId, products);
                return (
                  <tr
                    key={`${rp.productId}:${rp.variantId}`}
                    className="border-b border-[#e5e7eb] last:border-b-0"
                  >
                    <td className="py-2.5 pr-3 align-top">
                      <div className="flex flex-col gap-[3px]">
                        <span className="text-[13px] font-medium leading-[16.9px] text-[#111827]">
                          {name}
                        </span>
                        {variant && (
                          <span className="text-[12px] font-normal leading-[15.6px] text-[#6b7280]">
                            {variant}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 align-top text-[13px] font-semibold leading-[16.9px] text-[#0d9488] whitespace-nowrap">
                      <QuantityCell value={rp.deliveredQuantity} uom={uom} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -- Products table -------------------------------------------------------- */

function ProductsTable({
  order,
  products,
  shipped: totalShipped,
}: {
  order: SalesOrder;
  products: NonNullable<SalesOrder["products"]>;
  shipped: number;
}) {
  const remainingItems = order.remainingItems ?? [];

  return (
    <>
      {/* -- Mobile: product cards -- */}
      <div className="sm:hidden px-4 pt-4 pb-4 space-y-2">
        {products.map((product, idx) => {
          const remaining = remainingItems.find(
            (r) =>
              r.productId === product.product._id &&
              r.variantId === product.variant._id,
          );
          const ordered = product.quantity.value;
          const remainingQty = remaining?.remainingQuantity ?? 0;
          const shippedQty = ordered - remainingQty;
          const shippedPct = ordered > 0 ? (shippedQty / ordered) * 100 : 0;
          const isNotShipped = shippedQty === 0;
          const shippedBarColor = isNotShipped
            ? "bg-[#d1d5db]"
            : "bg-[#10b981]";

          return (
            <div
              key={`mobile-${product.product._id}-${product.variant._id}-${idx}`}
              className="rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2.5 space-y-2"
            >
              {/* Row 1: Product name + Line Total / pricing */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-[2px] min-w-0">
                  <span className="text-[13px] font-medium text-[#111827] truncate">
                    {product.metadata.product.name}
                  </span>
                  <span className="text-[12px] text-[#6b7280] truncate">
                    {product.metadata.variant.name}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-[2px] flex-shrink-0">
                  <span className="text-[13px] font-semibold text-[#111827] whitespace-nowrap">
                    ₹{parseFloat(product.totalAmount.$numberDecimal).toLocaleString("en-IN")}
                  </span>
                  <span className="text-[11px] text-[#6b7280] whitespace-nowrap">
                    ₹{product.price.value.$numberDecimal} @ GST {product.gst.value}%
                  </span>
                </div>
              </div>

              {/* Row 2: Progress bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-[#f3f4f6]">
                  <div
                    className={cn(shippedBarColor, "h-1.5 rounded-full")}
                    style={{ width: `${Math.min(shippedPct, 100)}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-[#6b7280] flex-shrink-0">
                  {Math.round(shippedPct)}%
                </span>
              </div>

              {/* Row 3: Ordered | Pending */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-[2px]">
                  <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">Ordered</span>
                  <span className="text-[13px] font-medium text-[#111827]">
                    <QuantityCell value={ordered} uom={product.quantity.postfix} />
                  </span>
                </div>
                <div className="flex flex-col gap-[2px] items-end">
                  <span className="text-[10px] font-semibold tracking-[0.6px] text-[#6b7280]">Pending</span>
                  <span className={`text-[13px] font-medium ${remainingQty > 0 ? "text-[#dc2626]" : "text-[#111827]"}`}>
                    <QuantityCell value={remainingQty} uom={product.quantity.postfix} />
                  </span>
                </div>
              </div>

            </div>
          );
        })}

        {/* Mobile total */}
        <div className="flex items-center justify-between rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2.5">
          <span className="text-[13px] font-semibold text-[#111827]">Total</span>
          <span className="text-[13px] font-semibold text-[#111827]">
            ₹{(typeof order.totalAmount === "number"
              ? order.totalAmount
              : parseFloat(order.totalAmount.$numberDecimal)
            ).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* -- Desktop: table -- */}
      <div className="hidden sm:block bg-white border border-[#e5e7eb] rounded-[10px] shadow-sm mx-8 mt-6 mb-6">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              <th className="text-center py-2 pl-5 pr-2 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] w-10">S.No.</th>
              <th className="text-left py-2 px-3 text-[11px] font-semibold leading-[14.3px] text-[#6b7280]">Product</th>
              <th className="text-right py-2 px-3 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] whitespace-nowrap">Ordered Qty</th>
              <th className="text-right py-2 px-3 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] whitespace-nowrap">Shipped Qty</th>
              <th className="text-right py-2 px-3 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] whitespace-nowrap">Pending Qty</th>
              <th className="text-right py-2 px-3 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] whitespace-nowrap">Unit Price</th>
              <th className="text-right py-2 px-3 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] whitespace-nowrap">Tax %</th>
              <th className="text-right py-2 pr-5 pl-3 text-[11px] font-semibold leading-[14.3px] text-[#6b7280] whitespace-nowrap">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => {
              const remaining = remainingItems.find(
                (r) =>
                  r.productId === product.product._id &&
                  r.variantId === product.variant._id,
              );
              const ordered = product.quantity.value;
              const remainingQty = remaining?.remainingQuantity ?? 0;
              const shippedQty = ordered - remainingQty;
              const shippedPct = ordered > 0 ? (shippedQty / ordered) * 100 : 0;
              const isNotShipped = shippedQty === 0;
              const shippedTextColor = isNotShipped
                ? "text-[#6b7280]"
                : "text-[#10b981]";
              const shippedBarColor = isNotShipped
                ? "bg-[#d1d5db]"
                : "bg-[#10b981]";

              return (
                <tr
                  key={`${product.product._id}-${product.variant._id}-${idx}`}
                  className="border-b border-[#e5e7eb] last:border-b-0"
                >
                  {/* S.No. */}
                  <td className="py-2.5 pl-5 pr-2 text-center text-[13px] text-[#6b7280] w-10">
                    {idx + 1}
                  </td>

                  {/* Product */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col gap-[3px]">
                      <span className="text-[13px] font-medium leading-[16.9px] text-[#111827]">
                        {product.metadata.product.name}
                      </span>
                      <span className="text-[12px] font-normal leading-[15.6px] text-[#6b7280]">
                        {product.metadata.variant.name}
                      </span>
                    </div>
                  </td>

                  {/* Ordered Qty */}
                  <td className="py-2.5 px-3 text-right text-[13px] font-normal leading-[16.9px] text-[#111827] whitespace-nowrap">
                    <QuantityCell value={ordered} uom={product.quantity.postfix} />
                  </td>

                  {/* Shipped Qty */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className={shippedTextColor + " text-[13px] font-normal leading-[16.9px]"}>
                      <QuantityCell value={shippedQty} uom={product.quantity.postfix} />
                    </div>
                    <div className="mt-1 bg-[#e5e7eb] rounded h-1 w-20 ml-auto">
                      <div
                        className={cn(shippedBarColor, "rounded h-1")}
                        style={{
                          width: `${Math.min(shippedPct, 100)}%`,
                        }}
                      />
                    </div>
                  </td>

                  {/* Pending Qty */}
                  <td className="py-2.5 px-3 text-right text-[13px] font-normal leading-[16.9px] text-[#111827] whitespace-nowrap">
                    <QuantityCell value={remainingQty} uom={product.quantity.postfix} />
                  </td>

                  {/* Unit Price */}
                  <td className="py-2.5 px-3 text-right text-[13px] font-normal leading-[16.9px] text-[#111827] whitespace-nowrap">
                    ₹ {product.price.value.$numberDecimal}
                  </td>

                  {/* Tax% */}
                  <td className="py-2.5 px-3 text-right text-[13px] font-normal leading-[16.9px] text-[#111827] whitespace-nowrap">
                    {product.gst.value}%
                  </td>

                  {/* Line Total */}
                  <td className="py-2.5 pr-5 pl-3 text-right text-[13px] font-semibold leading-[16.9px] text-[#111827] whitespace-nowrap">
                    ₹ {parseFloat(
                      product.totalAmount.$numberDecimal,
                    ).toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer Total Summary */}
          <tfoot>
            <tr className="border-t border-[#e5e7eb]">
              <td className="py-2.5 pl-5 pr-2" />
              <td className="py-2.5 px-3 text-[13px] font-semibold leading-[16.9px] text-[#111827]">Total Summary</td>
              <td className="py-2.5 px-3 text-right text-[13px] font-semibold leading-[16.9px] text-[#111827] whitespace-nowrap">
                {order.hasUniformUOM !== false ? (
                  <QuantityCell value={order.totalQuantity ?? products.reduce((s, p) => s + p.quantity.value, 0)} uom={order.commonUOM ?? ""} />
                ) : (
                  <span className="text-[#6b7280] font-normal">—</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-right text-[13px] font-semibold leading-[16.9px] text-[#111827] whitespace-nowrap">
                {order.hasUniformUOM !== false ? (
                  <QuantityCell value={totalShipped} uom={order.commonUOM ?? ""} />
                ) : (
                  <span className="text-[#6b7280] font-normal">—</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-right text-[13px] font-semibold leading-[16.9px] text-[#111827] whitespace-nowrap">
                {order.hasUniformUOM !== false ? (
                  <QuantityCell value={order.pendingQuantity ?? ((order.totalQuantity ?? products.reduce((s, p) => s + p.quantity.value, 0)) - totalShipped)} uom={order.commonUOM ?? ""} />
                ) : (
                  <span className="text-[#6b7280] font-normal">—</span>
                )}
              </td>
              <td className="py-2.5 px-3" />
              <td className="py-2.5 px-3" />
              <td className="py-2.5 pr-5 pl-3 text-right text-[13px] font-semibold leading-[16.9px] text-[#111827] whitespace-nowrap">
                ₹ {(typeof order.totalAmount === "number"
                  ? order.totalAmount
                  : parseFloat(order.totalAmount.$numberDecimal)
                ).toLocaleString("en-IN")}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </>
  );
}
