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

function formatFieldValue(key: string, val: unknown): string {
  if (val === undefined || val === null || val === "") return "—";
  if (key === "status") return STATUS_VALUE_LABELS[String(val)] ?? String(val);
  return String(val);
}

function renderChanges(prev?: Record<string, unknown>, next?: Record<string, unknown>): { field: string; from: string; to: string }[] {
  if (!next) return [];
  const changes: { field: string; from: string; to: string }[] = [];
  for (const [key, newVal] of Object.entries(next)) {
    if (key === "name") continue; // shown in title
    const label = FIELD_LABELS[key];
    if (!label) continue;
    const oldVal = prev?.[key];
    if (String(oldVal ?? "") !== String(newVal ?? "")) {
      changes.push({ field: label, from: formatFieldValue(key, oldVal), to: formatFieldValue(key, newVal) });
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
            ? renderChanges(event.previousValues, event.newValues)
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
                    {changes.map(({ field, from, to }) => (
                      <div key={field} className="text-[12px] text-[#374151]">
                        <span className="font-medium">{field}:</span>{" "}
                        <span className="line-through text-[#9ca3af]">{from}</span>
                        {" → "}
                        <span>{to}</span>
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
