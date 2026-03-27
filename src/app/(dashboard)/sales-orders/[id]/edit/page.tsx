"use client";

import { useParams } from "next/navigation";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";

export default function EditSalesOrderPage() {
  const params = useParams();
  const id = params.id as string;

  return <PurchaseOrderForm editId={id} orderType="sales" />;
}
