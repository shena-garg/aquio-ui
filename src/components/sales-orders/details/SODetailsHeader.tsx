"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ClipboardList, Download, FileText, Loader2, MoreHorizontal, Plus } from "lucide-react";
import { salesOrdersService } from "@/services/sales-orders";
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
import { PageHeader } from "@/components/layout/PageHeader";
import { CancelPOModal } from "@/components/purchase-orders/modals/CancelPOModal";
import { ConfirmPOModal } from "@/components/purchase-orders/modals/ConfirmPOModal";
import { ForceClosePOModal } from "@/components/purchase-orders/modals/ForceClosePOModal";
import type { SalesOrder } from "@/services/sales-orders";
import { RequirePermission } from "@/components/auth/RequirePermission";

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

interface SODetailsHeaderProps {
  order: SalesOrder;
  onCreateShipment?: () => void;
}

export function SODetailsHeader({ order, onCreateShipment }: SODetailsHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [forceCloseOpen, setForceCloseOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const { status } = order;

  function handleModalSuccess() {
    setCancelOpen(false);
    setConfirmOpen(false);
    setForceCloseOpen(false);
    queryClient.invalidateQueries({ queryKey: ["sales-order", order.id ?? order._id] });
    queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
  }

  const pdfAllowedStatuses = ["issued", "confirmed", "completed"];
  const canGeneratePdf = pdfAllowedStatuses.includes(order.status);
  const hasPdf = !!order.purchaseOrderPDF && canGeneratePdf;

  async function handleGeneratePdf() {
    setIsGeneratingPdf(true);
    try {
      await salesOrdersService.generatePdf(order.id ?? order._id);
      toast.success("PDF generated successfully");
      queryClient.invalidateQueries({ queryKey: ["sales-order", order.id ?? order._id] });
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPdfError(apiMessage ?? "Failed to generate PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  function handleDownloadPdf() {
    if (order.purchaseOrderPDF) {
      window.open(`${process.env.NEXT_PUBLIC_API_BASE_URL}/files/download/${order.purchaseOrderPDF.id}`, "_blank");
    }
  }

  const leftContent = (
    <>
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
    </>
  );

  const hasNotes = order.notes && order.notes.trim() !== "";
  const hasTerms = order.termsAndConditions && order.termsAndConditions.length > 0;
  const showCreateShipment = status === "issued" || status === "confirmed";
  const hasSecondaryActions = hasNotes || hasTerms || showCreateShipment;

  const canRegenerate = hasPdf;

  const dropdownMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 w-9 rounded-[6px] p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canRegenerate && (
          <>
            <DropdownMenuItem onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
              {isGeneratingPdf ? "Generating…" : "Re-generate PDF"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {status === "cancelled" || status === "completed" ? (
          <DropdownMenuItem
            onClick={() =>
              router.push(
                `/sales-orders/create?duplicateFrom=${order._id ?? order.id}`,
              )
            }
          >
            Create Duplicate
          </DropdownMenuItem>
        ) : status === "draft" ? (
          <>
            <DropdownMenuItem
              onClick={() =>
                router.push(`/sales-orders/${order._id ?? order.id}/edit`)
              }
            >
              Edit Order
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(
                  `/sales-orders/create?duplicateFrom=${order._id ?? order.id}`,
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
            {order.receiptStatus === "pending" && (
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/sales-orders/${order._id ?? order.id}/edit`)
                }
              >
                Edit Order
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() =>
                router.push(
                  `/sales-orders/create?duplicateFrom=${order._id ?? order.id}`,
                )
              }
            >
              Create Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {order.receiptStatus !== "partial" && (
              <DropdownMenuItem
                onClick={() => setCancelOpen(true)}
                className="text-[#DC2626] focus:text-[#DC2626]"
              >
                Cancel Order
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
              Mark as Confirmed
            </DropdownMenuItem>
            <RequirePermission permission="sales-order.force-close">
              <DropdownMenuItem
                onClick={() => setForceCloseOpen(true)}
                className="text-[#DC2626] focus:text-[#DC2626]"
              >
                Force Close
              </DropdownMenuItem>
            </RequirePermission>
          </>
        ) : status === "confirmed" ? (
          <>
            {order.receiptStatus === "pending" && (
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/sales-orders/${order._id ?? order.id}/edit`)
                }
              >
                Edit Order
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() =>
                router.push(
                  `/sales-orders/create?duplicateFrom=${order._id ?? order.id}`,
                )
              }
            >
              Create Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {order.receiptStatus !== "partial" && (
              <DropdownMenuItem
                onClick={() => setCancelOpen(true)}
                className="text-[#DC2626] focus:text-[#DC2626]"
              >
                Cancel Order
              </DropdownMenuItem>
            )}
            <RequirePermission permission="sales-order.force-close">
              <DropdownMenuItem
                onClick={() => setForceCloseOpen(true)}
                className="text-[#DC2626] focus:text-[#DC2626]"
              >
                Force Close
              </DropdownMenuItem>
            </RequirePermission>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  /* -- Desktop: everything in one row -- */
  const rightContent = (
    <div className="hidden sm:flex items-center gap-2">
      {hasPdf ? (
        <Button
          variant="outline"
          className="h-9 px-3.5 rounded-[6px] text-[13px] font-medium"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1.5" />
          )}
          {isGeneratingPdf ? "Generating…" : "Download PDF"}
        </Button>
      ) : canGeneratePdf ? (
        <Button
          variant="outline"
          className="h-9 px-3.5 rounded-[6px] text-[13px] font-medium"
          onClick={handleGeneratePdf}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1.5" />
          )}
          {isGeneratingPdf ? "Generating…" : "Generate PDF"}
        </Button>
      ) : null}

      {hasNotes && (
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

      {hasTerms && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-gray-100 text-gray-600">
              <ClipboardList size={16} />
              <span className="text-xs">Terms</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-80 text-[13px] text-[#374151]">
            <ol className="list-decimal pl-4 space-y-1">
              {order.termsAndConditions!.map((term, i) => (
                <li key={i}>{term}</li>
              ))}
            </ol>
          </PopoverContent>
        </Popover>
      )}

      {dropdownMenu}

      {showCreateShipment && (
        <Button
          className="h-9 px-3.5 rounded-[6px] bg-[#0d9488] hover:bg-[#0f766e] text-white text-[13px] font-medium"
          onClick={() => onCreateShipment?.()}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create Shipment
        </Button>
      )}
    </div>
  );

  /* -- Mobile: Row 1 = Download icon + three-dot -- */
  const rightContentMobile = (
    <div className="flex sm:hidden items-center gap-1.5">
      {hasPdf ? (
        <Button
          variant="outline"
          className="h-9 w-9 rounded-[6px] p-0"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      ) : canGeneratePdf ? (
        <Button
          variant="outline"
          className="h-9 w-9 rounded-[6px] p-0"
          onClick={handleGeneratePdf}
          disabled={isGeneratingPdf}
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      ) : null}
      {dropdownMenu}
    </div>
  );

  return (
    <>
      <PageHeader
        title={order.poNumber}
        left={leftContent}
        right={<>{rightContent}{rightContentMobile}</>}
      />

      {/* Mobile: Row 2 - Notes, Terms, Create Shipment */}
      {hasSecondaryActions && (
        <div className="flex sm:hidden items-center gap-2 px-4 py-2 bg-white border-b border-[#e5e7eb]">
          {hasNotes && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] border border-[#e5e7eb] hover:bg-gray-50 text-gray-600 text-[12px] font-medium">
                  <FileText size={14} />
                  Notes
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 text-[13px] text-[#374151]">
                {order.notes}
              </PopoverContent>
            </Popover>
          )}

          {hasTerms && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] border border-[#e5e7eb] hover:bg-gray-50 text-gray-600 text-[12px] font-medium">
                  <ClipboardList size={14} />
                  Terms
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 text-[13px] text-[#374151]">
                <ol className="list-decimal pl-4 space-y-1">
                  {order.termsAndConditions!.map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ol>
              </PopoverContent>
            </Popover>
          )}

          {showCreateShipment && (
            <Button
              className="ml-auto h-8 px-3 rounded-[6px] bg-[#0d9488] hover:bg-[#0f766e] text-white text-[12px] font-medium"
              onClick={() => onCreateShipment?.()}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create Shipment
            </Button>
          )}
        </div>
      )}

      {(order.referenceId || order.supplierReferenceId) && (
        <div className="flex items-center gap-6 px-4 sm:px-6 py-1.5 bg-[#f9fafb] border-b border-[#e5e7eb]">
          {order.referenceId && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold tracking-[0.55px] text-[#6b7280] uppercase">Ref ID:</span>
              <span className="text-[13px] font-medium text-[#111827]">{order.referenceId}</span>
            </div>
          )}
          {order.supplierReferenceId && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold tracking-[0.55px] text-[#6b7280] uppercase">Buyer Ref. ID:</span>
              <span className="text-[13px] font-medium text-[#111827]">{order.supplierReferenceId}</span>
            </div>
          )}
        </div>
      )}

      {(() => {
        if (order.status === "draft" || order.status === "cancelled") return null;
        const due = new Date(order.deliveryDate);
        const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const today = new Date();
        const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const liveDelay = Math.floor((todayDay.getTime() - dueDay.getTime()) / 86_400_000);
        const displayDelay = order.status === "completed" ? order.delayDays : Math.max(liveDelay, 0);
        if (displayDelay <= 0) return null;
        return (
          <div className="flex items-center gap-2 px-6 py-1.5 bg-[#fffbeb] border-b border-[#e5e7eb] border-l-4 border-l-[#f59e0b]">
            <AlertTriangle size={14} className="text-[#92400e] flex-shrink-0" />
            <span className="text-[13px] font-medium text-[#92400e]">
              {order.status === "completed"
                ? `Delivered ${displayDelay} ${displayDelay === 1 ? "day" : "days"} late — Expected `
                : `Delivery overdue by ${displayDelay} ${displayDelay === 1 ? "day" : "days"} — Expected `}
              {new Date(order.deliveryDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        );
      })()}

      {pdfError && (
        <p className="px-6 py-2 text-[13px] text-[#dc2626] bg-red-50 border-b border-red-100">{pdfError}</p>
      )}

      <CancelPOModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onSuccess={handleModalSuccess}
        orderId={order.id ?? order._id}
        poNumber={order.poNumber}
        status={order.status}
        receiptStatus={order.receiptStatus}
        supplierName={order.supplier?.name ?? ""}
        issueDate={order.issueDate}
        orderType="sales"
      />
      <ConfirmPOModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onSuccess={handleModalSuccess}
        orderId={order.id ?? order._id}
        poNumber={order.poNumber}
        status={order.status}
        receiptStatus={order.receiptStatus}
        supplierName={order.supplier?.name ?? ""}
        issueDate={order.issueDate}
        orderType="sales"
      />
      <ForceClosePOModal
        isOpen={forceCloseOpen}
        onClose={() => setForceCloseOpen(false)}
        onSuccess={handleModalSuccess}
        order={order}
        orderType="sales"
      />
    </>
  );
}
