"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { purchaseOrdersService } from "@/services/purchase-orders";
import { PODetailsHeader } from "@/components/purchase-orders/details/PODetailsHeader";
import { PODetailsMetaStrip } from "@/components/purchase-orders/details/PODetailsMetaStrip";
import { PODetailsDateStrip } from "@/components/purchase-orders/details/PODetailsDateStrip";
import { PODetailsProgress } from "@/components/purchase-orders/details/PODetailsProgress";
import { PODetailsTabs } from "@/components/purchase-orders/details/PODetailsTabs";
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

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [createReceiptOpen, setCreateReceiptOpen] = useState(false);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => purchaseOrdersService.getById(id).then((r) => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load purchase order. Please try again.");
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
          {isError ? "Something went wrong loading this purchase order." : "Purchase order not found."}
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
      <PODetailsHeader order={order} onCreateReceipt={() => setCreateReceiptOpen(true)} />
      {/* Parties card: MetaStrip + DateStrip */}
      <div className="mx-8 mt-3">
        <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-2">
          <PODetailsMetaStrip order={order} />
          <PODetailsDateStrip order={order} />
        </div>
      </div>
      <PODetailsProgress order={order} />
      <PODetailsTabs order={order} />
      <ReceiptFormModal
        mode="create"
        orderId={order.id ?? order._id}
        order={order}
        isOpen={createReceiptOpen}
        onClose={() => setCreateReceiptOpen(false)}
        onSuccess={() => setCreateReceiptOpen(false)}
      />
    </div>
  );
}
