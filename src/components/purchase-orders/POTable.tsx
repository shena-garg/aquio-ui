"use client";

import { CSSProperties, Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal } from "lucide-react";
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
import type { PurchaseOrder, POOrderStatus } from "@/services/purchase-orders";
import { QuantityCell } from "@/components/ui/QuantityCell";
import { CancelPOModal } from "@/components/purchase-orders/modals/CancelPOModal";
import { ConfirmPOModal } from "@/components/purchase-orders/modals/ConfirmPOModal";
import { ForceClosePOModal } from "@/components/purchase-orders/modals/ForceClosePOModal";

// ── Status badge configs ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<POOrderStatus, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  issued:    { label: "Issued",    className: "bg-blue-50 text-blue-700 border border-blue-200"    },
  completed: { label: "Completed", className: "bg-green-50 text-green-700 border border-green-200" },
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-500 border border-gray-200"   },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border border-red-200"       },
};

type POReceiptStatus = PurchaseOrder["receiptStatus"];

const RECEIPT_STATUS_CONFIG: Record<POReceiptStatus, { label: string; className: string }> = {
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

// ── Receipt cell ──────────────────────────────────────────────────────────────

interface ReceiptCellProps {
  totalQuantity?: number;
  pendingQuantity?: number;
  receiptCompletionPercentage: number;
  uom?: string;
}

function ReceiptCell({ totalQuantity, pendingQuantity, receiptCompletionPercentage, uom }: ReceiptCellProps) {
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
  supplier:      160,
  supplierRef:   120,
  issueDate:     110,
  delivery:      150,
  status:        110,
  receipt:       220,
  amount:        140,
  paymentTerms:  130,
  receiptStatus: 140,
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
  renderCell: (order: PurchaseOrder, s: Sticky) => React.ReactNode;
}

const COLUMN_DEFS: ColDef[] = [
  {
    key: "poNumber",
    width: COL_WIDTH.poNumber,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>PO Number</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 ${cellCls}`} style={style}>
        <Link
          href={`/purchase-orders/${order.id}`}
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
    key: "supplier",
    width: COL_WIDTH.supplier,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Supplier</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] font-medium text-[#0F1720] ${cellCls}`} style={style}>
        {order.supplier.name}
      </TableCell>
    ),
  },
  {
    key: "supplierRef",
    width: COL_WIDTH.supplierRef,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Supplier Ref.</TableHead>
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
    key: "receipt",
    width: COL_WIDTH.receipt,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Receipt</TableHead>
    ),
    renderCell: (order, { cellCls, style }) => (
      <TableCell className={`px-3 py-2 ${cellCls}`} style={style}>
        <ReceiptCell
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
    key: "receiptStatus",
    width: COL_WIDTH.receiptStatus,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Receipt Status</TableHead>
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

// ── Status-based dropdown menu ────────────────────────────────────────────────

interface ActionMenuProps {
  order: PurchaseOrder;
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
        <DropdownMenuItem
          onClick={() => router.push(`/purchase-orders/create?duplicateFrom=${order.id}`)}
        >
          Create Duplicate
        </DropdownMenuItem>
      ) : status === "draft" ? (
        <>
          <DropdownMenuItem onClick={() => router.push(`/purchase-orders/${order.id}/edit`)}>
            Edit Order
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/purchase-orders/create?duplicateFrom=${order.id}`)}
          >
            Create Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onCancel}
            className="text-[#DC2626] focus:text-[#DC2626]"
          >
            Cancel Order
          </DropdownMenuItem>
        </>
      ) : status === "issued" ? (
        <>
          <DropdownMenuItem onClick={() => router.push(`/purchase-orders/${order.id}/edit`)}>
            Edit Order
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/purchase-orders/create?duplicateFrom=${order.id}`)}
          >
            Create Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onCancel}
            className="text-[#DC2626] focus:text-[#DC2626]"
          >
            Cancel Order
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onConfirm}>
            Mark as Confirmed
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onForceClose}
            className="text-[#DC2626] focus:text-[#DC2626]"
          >
            Force Close
          </DropdownMenuItem>
        </>
      ) : status === "confirmed" ? (
        <>
          <DropdownMenuItem onClick={() => router.push(`/purchase-orders/${order.id}/edit`)}>
            Edit Order
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/purchase-orders/create?duplicateFrom=${order.id}`)}
          >
            Create Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onCancel}
            className="text-[#DC2626] focus:text-[#DC2626]"
          >
            Cancel Order
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onForceClose}
            className="text-[#DC2626] focus:text-[#DC2626]"
          >
            Force Close
          </DropdownMenuItem>
        </>
      ) : null}
    </DropdownMenuContent>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface POTableProps {
  orders: PurchaseOrder[];
  isLoading: boolean;
  visibleColumns?: string[];
  columnOrder?: string[];
  frozenCount?: number;
  flash?: boolean;
  onRefresh: () => void;
}

export function POTable({
  orders,
  isLoading,
  visibleColumns = DEFAULT_VISIBLE,
  columnOrder = DEFAULT_ORDER,
  frozenCount = 0,
  flash = false,
  onRefresh,
}: POTableProps) {
  const [cancelModal, setCancelModal] = useState<{ open: boolean; order?: PurchaseOrder }>({ open: false });
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; order?: PurchaseOrder }>({ open: false });
  const [forceCloseModal, setForceCloseModal] = useState<{ open: boolean; order?: PurchaseOrder }>({ open: false });

  // Build the ordered, filtered list of active columns
  const activeCols = columnOrder
    .map((key) => COLUMN_DEFS.find((c) => c.key === key))
    .filter((col): col is ColDef => col != null && visibleColumns.includes(col.key));

  // Compute sticky properties for a given active column index
  function getStickyFor(index: number): Sticky {
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
  }

  const totalCols = 1 + activeCols.length;

  return (
    <>
      <div className={`transition-all duration-300 ${flash ? "ring-2 ring-[#0d9488]/40 rounded-md" : ""}`}>
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
                  <TableCell
                    colSpan={totalCols}
                    className="h-32 text-center text-[13px] text-gray-400"
                  >
                    No purchase orders found.
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
                        <Link
                          href={`/purchase-orders/${order.id}`}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0d9488]"
                          aria-label="View"
                        >
                          <Eye className="h-[15px] w-[15px]" />
                        </Link>

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
        />
      )}
      {forceCloseModal.order && (
        <ForceClosePOModal
          isOpen={forceCloseModal.open}
          onClose={() => setForceCloseModal({ open: false })}
          onSuccess={() => { setForceCloseModal({ open: false }); onRefresh(); }}
          order={forceCloseModal.order}
        />
      )}
    </>
  );
}
