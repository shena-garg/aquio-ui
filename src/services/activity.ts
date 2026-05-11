import apiClient from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "invite"
  | "activate"
  | "cancel"
  | "confirm"
  | "receipt_create"
  | "receipt_update"
  | "forcefully_close_item"
  | "undo_forcefully_close_item"
  | "change_password"
  | "set_password"
  | "verify_email";

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
  discount?: number;
  oldPrice?: number;
  oldGst?: number;
  oldQuantity?: number;
  oldDiscount?: number;
}

export type SimpleFieldDiff = {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
};

export interface TermsDiff {
  added: string[];
  removed: string[];
}

export interface FileDiff {
  added: Array<{ id: string; name: string }>;
  removed: Array<{ id: string; name: string }>;
}

export interface PartnerDiff {
  field: string;
  label: string;
  oldPartner: any;
  newPartner: any;
}

export interface DiffResult {
  productDiffs: ProductDiff[];
  fieldDiffs: SimpleFieldDiff[];
  partnerDiffs: PartnerDiff[];
  termsDiff: TermsDiff;
  filesDiff: FileDiff;
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

export async function getEntityActivityLog(entityType: string, entityId: string): Promise<AuditEvent[]> {
  const { data } = await apiClient.get<AuditEvent[]>(
    `/audit-trail/entity/${entityType}/${entityId}/changes`
  );
  return data;
}

export async function getUserActivityLog(userId: string): Promise<AuditEvent[]> {
  const { data } = await apiClient.get<AuditEvent[]>(
    `/audit-trail/by-user/${userId}`
  );
  return data;
}

export async function getUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>("/users/names");
  return data;
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
  "createdBy",
  "updatedBy",
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
  poNumber: "Order Number",
  referenceId: "Ref. ID",
  supplierReferenceId: "Supplier Ref. ID",
  paymentTerms: "Payment Terms",
  issueDate: "Issue Date",
  deliveryDate: "Delivery Date",
  notes: "Notes",
};

const DATE_FIELDS = new Set(["issueDate", "deliveryDate"]);

interface RawProductLine {
  product: { _id: string; value?: string };
  variant: { _id: string; value?: string };
  price: { value: { $numberDecimal: string } | number };
  quantity: { value: number; postfix: string };
  gst: { value: number };
  discount?: { value: number };
}

function productKey(line: RawProductLine): string {
  return `${line.product._id}::${line.variant._id}`;
}

function readPrice(line: RawProductLine): number {
  const v = line.price?.value;
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && '$numberDecimal' in v) return parseFloat(v.$numberDecimal);
  return parseFloat(String(v));
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
        discount: nLine.discount?.value ?? 0,
      });
    } else {
      const oldPrice = readPrice(oLine);
      const newPrice = readPrice(nLine);
      const oldQty = oLine.quantity.value;
      const newQty = nLine.quantity.value;
      const oldGst = oLine.gst.value;
      const newGst = nLine.gst.value;
      const oldDiscount = oLine.discount?.value ?? 0;
      const newDiscount = nLine.discount?.value ?? 0;

      if (oldPrice !== newPrice || oldQty !== newQty || oldGst !== newGst || oldDiscount !== newDiscount) {
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
          discount: newDiscount,
          oldPrice,
          oldGst,
          oldQuantity: oldQty,
          oldDiscount,
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

function formatPartnerForDiff(partner: any): string {
  if (!partner) return "";
  const parts: string[] = [stringify(partner.name)];
  if (partner.taxNumber) parts.push(`Tax: ${partner.taxNumber}`);
  if (partner.contactNumber) parts.push(`Contact: ${partner.contactNumber}`);
  const addr = partner.address;
  if (addr) {
    const addrParts: string[] = [];
    if (addr.addressLine1) addrParts.push(addr.addressLine1);
    if (addr.city) addrParts.push(addr.city);
    if (addr.state) addrParts.push(addr.state);
    if (addr.postalCode) addrParts.push(addr.postalCode);
    if (addrParts.length) parts.push(addrParts.join(", "));
    if (addr.gstNumber) parts.push(`GST: ${addr.gstNumber}`);
  }
  return parts.filter(Boolean).join(" · ");
}

function diffTerms(
  prev: any[] | undefined,
  next: any[] | undefined
): TermsDiff {
  const normalise = (t: any): string =>
    typeof t === "string" ? t : (t?.value ?? t?.text ?? String(t));
  const prevSet = new Set((prev ?? []).map(normalise));
  const nextSet = new Set((next ?? []).map(normalise));
  return {
    added: [...nextSet].filter((t) => !prevSet.has(t)),
    removed: [...prevSet].filter((t) => !nextSet.has(t)),
  };
}

function diffFileRefs(
  prev: any[] | undefined,
  next: any[] | undefined
): FileDiff {
  const toMeta = (f: any) => ({ id: String(f.id ?? f._id ?? ""), name: String(f.name ?? "") });
  const prevList = (prev ?? []).map(toMeta);
  const nextList = (next ?? []).map(toMeta);
  const prevIds = new Set(prevList.map((f) => f.id));
  const nextIds = new Set(nextList.map((f) => f.id));
  return {
    added: nextList.filter((f) => !prevIds.has(f.id)),
    removed: prevList.filter((f) => !nextIds.has(f.id)),
  };
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

  // Partner fields — structured before/after diff
  const PARTNER_LABELS: Record<string, string> = {
    supplier: "Supplier",
    buyer: "Consignee (Ship To)",
    biller: "Buyer (Bill To)",
  };

  const partnerDiffs: PartnerDiff[] = [];
  for (const [field, label] of Object.entries(PARTNER_LABELS)) {
    const oldStr = formatPartnerForDiff(previousValues?.[field]);
    const newStr = formatPartnerForDiff(newValues?.[field]);
    if (oldStr !== newStr) {
      partnerDiffs.push({
        field,
        label,
        oldPartner: previousValues?.[field],
        newPartner: newValues?.[field],
      });
    }
  }

  const termsDiff = diffTerms(
    previousValues?.termsAndConditions,
    newValues?.termsAndConditions
  );

  const filesDiff = diffFileRefs(
    previousValues?.files,
    newValues?.files
  );

  // Build summary
  const sections: string[] = [];
  if (productDiffs.length > 0) sections.push("Products");
  for (const fd of fieldDiffs) sections.push(fd.label);
  for (const pd of partnerDiffs) sections.push(pd.label);
  if (termsDiff.added.length + termsDiff.removed.length > 0) sections.push("Terms");
  if (filesDiff.added.length + filesDiff.removed.length > 0) sections.push("Files");

  const summary = sections.length > 0 ? sections.join(" · ") : "No changes";

  return { productDiffs, fieldDiffs, partnerDiffs, termsDiff, filesDiff, summary };
}
