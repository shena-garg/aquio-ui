"use client";

import { useMemo } from "react";
import { Clock, Plus, Pencil, Trash2, Archive, UserPlus, CheckCircle } from "lucide-react";
import type { AuditEvent, User } from "@/services/activity";
import { resolveUserName, formatEventDate } from "@/services/activity";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; dotColor: string; badgeClass: string }> = {
  create:    { label: "Created",   icon: <Plus size={13} />,        dotColor: "bg-[#0d9488]", badgeClass: "bg-teal-50 text-teal-700 border border-teal-200" },
  update:    { label: "Updated",   icon: <Pencil size={13} />,      dotColor: "bg-blue-500",  badgeClass: "bg-blue-50 text-blue-700 border border-blue-200" },
  delete:    { label: "Deleted",   icon: <Trash2 size={13} />,      dotColor: "bg-red-500",   badgeClass: "bg-red-50 text-red-600 border border-red-200" },
  archive:   { label: "Archived",  icon: <Archive size={13} />,     dotColor: "bg-orange-500",badgeClass: "bg-orange-50 text-orange-700 border border-orange-200" },
  invite:    { label: "Invited",   icon: <UserPlus size={13} />,    dotColor: "bg-purple-500",badgeClass: "bg-purple-50 text-purple-700 border border-purple-200" },
  activate:  { label: "Activated", icon: <CheckCircle size={13} />, dotColor: "bg-green-500", badgeClass: "bg-green-50 text-green-700 border border-green-200" },
};

const ENTITY_LABELS: Record<string, string> = {
  product:  "Product",
  category: "Category",
  location: "Location",
  user:     "User",
  partner:  "Partner",
  purchase_order: "Purchase Order",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  sku: "SKU",
  unitOfMeasurement: "Unit",
  gst: "GST",
  hsnCode: "HSN Code",
  description: "Description",
  termsOfConditions: "Terms",
  status: "Status",
  categoryName: "Category",
  subCategoryName: "Subcategory",
  roleId: "Role",
  taxNumber: "Tax Number",
  contactNumber: "Contact",
  city: "City",
  state: "State",
  email: "Email",
  phoneNumber: "Phone",
};

function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}

function actionTitle(action: string, entityType: string, values?: Record<string, unknown>): string {
  const cfg = ACTION_CONFIG[action];
  const label = cfg?.label ?? action;
  const entity = entityLabel(entityType);
  const name = values?.name ? ` "${values.name}"` : "";
  return `${label} ${entity}${name}`;
}

const STATUS_VALUE_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Archived",
  archived: "Archived",
};

function isEmptyValue(key: string, val: unknown): boolean {
  if (val === undefined || val === null || val === "") return true;
  if (key === "termsOfConditions" && Array.isArray(val)) return val.length === 0;
  return false;
}

function formatFieldValue(key: string, val: unknown): string {
  if (isEmptyValue(key, val)) return "";
  if (key === "status") return STATUS_VALUE_LABELS[String(val)] ?? String(val);
  if (key === "termsOfConditions" && Array.isArray(val))
    return `${val.length} term${val.length === 1 ? "" : "s"}`;
  if (key === "description") {
    const str = String(val);
    return str.length > 80 ? str.slice(0, 80) + "…" : str;
  }
  return String(val);
}

type ChangeType = "added" | "changed" | "removed";

interface FieldChange {
  field: string;
  from: string;
  to: string;
  type: ChangeType;
}

function serializeForComparison(key: string, val: unknown): string {
  if (key === "termsOfConditions" && Array.isArray(val)) return JSON.stringify(val);
  return String(val ?? "");
}

function formatAttrValue(a: { value?: string; unit?: string }): string {
  return [a.value, a.unit].filter(Boolean).join(" ").trim();
}

