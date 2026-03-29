"use client";

import { CSSProperties, Fragment, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FileText, MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SalesOrder, SOOrderStatus } from "@/services/sales-orders";
import { QuantityCell } from "@/components/ui/QuantityCell";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { EmptyState } from "@/components/ui/EmptyState";
import { CancelPOModal } from "@/components/purchase-orders/modals/CancelPOModal";
import { ConfirmPOModal } from "@/components/purchase-orders/modals/ConfirmPOModal";
import { ForceClosePOModal } from "@/components/purchase-orders/modals/ForceClosePOModal";
import { SOQuickView } from "@/components/sales-orders/SOQuickView";

// ── Status badge configs ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SOOrderStatus, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  issued:    { label: "Issued",    className: "bg-blue-50 text-blue-700 border border-blue-200"    },
  completed: { label: "Completed", className: "bg-green-50 text-green-700 border border-green-200" },
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-500 border border-gray-200"   },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border border-red-200"       },
};

type SOReceiptStatus = SalesOrder["receiptStatus"];

const RECEIPT_STATUS_CONFIG: Record<SOReceiptStatus, { label: string; className: string }> = {
  pending:            { label: "Pending",          className: "bg-gray-100 text-gray-500 border border-gray-200"       },
  partial:            { label: "Partial",           className: "bg-amber-50 text-amber-700 border border-amber-200"     },
  completed:          { label: "Completed",         className: "bg-green-50 text-green-700 border border-green-200"     },
  "force closed":     { label: "Force Closed",      className: "bg-red-50 text-red-600 border border-red-200"           },
  "excess delivered": { label: "Excess Delivered",  className: "bg-purple-50 text-purple-700 border border-purple-200" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function formatIndianAmount(amount: number | undefined | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Shipment cell ──────────────────────────────────────────────────────────────

interface ShipmentCellProps {
  totalQuantity?: number;
  pendingQuantity?: number;
  receiptCompletionPercentage: number;
  uom?: string;
}

function ShipmentCell({ totalQuantity, pendingQuantity, receiptCompletionPercentage, uom }: ShipmentCellProps) {
  const pending = pendingQuantity ?? 0;
  const total = totalQuantity ?? 0;
  const pct = Math.min(100, Math.round(receiptCompletionPercentage ?? 0));

  if (total === 0) {
    return <span className="text-[13px] text-gray-400">—</span>;
  }

  return (
    <div className="flex min-w-[180px] flex-col gap-0.5">
      <span className="text-[12px] font-medium leading-tight text-[#0F1720] whitespace-nowrap">
        <QuantityCell value={pending} uom={uom ?? ""} /> / <QuantityCell value={total} uom={uom ?? ""} /> Pending
      </span>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 rounded-full bg-gray-100 h-1">
          <div className="bg-[#0d9488] h-1 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-gray-400 whitespace-nowrap">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ── Column widths (px) for sticky offset calculation ──────────────────────────

const ACTIONS_COL_WIDTH = 68;

const COL_WIDTH: Record<string, number> = {
  poNumber:      140,
  refId:         100,
  customer:      160,
  customerRef:   120,
  issueDate:     110,
  delivery:      150,
  status:        110,
  shipment:      220,
  amount:        140,
  paymentTerms:  130,
  shipmentStatus: 140,
  totalOrder:    130,
  pendingOrder:  130,
};

// ── Column definitions ────────────────────────────────────────────────────────

const TH = "px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400";

interface Sticky {
  headCls: string;
  cellCls: string;
  style: CSSProperties;
}

const NO_STICKY: Sticky = { headCls: "", cellCls: "", style: {} };

interface ColDef {
  key: string;
  width: number;
  renderHead: (s: Sticky) => React.ReactNode;
  renderCell: (order: SalesOrder, s: Sticky) => React.ReactNode;
}

const COLUMN_DEFS: ColDef[] = [
  {
    key: "poNumber",
    width: COL_WIDTH.poNumber,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>SO Number</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 ${cellCls}`} style={style}>
        <Link
          href={`/sales-orders/${order.id}`}
          className="text-[13px] font-medium text-[#0d9488] hover:underline"
        >
          {order.poNumber}
        </Link>
      </TableCell>
    ),
  },
  {
    key: "refId",
    width: COL_WIDTH.refId,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Ref. ID</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {order.referenceId || "—"}
      </TableCell>
    ),
  },
  {
    key: "customer",
    width: COL_WIDTH.customer,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Buyer</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] font-medium text-[#0F1720] ${cellCls}`} style={style}>
        {order.biller?.name ?? "—"}
      </TableCell>
    ),
  },
  {
    key: "customerRef",
    width: COL_WIDTH.customerRef,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Customer Ref.</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {order.supplierReferenceId || "—"}
      </TableCell>
    ),
  },
  {
    key: "issueDate",
    width: COL_WIDTH.issueDate,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Issue Date</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {formatDate(order.issueDate)}
      </TableCell>
    ),
  },
  {
    key: "delivery",
    width: COL_WIDTH.delivery,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Delivery</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 ${cellCls}`} style={style}>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-gray-600">{formatDate(order.deliveryDate)}</span>
          {order.delayDays > 0 && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-600">
              Overdue {order.delayDays}d
            </span>
          )}
        </div>
      </TableCell>
    ),
  },
  {
    key: "status",
    width: COL_WIDTH.status,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Status</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => {
      const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;
      return (
        <TableCell className={`px-3 ${cellCls}`} style={style}>
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[12px] font-medium ${cfg.className}`}>
            {cfg.label}
          </span>
        </TableCell>
      );
    },
  },
  {
    key: "shipment",
    width: COL_WIDTH.shipment,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Shipment</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 py-2 ${cellCls}`} style={style}>
        <ShipmentCell
          totalQuantity={order.totalQuantity}
          pendingQuantity={order.pendingQuantity}
          receiptCompletionPercentage={order.receiptCompletionPercentage}
          uom={order.commonUOM}
        />
      </TableCell>
    ),
  },
  {
    key: "amount",
    width: COL_WIDTH.amount,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} text-right ${headCls}`} style={style}>Amount</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 text-right text-[13px] font-medium text-[#0F1720] ${cellCls}`} style={style}>
        {formatIndianAmount(
          typeof order.totalAmount === 'number'
            ? order.totalAmount
            : parseFloat(order.totalAmount.$numberDecimal)
        )}
      </TableCell>
    ),
  },
  {
    key: "paymentTerms",
    width: COL_WIDTH.paymentTerms,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Payment Terms</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {order.paymentTerms || "—"}
      </TableCell>
    ),
  },
  {
    key: "shipmentStatus",
    width: COL_WIDTH.shipmentStatus,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Shipment Status</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => {
      const cfg = RECEIPT_STATUS_CONFIG[order.receiptStatus] ?? RECEIPT_STATUS_CONFIG.pending;
      return (
        <TableCell className={`px-3 ${cellCls}`} style={style}>
          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[12px] font-medium ${cfg.className}`}>
            {cfg.label}
          </span>
        </TableCell>
      );
    },
  },
  {
    key: "totalOrder",
    width: COL_WIDTH.totalOrder,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} text-right ${headCls}`} style={style}>Total Order</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 text-right text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {order.totalQuantity != null
          ? <QuantityCell value={order.totalQuantity} uom={order.commonUOM ?? ""} />
          : "—"}
      </TableCell>
    ),
  },
  {
    key: "pendingOrder",
    width: COL_WIDTH.pendingOrder,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} text-right ${headCls}`} style={style}>Pending Order</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 text-right text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {order.pendingQuantity != null
          ? <QuantityCell value={order.pendingQuantity} uom={order.commonUOM ?? ""} />
          : "—"}
      </TableCell>
    ),
  },
];

const DEFAULT_ORDER = COLUMN_DEFS.map((c) => c.key);
const DEFAULT_VISIBLE = COLUMN_DEFS.map((c) => c.key);

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <TableRow className="animate-pulse">
      <TableCell className="w-[68px]">
        <div className="flex gap-1.5">
          <div className="h-6 w-6 rounded bg-gray-200" />
          <div className="h-6 w-6 rounded bg-gray-200" />
        </div>
      </TableCell>
      {Array.from({ length: colCount }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-3.5 w-24 rounded bg-gray-200" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="h-4 w-20 rounded bg-gray-200" />
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="h-3.5 w-36 rounded bg-gray-200" />
        <div className="h-5 w-16 rounded bg-gray-200" />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className="h-3 w-20 rounded bg-gray-200" />
        <div className="h-3 w-24 rounded bg-gray-200" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-32 rounded bg-gray-200" />
        <div className="flex-1 h-1 rounded bg-gray-200" />
      </div>
    </div>
  );
}

// ── Status-based dropdown menu ────────────────────────────────────────────────

interface ActionMenuProps {
  order: SalesOrder;
  onCancel: () => void;
  onConfirm: () => void;
  onForceClose: () => void;
}

function ActionMenu({ order, onCancel, onConfirm, onForceClose }: ActionMenuProps) {
  const router = useRouter();
  const { status } = order;

  return (
    <DropdownMenuContent align="start" className="w-48">
      {status === "cancelled" || status === "completed" ? (
        <RequirePermission permission="sales-order.add">
          <DropdownMenuItem
            onClick={() => router.push(`/sales-orders/create?duplicateFrom=${order.id}`)}
          >
            Create Duplicate
          </DropdownMenuItem>
        </RequirePermission>
      ) : status === "draft" ? (
        <>
          <RequirePermission permission="sales-order.edit">
            <DropdownMenuItem onClick={() => router.push(`/sales-orders/${order.id}/edit`)}>
              Edit Order
            </DropdownMenuItem>
          </RequirePermission>
          <RequirePermission permission="sales-order.add">
            <DropdownMenuItem
              onClick={() => router.push(`/sales-orders/create?duplicateFrom=${order.id}`)}
            >
              Create Duplicate
            </DropdownMenuItem>
          </RequirePermission>
          <RequirePermission permission="sales-order.cancel">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onCancel}
              className="text-[#DC2626] focus:text-[#DC2626]"
            >
              Cancel Order
            </DropdownMenuItem>
          </RequirePermission>
        </>
      ) : status === "issued" ? (
        <>
          <RequirePermission permission="sales-order.edit">
            <DropdownMenuItem onClick={() => router.push(`/sales-orders/${order.id}/edit`)}>
              Edit Order
            </DropdownMenuItem>
          </RequirePermission>
          <RequirePermission permission="sales-order.add">
            <DropdownMenuItem
              onClick={() => router.push(`/sales-orders/create?duplicateFrom=${order.id}`)}
            >
              Create Duplicate
            </DropdownMenuItem>
          </RequirePermission>
          <RequirePermission permission="sales-order.cancel">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onCancel}
              className="text-[#DC2626] focus:text-[#DC2626]"
            >
              Cancel Order
            </DropdownMenuItem>
          </RequirePermission>
          <RequirePermission permission="sales-order.confirm">
            <DropdownMenuItem onClick={onConfirm}>
              Mark as Confirmed
            </DropdownMenuItem>
          </RequirePermission>
          <RequirePermission permission="sales-order.force-close">
            <DropdownMenuItem
              onClick={onForceClose}
              className="text-[#DC2626] focus:text-[#DC2626]"
            >
              Force Close
            </DropdownMenuItem>
          </RequirePermission>
        </>
      ) : status === "confirmed" ? (
        <>
          <RequirePermission permission="sales-order.edit">
            <DropdownMenuItem onClick={() => router.push(`/sales-orders/${order.id}/edit`)}>
              Edit Order
            </DropdownMenuItem>
          </RequirePermission>
          <RequirePermission permission="sales-order.add">
            <DropdownMenuItem
              onClick={() => router.push(`/sales-orders/create?duplicateFrom=${order.id}`)}
            >
              Create Duplicate
            </DropdownMenuItem>
          </RequirePermission>
          <RequirePermission permission="sales-order.cancel">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onCancel}
              className="text-[#DC2626] focus:text-[#DC2626]"
            >
              Cancel Order
            </DropdownMenuItem>
          </RequirePermission>
          <RequirePermission permission="sales-order.force-close">
            <DropdownMenuItem
              onClick={onForceClose}
              className="text-[#DC2626] focus:text-[#DC2626]"
            >
              Force Close
            </DropdownMenuItem>
          </RequirePermission>
        </>
      ) : null}
    </DropdownMenuContent>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface SOTableProps {
  orders: SalesOrder[];
  isLoading: boolean;
  visibleColumns?: string[];
  columnOrder?: string[];
  frozenCount?: number;
  flash?: boolean;
  onRefresh: () => void;
}

export function SOTable({
  orders,
  isLoading,
  visibleColumns = DEFAULT_VISIBLE,
  columnOrder = DEFAULT_ORDER,
  frozenCount = 0,
  flash = false,
  onRefresh,
}: SOTableProps) {
  const router = useRouter();
  const [cancelModal, setCancelModal] = useState<{ open: boolean; order?: SalesOrder }>({ open: false });
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; order?: SalesOrder }>({ open: false });
  const [forceCloseModal, setForceCloseModal] = useState<{ open: boolean; order?: SalesOrder }>({ open: false });
  const [quickViewSO, setQuickViewSO] = useState<SalesOrder | null>(null);

  // Build the ordered, filtered list of active columns
  const activeCols = useMemo(
    () => columnOrder
      .map((key) => COLUMN_DEFS.find((c) => c.key === key))
      .filter((col): col is ColDef => col != null && visibleColumns.includes(col.key)),
    [columnOrder, visibleColumns],
  );

  // Compute sticky properties for a given active column index
  const getStickyFor = useCallback(function getStickyFor(index: number): Sticky {
    if (index >= frozenCount) return NO_STICKY;
    let left = ACTIONS_COL_WIDTH;
    for (let i = 0; i < index; i++) {
      left += activeCols[i].width;
    }
    return {
      headCls: "sticky z-20 bg-gray-50",
      cellCls: "sticky z-10 bg-white group-hover:bg-gray-50",
      style: { left },
    };
  }, [activeCols, frozenCount]);

  const totalCols = 1 + activeCols.length;

  // Reusable actions trigger for mobile cards
  function CardActionsMenu({ order }: { order: SalesOrder }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded p-2.5 -m-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
            aria-label="More actions"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <ActionMenu
          order={order}
          onCancel={() => setCancelModal({ open: true, order })}
          onConfirm={() => setConfirmModal({ open: true, order })}
          onForceClose={() => setForceCloseModal({ open: true, order })}
        />
      </DropdownMenu>
    );
  }

  return (
    <>
      {/* ── Mobile card list ── */}
      <div className="lg:hidden flex flex-col gap-3 p-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6 text-[#0d9488]" />}
            title="No sales orders yet"
            description="Create your first sales order to start tracking orders with your buyers."
            actionLabel="New Sales Order"
            onAction={() => router.push("/sales-orders/create")}
          />
        ) : (
          orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;
            const amount =
              typeof order.totalAmount === "number"
                ? order.totalAmount
                : parseFloat(order.totalAmount.$numberDecimal);
            const pending = order.pendingQuantity ?? 0;
            const total = order.totalQuantity ?? 0;
            const pct = Math.min(100, Math.round(order.receiptCompletionPercentage ?? 0));

            return (
              <div
                key={order.id}
                onClick={() => router.push(`/sales-orders/${order.id}`)}
                className="rounded-lg border border-gray-200 bg-white p-4 cursor-pointer active:bg-gray-50"
              >
                {/* Row 1: SO Number | Amount */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium text-[#0d9488]">
                    {order.poNumber}
                  </span>
                  <span className="text-[13px] font-medium text-[#0F1720]">
                    {formatIndianAmount(amount)}
                  </span>
                </div>
                {/* Row 2: Buyer | Status */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] text-gray-600 truncate mr-2">
                    {order.biller?.name ?? "—"}
                  </span>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium flex-shrink-0 ${statusCfg.className}`}>
                    {statusCfg.label}
                  </span>
                </div>
                {/* Row 3: Issue Date | Delivery Date + Overdue | Three-dot menu */}
                <div className="flex items-center gap-3 text-[12px] text-gray-400 mb-2">
                  <span>{formatDate(order.issueDate)}</span>
                  <span className="text-gray-300">→</span>
                  <span>{formatDate(order.deliveryDate)}</span>
                  {order.delayDays > 0 && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                      Overdue {order.delayDays}d
                    </span>
                  )}
                  <div className="ml-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <CardActionsMenu order={order} />
                  </div>
                </div>
                {/* Row 4: Shipment progress */}
                {total > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-medium text-[#0F1720]">
                      <QuantityCell value={pending} uom={order.commonUOM ?? ""} /> / <QuantityCell value={total} uom={order.commonUOM ?? ""} /> Pending
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 rounded-full bg-gray-100 h-1">
                        <div className="bg-[#0d9488] h-1 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400">{pct}%</span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop table ── */}
      <div className={`hidden lg:block transition-all duration-300 ${flash ? "ring-2 ring-[#0d9488]/40 rounded-md" : ""}`}>
        <div className="w-full overflow-x-auto bg-white">
          <Table className="min-w-[1600px]">
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                {/* Actions — always sticky at left: 0 */}
                <TableHead
                  className="w-[68px] px-4 sticky z-20 bg-gray-50"
                  style={{ left: 0 }}
                />
                {activeCols.map((col, i) => (
                  <Fragment key={col.key}>
                    {col.renderHead(getStickyFor(i))}
                  </Fragment>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} colCount={activeCols.length} />
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={totalCols} className="p-0">
                    <EmptyState
                      icon={<FileText className="h-6 w-6 text-[#0d9488]" />}
                      title="No sales orders yet"
                      description="Create your first sales order to start tracking orders with your buyers."
                      actionLabel="New Sales Order"
                      onAction={() => router.push("/sales-orders/create")}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="group border-b border-gray-100 hover:bg-gray-50"
                  >
                    {/* Actions — always sticky at left: 0 */}
                    <TableCell
                      className="w-[68px] px-4 sticky z-10 bg-white group-hover:bg-gray-50"
                      style={{ left: 0 }}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQuickViewSO(order)}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0d9488]"
                          aria-label="Quick view"
                        >
                          <Eye className="h-[15px] w-[15px]" />
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
                              aria-label="More actions"
                            >
                              <MoreHorizontal className="h-[15px] w-[15px]" />
                            </button>
                          </DropdownMenuTrigger>
                          <ActionMenu
                            order={order}
                            onCancel={() => setCancelModal({ open: true, order })}
                            onConfirm={() => setConfirmModal({ open: true, order })}
                            onForceClose={() => setForceCloseModal({ open: true, order })}
                          />
                        </DropdownMenu>
                      </div>
                    </TableCell>

                    {activeCols.map((col, i) => (
                      <Fragment key={col.key}>
                        {col.renderCell(order, getStickyFor(i))}
                      </Fragment>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {cancelModal.order && (
        <CancelPOModal
          isOpen={cancelModal.open}
          onClose={() => setCancelModal({ open: false })}
          onSuccess={() => { setCancelModal({ open: false }); onRefresh(); }}
          orderId={cancelModal.order.id}
          poNumber={cancelModal.order.poNumber}
          status={cancelModal.order.status}
          receiptStatus={cancelModal.order.receiptStatus}
          supplierName={cancelModal.order.supplier.name}
          issueDate={cancelModal.order.issueDate}
          orderType="sales"
        />
      )}
      {confirmModal.order && (
        <ConfirmPOModal
          isOpen={confirmModal.open}
          onClose={() => setConfirmModal({ open: false })}
          onSuccess={() => { setConfirmModal({ open: false }); onRefresh(); }}
          orderId={confirmModal.order.id}
          poNumber={confirmModal.order.poNumber}
          status={confirmModal.order.status}
          receiptStatus={confirmModal.order.receiptStatus}
          supplierName={confirmModal.order.supplier.name}
          issueDate={confirmModal.order.issueDate}
          orderType="sales"
        />
      )}
      {forceCloseModal.order && (
        <ForceClosePOModal
          isOpen={forceCloseModal.open}
          onClose={() => setForceCloseModal({ open: false })}
          onSuccess={() => { setForceCloseModal({ open: false }); onRefresh(); }}
          order={forceCloseModal.order}
          orderType="sales"
        />
      )}
      {quickViewSO && (
        <SOQuickView
          po={quickViewSO}
          onClose={() => setQuickViewSO(null)}
        />
      )}
    </>
  );
}
