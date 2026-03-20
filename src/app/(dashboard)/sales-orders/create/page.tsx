"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";

function CreateSalesOrderContent() {
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom") ?? undefined;

  return <PurchaseOrderForm duplicateFromId={duplicateFrom} orderType="sales" />;
}

export default function CreateSalesOrderPage() {
  return (
    <Suspense>
      <CreateSalesOrderContent />
    </Suspense>
  );
}
