"use client";

import { useState } from "react";
import { Link2, Unlink, ExternalLink, ShoppingCart, PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { purchaseOrdersService, type PurchaseOrder, type LinkedOrders, type LinkedOrderSummary } from "@/services/purchase-orders";
import { LinkOrderModal } from "@/components/purchase-orders/modals/LinkOrderModal";

interface LinkedOrdersSectionProps {
  order: PurchaseOrder;
  /** "purchase" = viewing a PO, "sales" = viewing a SO */
  orderType: "purchase" | "sales";
  queryKey: unknown[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  issued: "bg-blue-50 text-blue-700",
  confirmed: "bg-teal-50 text-teal-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

const RECEIPT_COLORS: Record<string, string> = {
  pending: "text-gray-400",
  partial: "text-amber-600",
  completed: "text-green-600",
  "force closed": "text-orange-600",
  "excess delivered": "text-purple-600",
};

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("en-IN");
}

interface ClusterSummaryCardProps {
  linked: LinkedOrders;
}

function ClusterSummaryCard({ linked }: ClusterSummaryCardProps) {
  const { clusterSummary: s } = linked;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 mb-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.8px] text-gray-400 mb-2.5">
        Cluster Overview — {s.poCount} PO{s.poCount !== 1 ? "s" : ""}, {s.soCount} SO{s.soCount !== 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Purchase Committed</p>
          <p className="text-[13px] font-semibold text-gray-800">{fmtNum(s.purchaseCommitted)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Sales Committed</p>
          <p className="text-[13px] font-semibold text-gray-800">{fmtNum(s.salesCommitted)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Received</p>
          <p className="text-[13px] font-semibold text-gray-800">{fmtNum(s.received)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Shipped</p>
          <p className="text-[13px] font-semibold text-gray-800">{fmtNum(s.shipped)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Pending Receipt</p>
          <p className={cn("text-[13px] font-semibold", (s.pendingReceipt ?? 0) > 0 ? "text-amber-600" : "text-gray-800")}>
            {fmtNum(s.pendingReceipt)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Pending Shipment</p>
          <p className={cn("text-[13px] font-semibold", (s.pendingShipment ?? 0) > 0 ? "text-amber-600" : "text-gray-800")}>
            {fmtNum(s.pendingShipment)}
          </p>
        </div>
      </div>
    </div>
  );
}

interface LinkedRowProps {
  order: LinkedOrderSummary;
  linkType: "po" | "so";
  onUnlink: (id: string) => void;
  unlinking: string | null;
}

function LinkedRow({ order, linkType, onUnlink, unlinking }: LinkedRowProps) {
  const router = useRouter();
  const href = linkType === "po"
    ? `/purchase-orders/${order._id}`
    : `/sales-orders/${order._id}`;

  const counterparty = linkType === "po"
    ? order.supplier?.name
    : order.biller?.name;

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-gray-100 hover:border-gray-200 bg-white group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-gray-900">{order.poNumber}</span>
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded capitalize",
            STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"
          )}>
            {order.status}
          </span>
          <span className={cn(
            "text-[11px] capitalize",
            RECEIPT_COLORS[order.receiptStatus] ?? "text-gray-400"
          )}>
            {order.receiptStatus}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {counterparty && (
            <span className="text-[11px] text-gray-500 truncate">{counterparty}</span>
          )}
          {order.deliveryDate && (
            <span className="text-[11px] text-gray-400 flex-shrink-0">
              {fmtDate(order.deliveryDate)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => router.push(href)}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          title={`Open ${linkType === "po" ? "PO" : "SO"}`}
        >
          <ExternalLink size={13} className="text-gray-400" />
        </button>
        <button
          onClick={() => onUnlink(order._id)}
          disabled={unlinking === order._id}
          className="p-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
          title="Unlink"
        >
          {unlinking === order._id ? (
            <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Unlink size={13} className="text-gray-400 hover:text-red-500" />
          )}
        </button>
      </div>
    </div>
  );
}

export function LinkedOrdersSection({ order, orderType, queryKey }: LinkedOrdersSectionProps) {
  const queryClient = useQueryClient();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const linked = order.linkedOrders;
  const currentId = order._id ?? order.id;

  async function handleUnlink(targetId: string) {
    setUnlinking(targetId);
    try {
      await purchaseOrdersService.unlinkOrder(currentId, targetId);
      toast.success("Order unlinked.");
      void queryClient.invalidateQueries({ queryKey });
    } catch {
      toast.error("Failed to unlink order.");
    } finally {
      setUnlinking(null);
    }
  }

  function handleLinkSuccess() {
    setLinkModalOpen(false);
    void queryClient.invalidateQueries({ queryKey });
  }

  const hasLinked = linked && (linked.pos.length > 0 || linked.sos.length > 0);

  return (
    <div className="px-4 py-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 size={14} className="text-gray-500" />
          <span className="text-[12px] font-semibold text-gray-700 uppercase tracking-[0.8px]">
            Linked Orders
          </span>
          {hasLinked && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {(linked?.pos.length ?? 0) + (linked?.sos.length ?? 0)}
            </span>
          )}
        </div>
        <button
          onClick={() => setLinkModalOpen(true)}
          className="flex items-center gap-1.5 text-[12px] font-medium text-teal-700 hover:text-teal-800 border border-teal-200 hover:border-teal-300 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-colors"
        >
          <Link2 size={12} />
          Link Order
        </button>
      </div>

      {/* Cluster summary */}
      {linked && hasLinked && (
        <ClusterSummaryCard linked={linked} />
      )}

      {/* Linked POs */}
      {linked && linked.pos.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.8px] mb-1.5 flex items-center gap-1">
            <ShoppingCart size={10} />
            Purchase Orders ({linked.pos.length})
          </p>
          <div className="space-y-1.5">
            {linked.pos.map((po) => (
              <LinkedRow
                key={po._id}
                order={po}
                linkType="po"
                onUnlink={handleUnlink}
                unlinking={unlinking}
              />
            ))}
          </div>
        </div>
      )}

      {/* Linked SOs */}
      {linked && linked.sos.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.8px] mb-1.5 flex items-center gap-1">
            <PackageCheck size={10} />
            Sales Orders ({linked.sos.length})
          </p>
          <div className="space-y-1.5">
            {linked.sos.map((so) => (
              <LinkedRow
                key={so._id}
                order={so}
                linkType="so"
                onUnlink={handleUnlink}
                unlinking={unlinking}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasLinked && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Link2 size={14} className="text-gray-400" />
          </div>
          <p className="text-[13px] text-gray-500">No linked orders yet.</p>
          <p className="text-[12px] text-gray-400 max-w-xs">
            Link this {orderType === "purchase" ? "purchase" : "sales"} order to{" "}
            {orderType === "purchase" ? "sales orders" : "purchase orders"} to track fulfillment across the cluster.
          </p>
        </div>
      )}

      <LinkOrderModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onSuccess={handleLinkSuccess}
        currentOrder={order}
        orderType={orderType}
      />
    </div>
  );
}
