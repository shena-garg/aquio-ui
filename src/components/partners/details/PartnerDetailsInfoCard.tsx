"use client";

import type { Partner } from "@/services/partners";

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
        {label}
      </div>
      <div className="text-[13px] font-medium text-[#111827]">
        {value || "—"}
      </div>
    </div>
  );
}

function EditCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
        {label}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit state type (exported so page can reference it)
// ---------------------------------------------------------------------------

export interface PartnerEditState {
  name: string;
  countryCode: string;
  contactNumber: string;
  taxNumber: string;
  poReminder: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PartnerDetailsInfoCardProps {
  partner: Partner;
  isEditing?: boolean;
  editState?: PartnerEditState | null;
  onEditStateChange?: (state: PartnerEditState) => void;
}

export function PartnerDetailsInfoCard({
  partner,
  isEditing,
  editState,
  onEditStateChange,
}: PartnerDetailsInfoCardProps) {
  const inputCls =
    "h-8 w-full rounded-[6px] border border-[#e5e7eb] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]";

  function updateField<K extends keyof PartnerEditState>(
    key: K,
    value: PartnerEditState[K],
  ) {
    if (!editState || !onEditStateChange) return;
    onEditStateChange({ ...editState, [key]: value });
  }

  const memberSince = new Date(partner.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // ── View mode ──
  if (!isEditing || !editState || !onEditStateChange) {
    return (
      <div className="mx-4 sm:mx-8 mt-3">
        <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Cell
              label="Contact Number"
              value={`${partner.countryCode} ${partner.contactNumber}`}
            />
            <Cell label="Tax Number" value={partner.taxNumber ?? ""} />
            <Cell label="PO Reminder" value={partner.poReminder ? "Enabled" : "Disabled"} />
            <Cell label="Member Since" value={memberSince} />
          </div>
        </div>
      </div>
    );
  }

  // ── Edit mode ──
  return (
    <div className="mx-4 sm:mx-8 mt-3">
      <div className="rounded-[10px] border border-[#0d9488]/30 bg-white px-4 pt-[10px] pb-4">
        {/* Partner Name (full width) */}
        <EditCell label="Partner Name">
          <input
            value={editState.name}
            onChange={(e) => updateField("name", e.target.value)}
            className={inputCls}
          />
        </EditCell>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#e5e7eb] pt-3 mt-3">
          {/* Country code + contact number */}
          <EditCell label="Country Code">
            <input
              value={editState.countryCode}
              onChange={(e) => updateField("countryCode", e.target.value)}
              className={inputCls}
              placeholder="+91"
            />
          </EditCell>
          <EditCell label="Contact Number">
            <input
              value={editState.contactNumber}
              onChange={(e) => updateField("contactNumber", e.target.value)}
              className={inputCls}
              placeholder="9876543210"
            />
          </EditCell>
          <EditCell label="Tax Number (optional)">
            <input
              value={editState.taxNumber}
              onChange={(e) => updateField("taxNumber", e.target.value)}
              className={inputCls}
              placeholder="GSTIN / PAN"
            />
          </EditCell>
          <EditCell label="PO Reminder">
            <div className="flex items-center h-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editState.poReminder}
                  onChange={(e) => updateField("poReminder", e.target.checked)}
                  className="h-4 w-4 rounded border-[#d1d5db] text-[#0d9488] focus:ring-[#0d9488]"
                />
                <span className="text-[13px] text-[#374151]">
                  {editState.poReminder ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>
          </EditCell>
        </div>
      </div>
    </div>
  );
}
