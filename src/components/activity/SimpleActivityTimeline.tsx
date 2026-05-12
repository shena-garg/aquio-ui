"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Clock, Plus, Pencil, Trash2, Archive, UserPlus,
  CheckCircle, CheckCircle2, XCircle, KeyRound, ShieldCheck,
  MailCheck, Truck, Lock, RotateCcw, Loader2,
} from "lucide-react";
import type { AuditEvent, User } from "@/services/activity";
import { resolveUserName, formatEventDate } from "@/services/activity";

// ---------------------------------------------------------------------------
// Action config
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; dotColor: string; badgeClass: string }> = {
  create:    { label: "Created",          icon: <Plus size={13} />,           dotColor: "bg-[#0d9488]",  badgeClass: "bg-teal-50 text-teal-700 border border-teal-200" },
  update:    { label: "Updated",          icon: <Pencil size={13} />,         dotColor: "bg-blue-500",   badgeClass: "bg-blue-50 text-blue-700 border border-blue-200" },
  delete:    { label: "Deleted",          icon: <Trash2 size={13} />,         dotColor: "bg-red-500",    badgeClass: "bg-red-50 text-red-600 border border-red-200" },
  archive:   { label: "Archived",         icon: <Archive size={13} />,        dotColor: "bg-orange-500", badgeClass: "bg-orange-50 text-orange-700 border border-orange-200" },
  invite:    { label: "Invited",          icon: <UserPlus size={13} />,       dotColor: "bg-purple-500", badgeClass: "bg-purple-50 text-purple-700 border border-purple-200" },
  activate:  { label: "Activated",        icon: <CheckCircle size={13} />,    dotColor: "bg-green-500",  badgeClass: "bg-green-50 text-green-700 border border-green-200" },
  cancel:    { label: "Cancelled",        icon: <XCircle size={13} />,        dotColor: "bg-red-500",    badgeClass: "bg-red-50 text-red-600 border border-red-200" },
  confirm:   { label: "Confirmed",        icon: <CheckCircle2 size={13} />,   dotColor: "bg-green-600",  badgeClass: "bg-green-50 text-green-800 border border-green-300" },
  receipt_create:             { label: "Receipt Created",  icon: <Truck size={13} />,       dotColor: "bg-teal-500",   badgeClass: "bg-teal-50 text-teal-700 border border-teal-200" },
  receipt_update:             { label: "Receipt Updated",  icon: <Pencil size={13} />,      dotColor: "bg-blue-400",   badgeClass: "bg-blue-50 text-blue-600 border border-blue-200" },
  forcefully_close_item:      { label: "Force Closed",     icon: <Lock size={13} />,        dotColor: "bg-orange-500", badgeClass: "bg-orange-50 text-orange-700 border border-orange-200" },
  undo_forcefully_close_item: { label: "Undo Force Close", icon: <RotateCcw size={13} />,   dotColor: "bg-slate-500",  badgeClass: "bg-slate-50 text-slate-700 border border-slate-200" },
  change_password: { label: "Changed Password", icon: <KeyRound size={13} />,    dotColor: "bg-slate-500",  badgeClass: "bg-slate-50 text-slate-700 border border-slate-200" },
  set_password:    { label: "Set Password",     icon: <ShieldCheck size={13} />, dotColor: "bg-teal-600",   badgeClass: "bg-teal-50 text-teal-700 border border-teal-200" },
  verify_email:    { label: "Verified Email",   icon: <MailCheck size={13} />,   dotColor: "bg-indigo-500", badgeClass: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
};

// ---------------------------------------------------------------------------
// Entity labels
// ---------------------------------------------------------------------------

const ENTITY_LABELS: Record<string, string> = {
  product:        "Product",
  category:       "Category",
  location:       "Location",
  user:           "User",
  partner:        "Partner",
  purchase_order: "Purchase Order",
  receipt:        "Receipt",
};

function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function getEntityUrl(entityType: string, entityId: string, event: AuditEvent): string | null {
  switch (entityType) {
    case "purchase_order": {
      // Determine SO vs PO: check orderType in snapshot, fall back to order number prefix
      const orderType =
        (event.newValues as Record<string, unknown> | undefined)?.orderType ??
        (event.previousValues as Record<string, unknown> | undefined)?.orderType;
      if (orderType === "sales") return `/sales-orders/${entityId}`;
      const poNum = String((event.metadata as Record<string, unknown> | undefined)?.poNumber ?? "");
      if (poNum && /^SO/i.test(poNum)) return `/sales-orders/${entityId}`;
      return `/purchase-orders/${entityId}`;
    }
    // Receipt entityId is the parent order ID but orderType is indeterminate — skip navigation
    case "receipt":    return null;
    case "product":    return `/products/${entityId}`;
    case "user":       return `/users/${entityId}`;
    case "partner":    return `/partners/${entityId}`;
    case "category":   return "/categories";
    case "location":   return "/locations";
    default:           return null;
  }
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

function actionTitle(event: AuditEvent): string {
  const { action, entityType, newValues, previousValues, metadata } = event;
  const cfg = ACTION_CONFIG[action];
  const label = cfg?.label ?? action;

  // Receipt actions are self-describing; no entity suffix needed
  if (action === "receipt_create" || action === "receipt_update") return label;

  // PO/SO events: append order number when available
  const poNum = (metadata as Record<string, unknown> | undefined)?.poNumber;
  if (poNum && entityType === "purchase_order") return `${label} · ${poNum}`;

  // Other entities: label + entity type + optional name
  const entity = entityLabel(entityType);
  const values = (newValues ?? previousValues) as Record<string, unknown> | undefined;
  const name = values?.name ? ` "${values.name}"` : "";
  return `${label} ${entity}${name}`;
}

// ---------------------------------------------------------------------------
// Diff helpers
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  name:             "Name",
  sku:              "SKU",
  unitOfMeasurement:"Unit",
  gst:              "GST",
  hsnCode:          "HSN Code",
  description:      "Description",
  status:           "Status",
  categoryName:     "Category",
  subCategoryName:  "Subcategory",
  roleId:           "Role",
  taxNumber:        "Tax Number",
  contactNumber:    "Contact",
  city:             "City",
  state:            "State",
  email:            "Email",
  phoneNumber:      "Phone",
};

const STATUS_VALUE_LABELS: Record<string, string> = {
  active:   "Active",
  inactive: "Archived",
  archived: "Archived",
};

type ChangeType = "added" | "changed" | "removed";

interface FieldChange {
  field: string;
  from: string;
  to: string;
  type: ChangeType;
}

function isEmptyValue(_key: string, val: unknown): boolean {
  return val === undefined || val === null || val === "";
}

function formatFieldValue(key: string, val: unknown): string {
  if (isEmptyValue(key, val)) return "";
  if (key === "status") return STATUS_VALUE_LABELS[String(val)] ?? String(val);
  if (key === "description") {
    const str = String(val);
    return str.length > 80 ? str.slice(0, 80) + "…" : str;
  }
  return String(val);
}

function serializeForComparison(_key: string, val: unknown): string {
  return String(val ?? "");
}

function formatAttrValue(a: { value?: string; unit?: string }): string {
  return [a.value, a.unit].filter(Boolean).join(" ").trim();
}

function formatDateValue(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function renderChanges(
  prev?: Record<string, unknown>,
  next?: Record<string, unknown>
): FieldChange[] {
  if (!next) return [];
  const changes: FieldChange[] = [];
  for (const [key, newVal] of Object.entries(next)) {
    const label = FIELD_LABELS[key];
    if (!label) continue;
    if (prev != null && !(key in prev)) continue;
    const oldVal = prev?.[key];
    if (serializeForComparison(key, oldVal) === serializeForComparison(key, newVal)) continue;
    const wasEmpty = isEmptyValue(key, oldVal);
    const isNowEmpty = isEmptyValue(key, newVal);
    if (wasEmpty && isNowEmpty) continue;
    const type: ChangeType = wasEmpty ? "added" : isNowEmpty ? "removed" : "changed";
    changes.push({ field: label, from: formatFieldValue(key, oldVal), to: formatFieldValue(key, newVal), type });
  }
  return changes;
}

function renderCreateDetails(next?: Record<string, unknown>): FieldChange[] {
  if (!next) return [];
  const changes: FieldChange[] = [];
  for (const [key, val] of Object.entries(next)) {
    const label = FIELD_LABELS[key];
    if (!label || key === "status") continue;
    if (isEmptyValue(key, val)) continue;
    const formatted = formatFieldValue(key, val);
    if (formatted) changes.push({ field: label, from: "", to: formatted, type: "added" });
  }
  if (Array.isArray(next.termsOfConditions)) {
    for (const t of next.termsOfConditions as unknown[]) {
      const text = typeof t === "string" ? t : ((t as Record<string, string>)?.value ?? (t as Record<string, string>)?.text ?? String(t));
      if (text.trim()) changes.push({ field: "Terms", from: "", to: text, type: "added" });
    }
  }
  if (Array.isArray(next.variants)) {
    for (const v of next.variants as Record<string, unknown>[]) {
      if (!v?.name) continue;
      const attrs = ((v.customAttributes as Array<{ label: string; value?: string; unit?: string }>) ?? [])
        .map((a) => { const av = formatAttrValue(a); return av ? `${a.label}: ${av}` : null; })
        .filter(Boolean)
        .join(", ");
      changes.push({ field: "Variant", from: "", to: attrs ? `${v.name} · ${attrs}` : String(v.name), type: "added" });
    }
  }
  return changes;
}

function renderVariantChanges(
  prev?: Record<string, unknown>,
  next?: Record<string, unknown>
): FieldChange[] {
  if (prev != null && !("variants" in prev)) return [];
  const prevVariants = (Array.isArray(prev?.variants) ? prev.variants : []) as Array<{
    _id?: string; name: string; customAttributes?: Array<{ label: string; unit?: string; value?: string }>;
  }>;
  const nextVariants = (Array.isArray(next?.variants) ? next.variants : []) as Array<{
    _id?: string; name: string; customAttributes?: Array<{ label: string; unit?: string; value?: string }>;
  }>;
  if (prevVariants.length === 0 && nextVariants.length === 0) return [];

  const changes: FieldChange[] = [];
  const key = (v: { _id?: string; name: string }) => v._id ? String(v._id) : v.name;
  const prevMap = new Map(prevVariants.map((v) => [key(v), v]));
  const nextMap = new Map(nextVariants.map((v) => [key(v), v]));

  for (const [k, v] of nextMap) {
    if (!prevMap.has(k)) {
      const attrs = (v.customAttributes ?? []).map((a) => `${a.label}: ${formatAttrValue(a)}`).join(", ");
      changes.push({ field: "Variant", from: "", to: attrs ? `${v.name} · ${attrs}` : v.name, type: "added" });
    }
  }
  for (const [k, v] of prevMap) {
    if (!nextMap.has(k)) changes.push({ field: "Variant", from: v.name, to: "", type: "removed" });
  }
  for (const [k, nv] of nextMap) {
    const ov = prevMap.get(k);
    if (!ov) continue;
    if (ov.name !== nv.name) changes.push({ field: "Variant Renamed", from: ov.name, to: nv.name, type: "changed" });
    const ovAttrs = new Map((ov.customAttributes ?? []).map((a) => [a.label, a]));
    const nvAttrs = new Map((nv.customAttributes ?? []).map((a) => [a.label, a]));
    const variantLabel = `Variant "${nv.name}"`;
    for (const [label, na] of nvAttrs) {
      const oa = ovAttrs.get(label);
      const newVal = formatAttrValue(na);
      if (!oa) {
        if (newVal) changes.push({ field: `${variantLabel} · ${label}`, from: "", to: newVal, type: "added" });
      } else {
        const oldVal = formatAttrValue(oa);
        if (oldVal !== newVal) changes.push({ field: `${variantLabel} · ${label}`, from: oldVal, to: newVal, type: "changed" });
      }
    }
    for (const [label, oa] of ovAttrs) {
      if (!nvAttrs.has(label)) changes.push({ field: `${variantLabel} · ${label}`, from: formatAttrValue(oa), to: "", type: "removed" });
    }
  }
  return changes;
}

function renderFileChanges(
  prev?: Record<string, unknown>,
  next?: Record<string, unknown>
): FieldChange[] {
  if (!next?.files) return [];
  if (prev != null && !("files" in prev)) return [];
  const oldFiles = (Array.isArray(prev?.files) ? prev.files : []) as Array<{ id: string; name: string }>;
  const newFiles = (Array.isArray(next.files) ? next.files : []) as Array<{ id: string; name: string }>;
  const oldIds = new Set(oldFiles.map((f) => String(f.id)));
  const newIds = new Set(newFiles.map((f) => String(f.id)));
  const changes: FieldChange[] = [];
  for (const f of newFiles) {
    if (!oldIds.has(String(f.id))) changes.push({ field: "File", from: "", to: f.name, type: "added" });
  }
  for (const f of oldFiles) {
    if (!newIds.has(String(f.id))) changes.push({ field: "File", from: f.name, to: "", type: "removed" });
  }
  return changes;
}

function renderTermsChanges(
  prev?: Record<string, unknown>,
  next?: Record<string, unknown>
): FieldChange[] {
  const hasKey = (obj?: Record<string, unknown>) => obj != null && "termsOfConditions" in obj;
  if (prev != null && !hasKey(prev) && !hasKey(next)) return [];
  const normalise = (t: unknown): string =>
    typeof t === "string" ? t : ((t as Record<string, string>)?.value ?? (t as Record<string, string>)?.text ?? String(t));
  const prevTerms = (Array.isArray(prev?.termsOfConditions) ? prev!.termsOfConditions : []).map(normalise);
  const nextTerms = (Array.isArray(next?.termsOfConditions) ? next!.termsOfConditions : []).map(normalise);
  const prevSet = new Set(prevTerms);
  const nextSet = new Set(nextTerms);
  const changes: FieldChange[] = [];
  for (const t of nextTerms) {
    if (!prevSet.has(t)) changes.push({ field: "Terms", from: "", to: t, type: "added" });
  }
  for (const t of prevTerms) {
    if (!nextSet.has(t)) changes.push({ field: "Terms", from: t, to: "", type: "removed" });
  }
  return changes;
}

function renderReceiptDetails(
  newValues?: Record<string, unknown>,
  previousValues?: Record<string, unknown>
): FieldChange[] {
  if (!newValues) return [];
  const changes: FieldChange[] = [];
  const isCreate = !previousValues;

  // Delivery date
  const newDate = newValues.deliveryDate ? formatDateValue(String(newValues.deliveryDate)) : "";
  const oldDate = previousValues?.deliveryDate ? formatDateValue(String(previousValues.deliveryDate)) : "";
  if (isCreate) {
    if (newDate) changes.push({ field: "Delivery Date", from: "", to: newDate, type: "added" });
  } else if (newDate !== oldDate) {
    changes.push({ field: "Delivery Date", from: oldDate, to: newDate, type: "changed" });
  }

  // Notes
  const newNotes = newValues.notes ? String(newValues.notes) : "";
  const oldNotes = previousValues?.notes ? String(previousValues.notes) : "";
  if (isCreate) {
    if (newNotes) changes.push({ field: "Notes", from: "", to: newNotes, type: "added" });
  } else if (newNotes !== oldNotes) {
    const type: ChangeType = !oldNotes ? "added" : !newNotes ? "removed" : "changed";
    changes.push({ field: "Notes", from: oldNotes, to: newNotes, type });
  }

  // Products summary
  const newProds = (Array.isArray(newValues.products) ? newValues.products : []) as Array<{ deliveredQuantity?: number }>;
  const oldProds = (Array.isArray(previousValues?.products) ? previousValues!.products : []) as Array<{ deliveredQuantity?: number }>;
  const newQty = newProds.reduce((s, p) => s + (p.deliveredQuantity ?? 0), 0);
  const oldQty = oldProds.reduce((s, p) => s + (p.deliveredQuantity ?? 0), 0);

  if (isCreate) {
    if (newProds.length > 0) {
      const label = `${newProds.length} item${newProds.length !== 1 ? "s" : ""} · ${newQty} units`;
      changes.push({ field: "Received", from: "", to: label, type: "added" });
    }
  } else {
    if (newProds.length !== oldProds.length) {
      changes.push({ field: "Items", from: String(oldProds.length), to: String(newProds.length), type: "changed" });
    }
    if (newQty !== oldQty) {
      changes.push({ field: "Total Units", from: String(oldQty), to: String(newQty), type: "changed" });
    }
  }

  return changes;
}

function renderCancelDetails(newValues?: Record<string, unknown>): FieldChange[] {
  const reason = newValues?.cancellationReason;
  if (!reason) return [];
  return [{ field: "Reason", from: "", to: String(reason), type: "added" }];
}

function renderConfirmDetails(newValues?: Record<string, unknown>): FieldChange[] {
  const refId = newValues?.supplierReferenceId;
  if (!refId) return [];
  return [{ field: "Supplier Ref. ID", from: "", to: String(refId), type: "added" }];
}

function getEventChanges(event: AuditEvent): FieldChange[] {
  const { action, newValues, previousValues } = event;
  switch (action) {
    case "update":
      return [
        ...renderChanges(previousValues, newValues),
        ...renderTermsChanges(previousValues, newValues),
        ...renderFileChanges(previousValues, newValues),
        ...renderVariantChanges(previousValues, newValues),
      ];
    case "create":
      return renderCreateDetails(newValues);
    case "receipt_create":
      return renderReceiptDetails(newValues, undefined);
    case "receipt_update":
      return renderReceiptDetails(newValues, previousValues);
    case "cancel":
      return renderCancelDetails(newValues);
    case "confirm":
      return renderConfirmDetails(newValues);
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SimpleActivityTimelineProps {
  events: AuditEvent[];
  users: User[];
  /** If true, each event shows the entity type label and entity link (for user-centric feeds) */
  showEntityType?: boolean;
  /** Map of roleId → role name, used to resolve roleId field values */
  roleMap?: Record<string, string>;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function SimpleActivityTimeline({ events, users, showEntityType = false, roleMap, hasMore, onLoadMore, isLoadingMore }: SimpleActivityTimelineProps) {
  const parsed = useMemo(() =>
    events.map((event) => ({
      event,
      userName: resolveUserName(users, event.userId),
      formattedDate: formatEventDate(event.timestamp),
    })),
    [events, users]
  );

  if (parsed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#6b7280]">
        <Clock size={32} className="mb-2 opacity-30" />
        <p className="text-[13px]">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-[#e5e7eb]" />

      <div className="space-y-0">
        {parsed.map(({ event, userName, formattedDate }) => {
          const cfg = ACTION_CONFIG[event.action] ?? ACTION_CONFIG["update"];
          const title = actionTitle(event);
          const rawChanges = getEventChanges(event);
          const changes = roleMap
            ? rawChanges.map((ch) =>
                ch.field === "Role"
                  ? { ...ch, from: roleMap[ch.from] ?? ch.from, to: roleMap[ch.to] ?? ch.to }
                  : ch
              )
            : rawChanges;
          const url = showEntityType ? getEntityUrl(event.entityType, event.entityId, event) : null;

          const cardContent = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-[#111827]">{title}</span>
                  {showEntityType && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                      {entityLabel(event.entityType)}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.badgeClass}`}>
                    {cfg.label}
                  </span>
                </div>
                <span className="text-[11px] text-[#9ca3af] whitespace-nowrap shrink-0">{formattedDate}</span>
              </div>

              <p className="text-[12px] text-[#6b7280] mt-1">by {userName}</p>

              {changes.length > 0 && (
                <div className="mt-2 space-y-1">
                  {changes.map(({ field, from, to, type }, i) => (
                    <div key={`${field}-${i}`} className="text-[12px] text-[#374151]">
                      <span className="font-medium">{field}:</span>{" "}
                      {type === "added" && (
                        <span className="text-[#059669]">{to}</span>
                      )}
                      {type === "changed" && (
                        <>
                          <span className="line-through text-[#9ca3af]">{from}</span>
                          {" → "}
                          <span>{to}</span>
                        </>
                      )}
                      {type === "removed" && (
                        <span className="text-[#9ca3af]">Removed: <span className="line-through">{from}</span></span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          );

          return (
            <div key={event._id} className="relative flex gap-4 pb-6 pl-7">
              {/* Dot */}
              <div className={`absolute left-0 top-1 w-[23px] h-[23px] rounded-full ${cfg.dotColor} flex items-center justify-center text-white z-10`}>
                {cfg.icon}
              </div>

              {url ? (
                <Link
                  href={url}
                  className="flex-1 block bg-white border border-[#e5e7eb] rounded-lg px-4 py-3 shadow-sm hover:border-[#0d9488] hover:shadow-md transition-all"
                >
                  {cardContent}
                </Link>
              ) : (
                <div className="flex-1 bg-white border border-[#e5e7eb] rounded-lg px-4 py-3 shadow-sm">
                  {cardContent}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(hasMore || isLoadingMore) && (
        <div className="flex justify-center pt-2 pb-2">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-1.5 text-[13px] font-medium text-[#0d9488] hover:text-[#0f766e] disabled:opacity-50 transition-colors"
          >
            {isLoadingMore ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Loading…
              </>
            ) : (
              "Show More"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
