"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, Download, FileText, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CancelPOModal } from "@/components/purchase-orders/modals/CancelPOModal";
import { ConfirmPOModal } from "@/components/purchase-orders/modals/ConfirmPOModal";
import { ForceClosePOModal } from "@/components/purchase-orders/modals/ForceClosePOModal";
import type { PurchaseOrder } from "@/services/purchase-orders";

const statusBadgeStyles: Record<string, string> = {
  issued: "bg-[#e0f2fe] text-[#0369a1]",
  confirmed: "bg-[#fef3c7] text-[#b45309]",
  completed: "bg-[#d1fae5] text-[#065f46]",
  draft: "bg-[#f3f4f6] text-[#374151]",
  cancelled: "bg-[#fee2e2] text-[#b91c1c]",
};

const receiptStatusBadgeStyles: Record<string, string> = {
  partial: "bg-[#fef3c7] text-[#b45309]",
  completed: "bg-[#d1fae5] text-[#065f46]",
  pending: "bg-[#f3f4f6] text-[#374151]",
  "force closed": "bg-[#fee2e2] text-[#b91c1c]",
  "excess delivered": "bg-[#f3e8ff] text-[#7c3aed]",
};

function capitalize(str: string) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface PODetailsHeaderProps {
  order: PurchaseOrder;
}

export function PODetailsHeader({ order }: PODetailsHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [forceCloseOpen, setForceCloseOpen] = useState(false);

  const { status } = order;

  function handleModalSuccess() {
    setCancelOpen(false);
    setConfirmOpen(false);
    setForceCloseOpen(false);
    queryClient.invalidateQueries({ queryKey: ["purchase-order", order.id] });
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
  }

  return (
    <>
      <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-[#e5e7eb]">
        {/* Left side */}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[22px] font-semibold tracking-[-0.22px] text-[#111827]">
              {order.poNumber}
            </span>
            <span
              className={`inline-flex items-center rounded-[6px] px-2 h-6 text-[12px] font-medium ${statusBadgeStyles[order.status] ?? ""}`}
            >
              {capitalize(order.status)}
            </span>
            <span
              className={`inline-flex items-center rounded-[6px] px-2 h-6 text-[12px] font-medium ${receiptStatusBadgeStyles[order.receiptStatus] ?? ""}`}
            >
              {capitalize(order.receiptStatus)}
            </span>
          </div>
          {(order.referenceId || order.supplierReferenceId) && (
            <div className="flex items-center gap-4 mt-1.5">
              {order.referenceId && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.55px] text-[#6b7280] uppercase">Ref ID:</span>
                  <span className="text-[13px] font-medium text-[#111827]">{order.referenceId}</span>
                </div>
              )}
              {order.supplierReferenceId && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.55px] text-[#6b7280] uppercase">Supplier Ref:</span>
                  <span className="text-[13px] font-medium text-[#111827]">{order.supplierReferenceId}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 px-3.5 rounded-[6px] text-[13px] font-medium"
            disabled={!order.purchaseOrderPDF}
            onClick={() => {
              if (order.purchaseOrderPDF) {
                window.open(order.purchaseOrderPDF, "_blank");
              }
            }}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download PDF
          </Button>

          {order.notes && order.notes.trim() !== "" && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 text-gray-600">
                  <FileText size={16} />
                  <span className="text-xs">Notes</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-72 text-[13px] text-[#374151]">
                {order.notes}
              </PopoverContent>
            </Popover>
          )}

          {order.termsAndConditions && order.termsAndConditions.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 text-gray-600">
                  <ClipboardList size={16} />
                  <span className="text-xs">Terms</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-80 text-[13px] text-[#374151]">
                <ol className="list-decimal pl-4 space-y-1">
                  {order.termsAndConditions.map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ol>
              </PopoverContent>
            </Popover>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 w-9 rounded-[6px] p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {status === "cancelled" || status === "completed" ? (
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `/purchase-orders/new?duplicateFrom=${order.id}`,
                    )
                  }
                >
                  Create Duplicate
                </DropdownMenuItem>
              ) : status === "draft" ? (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/purchase-orders/${order.id}/edit`)
                    }
                  >
                    Edit Order
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        `/purchase-orders/new?duplicateFrom=${order.id}`,
                      )
                    }
                  >
                    Create Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setCancelOpen(true)}
                    className="text-[#DC2626] focus:text-[#DC2626]"
                  >
                    Cancel Order
                  </DropdownMenuItem>
                </>
              ) : status === "issued" ? (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/purchase-orders/${order.id}/edit`)
                    }
                  >
                    Edit Order
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        `/purchase-orders/new?duplicateFrom=${order.id}`,
                      )
                    }
                  >
                    Create Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setCancelOpen(true)}
                    className="text-[#DC2626] focus:text-[#DC2626]"
                  >
                    Cancel Order
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
                    Mark as Confirmed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setForceCloseOpen(true)}
                    className="text-[#DC2626] focus:text-[#DC2626]"
                  >
                    Force Close
                  </DropdownMenuItem>
                </>
              ) : status === "confirmed" ? (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/purchase-orders/${order.id}/edit`)
                    }
                  >
                    Edit Order
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(
                        `/purchase-orders/new?duplicateFrom=${order.id}`,
                      )
                    }
                  >
                    Create Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setCancelOpen(true)}
                    className="text-[#DC2626] focus:text-[#DC2626]"
                  >
                    Cancel Order
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setForceCloseOpen(true)}
                    className="text-[#DC2626] focus:text-[#DC2626]"
                  >
                    Force Close
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          {(status === "issued" || status === "confirmed") && (
            <Button
              className="h-9 px-3.5 rounded-[6px] bg-[#0d9488] hover:bg-[#0f766e] text-white text-[13px] font-medium"
              onClick={() =>
                router.push(`/purchase-orders/${order.id}/receipts/new`)
              }
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Receipt
            </Button>
          )}
        </div>
      </div>

      {order.delayDays > 0 && (
        <div className="flex items-center gap-2 px-8 py-2 bg-[#fffbeb] border-l-4 border-l-[#f59e0b]">
          <AlertTriangle size={15} className="text-[#92400e] flex-shrink-0" />
          <span className="text-[13px] font-medium text-[#92400e]">
            Delivery overdue by {order.delayDays}{" "}
            {order.delayDays === 1 ? "day" : "days"} — Expected{" "}
            {new Date(order.deliveryDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      )}

      <CancelPOModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onSuccess={handleModalSuccess}
        orderId={order.id}
        poNumber={order.poNumber}
        status={order.status}
        receiptStatus={order.receiptStatus}
        supplierName={order.supplier?.name ?? ""}
        issueDate={order.issueDate}
      />
      <ConfirmPOModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onSuccess={handleModalSuccess}
        orderId={order.id}
        poNumber={order.poNumber}
        status={order.status}
        receiptStatus={order.receiptStatus}
        supplierName={order.supplier?.name ?? ""}
        issueDate={order.issueDate}
      />
      <ForceClosePOModal
        isOpen={forceCloseOpen}
        onClose={() => setForceCloseOpen(false)}
        onSuccess={handleModalSuccess}
        order={order}
      />
    </>
  );
}
