import apiClient from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditAction =
  | "create"
  | "update"
  | "cancel"
  | "receipt_create"
  | "forcefully_close_item";

export interface AuditEvent {
  _id: string;
  entityType: string;
  entityId: string;
  subEntityId?: string;
  action: AuditAction;
  userId: string;
  organizationId: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface User {
  _id: string;
  name: string;
  email?: string;
}

export type ProductDiffType = "added" | "removed" | "updated";

export interface ProductDiff {
  type: ProductDiffType;
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  quantity?: number;
  uom?: string;
  price?: number;
  gst?: number;
  oldPrice?: number;
  oldGst?: number;
  oldQuantity?: number;
}

export type SimpleFieldDiff = {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
};

export interface DiffResult {
  productDiffs: ProductDiff[];
  fieldDiffs: SimpleFieldDiff[];
  summary: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getActivityLog(poId: string): Promise<AuditEvent[]> {
  const { data } = await apiClient.get<AuditEvent[]>(
    `/audit-trail/entity/purchase_order/${poId}/changes`
  );
  return data;
}

export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get<{ users: User[] }>("/users");
  return data.users;
}

export function resolveUserName(users: User[], userId: string): string {
  return users.find((u) => u._id === userId)?.name ?? "Unknown";
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

export function formatEventDate(timestamp: string): string {
  const d = new Date(timestamp);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  const time = d
    .toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace("\u202f", " ");
  return `${day} ${month} ${year}, ${time}`;
}

function formatDateValue(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

// ---------------------------------------------------------------------------
// Diff computation
// ---------------------------------------------------------------------------

const IGNORED_FIELDS = new Set([
  "_id",
  "__v",
  "createdAt",
  "updatedAt",
  "remainingItems",
  "receipts",
  "totalQuantity",
  "pendingQuantity",
  "receiptCompletionPercentage",
  "delayDays",
  "purchaseOrderPDF",
  "hasUniformUOM",
  "commonUOM",
  "masterType",
  "soIds",
  "poIds",
  "soId",
  "poId",
  "organizationId",
  "status",
  "receiptStatus",
  "orderType",
  "files",
  "termsAndConditions",
  "supplier",
  "buyer",
  "biller",
]);

const SIMPLE_FIELD_LABELS: Record<string, string> = {
  referenceId: "Reference ID",
  supplierReferenceId: "Supplier Reference ID",
  paymentTerms: "Payment Terms",
  issueDate: "Issue Date",
  deliveryDate: "Delivery Date",
  notes: "Notes",
};

const DATE_FIELDS = new Set(["issueDate", "deliveryDate"]);

interface RawProductLine {
  product: { _id: string; value?: string };
  variant: { _id: string; value?: string };
  price: { value: { $numberDecimal: string } };
  quantity: { value: number; postfix: string };
  gst: { value: number };
}

function productKey(line: RawProductLine): string {
  return `${line.product._id}::${line.variant._id}`;
}

function readPrice(line: RawProductLine): number {
  return parseFloat(line.price.value.$numberDecimal);
}

function diffProducts(
  oldProducts: RawProductLine[] | undefined,
  newProducts: RawProductLine[] | undefined
): ProductDiff[] {
  if (!oldProducts && !newProducts) return [];

  const oldMap = new Map<string, RawProductLine>();
  (oldProducts ?? []).forEach((p) => oldMap.set(productKey(p), p));

  const newMap = new Map<string, RawProductLine>();
  (newProducts ?? []).forEach((p) => newMap.set(productKey(p), p));

  const diffs: ProductDiff[] = [];

  // Added or updated
  for (const [key, nLine] of newMap) {
    const oLine = oldMap.get(key);
    if (!oLine) {
      diffs.push({
        type: "added",
        productId: nLine.product._id,
        variantId: nLine.variant._id,
        name: nLine.product.value ?? "",
        variantName: nLine.variant.value ?? "",
        quantity: nLine.quantity.value,
        uom: nLine.quantity.postfix,
        price: readPrice(nLine),
        gst: nLine.gst.value,
      });
    } else {
      const oldPrice = readPrice(oLine);
      const newPrice = readPrice(nLine);
      const oldQty = oLine.quantity.value;
      const newQty = nLine.quantity.value;
      const oldGst = oLine.gst.value;
      const newGst = nLine.gst.value;

      if (oldPrice !== newPrice || oldQty !== newQty || oldGst !== newGst) {
        diffs.push({
          type: "updated",
          productId: nLine.product._id,
          variantId: nLine.variant._id,
          name: nLine.product.value ?? "",
          variantName: nLine.variant.value ?? "",
          quantity: newQty,
          uom: nLine.quantity.postfix,
          price: newPrice,
          gst: newGst,
          oldPrice,
          oldGst,
          oldQuantity: oldQty,
        });
      }
    }
  }

  // Removed
  for (const [key, oLine] of oldMap) {
    if (!newMap.has(key)) {
      diffs.push({
        type: "removed",
        productId: oLine.product._id,
        variantId: oLine.variant._id,
        name: oLine.product.value ?? "",
        variantName: oLine.variant.value ?? "",
        quantity: oLine.quantity.value,
        uom: oLine.quantity.postfix,
        price: readPrice(oLine),
        gst: oLine.gst.value,
      });
    }
  }

  return diffs;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function computeDiff(
  previousValues: Record<string, any>,
  newValues: Record<string, any>
): DiffResult {
  const productDiffs = diffProducts(
    previousValues?.products,
    newValues?.products
  );

  const fieldDiffs: SimpleFieldDiff[] = [];

  for (const [field, label] of Object.entries(SIMPLE_FIELD_LABELS)) {
    if (IGNORED_FIELDS.has(field)) continue;

    let oldVal = stringify(previousValues?.[field]).trim();
    let newVal = stringify(newValues?.[field]).trim();

    if (DATE_FIELDS.has(field)) {
      if (oldVal) oldVal = formatDateValue(oldVal);
      if (newVal) newVal = formatDateValue(newVal);
    }

    if (oldVal !== newVal) {
      fieldDiffs.push({ field, label, oldValue: oldVal, newValue: newVal });
    }
  }

  // Partner fields — diff by .id, display .name
  const PARTNER_LABELS: Record<string, string> = {
    consignee: "Consignee (Ship To)",
    buyer: "Buyer (Bill To)",
    biller: "Biller",
  };

  for (const [field, label] of Object.entries(PARTNER_LABELS)) {
    const oldId = previousValues?.[field]?.id ?? "";
    const newId = newValues?.[field]?.id ?? "";
    if (oldId !== newId) {
      const oldName = stringify(previousValues?.[field]?.name).trim();
      const newName = stringify(newValues?.[field]?.name).trim();
      fieldDiffs.push({ field, label, oldValue: oldName, newValue: newName });
    }
  }

  // Build summary
  const sections: string[] = [];
  if (productDiffs.length > 0) sections.push("Products");
  for (const fd of fieldDiffs) sections.push(fd.label);

  const summary = sections.length > 0 ? sections.join(" · ") : "No changes";

  return { productDiffs, fieldDiffs, summary };
}
