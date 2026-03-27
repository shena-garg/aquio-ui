"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { salesOrdersService } from "@/services/sales-orders";
import { SODetailsHeader } from "@/components/sales-orders/details/SODetailsHeader";
import { SODetailsMetaStrip } from "@/components/sales-orders/details/SODetailsMetaStrip";
import { SODetailsDateStrip } from "@/components/sales-orders/details/SODetailsDateStrip";
import { SODetailsProgress } from "@/components/sales-orders/details/SODetailsProgress";
import { SODetailsTabs } from "@/components/sales-orders/details/SODetailsTabs";
import { ReceiptFormModal } from "@/components/purchase-orders/modals/ReceiptFormModal";

function FullPageSkeleton() {
  return (
    <div className="flex flex-col h-full gap-4 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-gray-200" />
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="h-5 w-20 rounded bg-gray-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
        </div>
      </div>

      {/* Meta strip skeleton */}
      <div className="flex gap-6 rounded-md border border-gray-200 bg-white px-4 py-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Date strip skeleton */}
      <div className="flex gap-6 rounded-md border border-gray-200 bg-white px-4 py-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-4 w-28 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Progress skeleton */}
      <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
        <div className="h-3 w-32 rounded bg-gray-200 mb-3" />
        <div className="h-2 w-full rounded-full bg-gray-200" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex-1 rounded-md border border-gray-200 bg-white">
        <div className="flex gap-4 border-b border-gray-200 px-4 py-3">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
        </div>
        <div className="p-4 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded bg-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [createShipmentOpen, setCreateShipmentOpen] = useState(false);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["sales-order", id],
    queryFn: () => salesOrdersService.getById(id).then((r) => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load sales order. Please try again.");
    }
  }, [isError]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-auto">
        <FullPageSkeleton />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <p className="text-[15px] text-gray-600">
          {isError ? "Something went wrong loading this sales order." : "Sales order not found."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="h-8 gap-1.5 text-[13px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <SODetailsHeader order={order} onCreateShipment={() => setCreateShipmentOpen(true)} />
      {/* Parties card: MetaStrip + DateStrip - desktop */}
      <div className="hidden sm:block mx-8 mt-3">
        <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-2">
          <SODetailsMetaStrip order={order} />
          <SODetailsDateStrip order={order} />
        </div>
      </div>

      {/* Parties + Dates combined - mobile */}
      <div className="sm:hidden mx-4 mt-3">
        <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 space-y-2">
          {/* Row 1: Customer | Issue Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">Customer</span>
              <div className="flex items-center gap-1 text-[13px] font-medium text-[#111827]">
                {order.supplier?.name ?? "\u2014"}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">Issue Date</span>
              <span className="text-[13px] font-medium text-[#111827]">
                {order.issueDate ? new Date(order.issueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014"}
              </span>
            </div>
          </div>

          <div className="border-t border-[#f3f4f6]" />

          {/* Row 2: Consignee | Delivery Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">Consignee</span>
              <div className="flex items-center gap-1 text-[13px] font-medium text-[#111827]">
                {order.buyer?.name ?? "\u2014"}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">Delivery Date</span>
              <span className="text-[13px] font-medium text-[#111827]">
                {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "\u2014"}
              </span>
            </div>
          </div>

          <div className="border-t border-[#f3f4f6]" />

          {/* Row 3: Buyer | Payment Terms */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">Buyer</span>
              <div className="flex items-center gap-1 text-[13px] font-medium text-[#111827]">
                {order.biller?.name ?? "\u2014"}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold tracking-[0.8px] text-[#6b7280] uppercase">Payment Terms</span>
              <span className="text-[13px] font-medium text-[#111827]">
                {order.paymentTerms || "\u2014"}
              </span>
            </div>
          </div>
        </div>
      </div>
      <SODetailsProgress order={order} />
      <SODetailsTabs order={order} />
      <ReceiptFormModal
        mode="create"
        orderId={order.id ?? order._id}
        order={order}
        isOpen={createShipmentOpen}
        onClose={() => setCreateShipmentOpen(false)}
        onSuccess={() => setCreateShipmentOpen(false)}
        orderType="sales"
      />
    </div>
  );
}