function renderVariantChanges(prev?: Record<string, unknown>, next?: Record<string, unknown>): FieldChange[] {
  // If prev doesn't have the variants key, we can't diff (historical gap)
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

  // Added variants
  for (const [k, v] of nextMap) {
    if (!prevMap.has(k)) {
      const attrs = (v.customAttributes ?? []).map((a) => `${a.label}: ${formatAttrValue(a)}`).join(", ");
      changes.push({ field: "Variant", from: "", to: attrs ? `${v.name} · ${attrs}` : v.name, type: "added" });
    }
  }

  // Removed variants
  for (const [k, v] of prevMap) {
    if (!nextMap.has(k)) {
      changes.push({ field: "Variant", from: v.name, to: "", type: "removed" });
    }
  }

  // Updated variants (same _id, different content)
  for (const [k, nv] of nextMap) {
    const ov = prevMap.get(k);
    if (!ov) continue;

    // Name change
    if (ov.name !== nv.name) {
      changes.push({ field: "Variant Renamed", from: ov.name, to: nv.name, type: "changed" });
    }

    // Custom attribute diffs
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
        if (oldVal !== newVal) {
          changes.push({ field: `${variantLabel} · ${label}`, from: oldVal, to: newVal, type: "changed" });
        }
      }
    }
    for (const [label, oa] of ovAttrs) {
      if (!nvAttrs.has(label)) {
        changes.push({ field: `${variantLabel} · ${label}`, from: formatAttrValue(oa), to: "", type: "removed" });
      }
    }
  }

  return changes;
}

function renderFileChanges(prev?: Record<string, unknown>, next?: Record<string, unknown>): FieldChange[] {
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

function renderChanges(prev?: Record<string, unknown>, next?: Record<string, unknown>): FieldChange[] {
  if (!next) return [];
  const changes: FieldChange[] = [];
  for (const [key, newVal] of Object.entries(next)) {
    const label = FIELD_LABELS[key];
    if (!label) continue;
    // If previousValues exists but doesn't have this key, we don't know the before state
    // (historical audit gap) — skip rather than show as always-"Added"
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
  if (Array.isArray(next.variants)) {
    for (const v of next.variants as any[]) {
      if (!v?.name) continue;
      const attrs = (v.customAttributes ?? [])
        .map((a: any) => { const av = formatAttrValue(a); return av ? `${a.label}: ${av}` : null; })
        .filter(Boolean)
        .join(", ");
      changes.push({ field: "Variant", from: "", to: attrs ? `${v.name} · ${attrs}` : v.name, type: "added" });
    }
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SimpleActivityTimelineProps {
  events: AuditEvent[];
  users: User[];
  /** If true, each event shows the entity type label (useful for user-centric feeds) */
  showEntityType?: boolean;
}

export function SimpleActivityTimeline({ events, users, showEntityType = false }: SimpleActivityTimelineProps) {
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
          const title = actionTitle(event.action, event.entityType, event.newValues ?? event.previousValues);
          const changes = event.action === "update"
            ? [
                ...renderChanges(event.previousValues, event.newValues),
                ...renderFileChanges(event.previousValues, event.newValues),
                ...renderVariantChanges(event.previousValues, event.newValues),
              ]
            : event.action === "create"
            ? renderCreateDetails(event.newValues)
            : [];

          return (
            <div key={event._id} className="relative flex gap-4 pb-6 pl-7">
              {/* Dot */}
              <div className={`absolute left-0 top-1 w-[23px] h-[23px] rounded-full ${cfg.dotColor} flex items-center justify-center text-white z-10`}>
                {cfg.icon}
              </div>

              {/* Card */}
              <div className="flex-1 bg-white border border-[#e5e7eb] rounded-lg px-4 py-3 shadow-sm">
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
                    {changes.map(({ field, from, to, type }) => (
                      <div key={field} className="text-[12px] text-[#374151]">
                        <span className="font-medium">{field}:</span>{" "}
                        {type === "added" && (
                          <span className="text-[#059669]">Added: {to}</span>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
