"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";

function CreatePurchaseOrderContent() {
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom") ?? undefined;

  return <PurchaseOrderForm duplicateFromId={duplicateFrom} />;
}

export default function CreatePurchaseOrderPage() {
  return (
    <Suspense>
      <CreatePurchaseOrderContent />
    </Suspense>
  );
}
