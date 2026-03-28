import apiClient from "@/lib/api-client";

export type POFilterStatus =
  | "in_progress"
  | "completed"
  | "draft"
  | "cancelled"
  | "delayed";

export type POOrderStatus =
  | "confirmed"
  | "issued"
  | "completed"
  | "draft"
  | "cancelled";

export interface Supplier {
  id: string;
  name: string;
}

export interface POProductMetadata {
  product: { name: string };
  variant: { name: string };
}

export interface POProduct {
  product: { _id: string };
  variant: { _id: string };
  metadata: POProductMetadata;
  quantity: { value: number; postfix: string };
  price: { value: { $numberDecimal: string } };
  gst: { value: number };
  totalAmount: { $numberDecimal: string };
}

export interface PORemainingItem {
  productId: string;
  variantId: string;
  remainingQuantity: number;
  status?: string;
  closedBy?: string;
  closedAt?: string;
  excessQuantity?: number;
}

export interface POReceiptProduct {
  productId: string;
  variantId: string;
  deliveredQuantity: number;
  allowExcess: boolean;
  excessQuantity: number;
}

export interface POReceipt {
  _id: string;
  userId: string;
  deliveryDate: string;
  products: POReceiptProduct[];
  notes: string;
  files: any[];
  createdAt: string;
}

export interface PurchaseOrder {
  _id: string;
  id: string;
  poNumber: string;
  status: POOrderStatus;
  receiptStatus: "pending" | "partial" | "completed" | "force closed" | "excess delivered";
  issueDate: string;
  deliveryDate: string;
  referenceId: string;
  supplierReferenceId: string;
  supplier: Supplier;
  buyer?: { name: string };
  biller?: { name: string };
  purchaseOrderPDF?: string;
  totalAmount: { $numberDecimal: string } | number;
  totalQuantity?: number;
  pendingQuantity?: number;
  receiptCompletionPercentage: number;
  delayDays: number;
  paymentTerms: string;
  hasUniformUOM?: boolean;
  commonUOM?: string;
  products?: POProduct[];
  remainingItems?: PORemainingItem[];
  receipts?: POReceipt[];
  notes?: string;
  termsAndConditions?: string[];
}

export interface POStatusCounts {
  all: number;
  inProgress: number;
  completed: number;
  draft: number;
  cancelled: number;
  delayed: number;
}

export interface POPagination {
  total: number;
  page: number;
  limit: number;
}

export interface PurchaseOrdersResponse {
  data: PurchaseOrder[];
  pagination: POPagination;
  counts: POStatusCounts;
}

/** Filters applied via the search bar — all optional */
export type POActiveFilters = {
  poNumber?: string;
  referenceId?: string;
  supplierReferenceId?: string;
  status?: string;
  receiptStatus?: string;
  issueDateFrom?: string;
  issueDateTo?: string;
  deliveryDateFrom?: string;
  deliveryDateTo?: string;
};

export interface GetPurchaseOrdersParams extends POActiveFilters {
  page: number;
  limit: number;
  /** Tab-level status filter — handled separately from the search-bar status filter */
  tabStatus?: POFilterStatus;
}

export type CsvPattern = "basic" | "comprehensive";

export interface ExportPurchaseOrdersParams {
  csvPattern: CsvPattern;
  orderType: "purchase";
  status?: string | string[];
  poNumber?: string;
  referenceId?: string;
  supplierReferenceId?: string;
  receiptStatus?: string;
  issueDateFrom?: string;
  issueDateTo?: string;
  deliveryDateFrom?: string;
  deliveryDateTo?: string;
}

export interface ForceCloseItem {
  productId: string;
  variantId: string;
}

export const purchaseOrdersService = {
  getById: (id: string) =>
    apiClient.get<PurchaseOrder>(`/purchase-orders/${id}?comprehensive=true`),

  cancel: (id: string, body: { cancellationReason: string; cancellationNotes?: string }) =>
    apiClient.patch(`/purchase-orders/${id}/cancel`, body),

  confirm: (id: string, body?: { supplierReferenceId?: string }) =>
    apiClient.patch(`/purchase-orders/${id}/confirm`, body ?? {}),

  forceCloseMultiple: (id: string, items: ForceCloseItem[]) =>
    apiClient.patch(`/purchase-orders/${id}/forcefully-close-multiple`, { items }),

  downloadCSV: (id: string) =>
    apiClient.patch<Blob>(`/purchase-orders/${id}/csv`, null, {
      responseType: "blob",
    }).then((r) => r.data),

  exportList: (params: ExportPurchaseOrdersParams) =>
    apiClient.get<Blob>("/purchase-orders/list", {
      params: { ...params, format: "csv" },
      responseType: "blob",
      paramsSerializer: { indexes: null },
    }),

  undoForceClose: (id: string, productId: string, variantId: string) =>
    apiClient.patch(`/purchase-orders/${id}/undo-forcefully-close`, { productId, variantId }),

  list: ({
    page,
    limit,
    tabStatus,
    poNumber,
    referenceId,
    supplierReferenceId,
    status,
    receiptStatus,
    issueDateFrom,
    issueDateTo,
    deliveryDateFrom,
    deliveryDateTo,
  }: GetPurchaseOrdersParams) => {
    const params: Record<string, string | number | string[]> = {
      page,
      limit,
      orderType: "purchase",
    };

    // Tab filter takes precedence over search-bar status filter
    if (tabStatus === "in_progress") {
      params.status = ["issued", "confirmed"];
    } else if (tabStatus) {
      params.status = tabStatus;
    } else if (status) {
      params.status = status;
    }

    if (poNumber)           params.poNumber           = poNumber;
    if (referenceId)        params.referenceId        = referenceId;
    if (supplierReferenceId) params.supplierReferenceId = supplierReferenceId;
    if (receiptStatus)      params.receiptStatus      = receiptStatus;
    if (issueDateFrom)      params.issueDateFrom      = issueDateFrom;
    if (issueDateTo)        params.issueDateTo        = issueDateTo;
    if (deliveryDateFrom)   params.deliveryDateFrom   = deliveryDateFrom;
    if (deliveryDateTo)     params.deliveryDateTo     = deliveryDateTo;

    return apiClient.get<PurchaseOrdersResponse>("/purchase-orders/list", {
      params,
      paramsSerializer: { indexes: null },
    });
  },
};
