"use client";

import { useSearchParams } from "next/navigation";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";

export default function CreatePurchaseOrderPage() {
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom") ?? undefined;

  return <PurchaseOrderForm duplicateFromId={duplicateFrom} />;
}
