"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rolesService } from "@/services/roles";
import type { RolePermission } from "@/services/roles";

// ── Permission definitions per entity ────────────────────────────────────────

interface PermissionDef {
  key: string;
  label: string;
  description: string;
}

interface EntityDef {
  entity: string;
  label: string;
  permissions: PermissionDef[];
}

const ENTITIES: EntityDef[] = [
  {
    entity: "category",
    label: "Category",
    permissions: [
      { key: "category.view", label: "View Category", description: "View all categories and subcategories." },
      { key: "category.add", label: "Add Category", description: "Add new categories or subcategories to the catalog." },
      { key: "category.edit", label: "Edit Category", description: "Edit existing category or subcategory names and details." },
    ],
  },
  {
    entity: "product",
    label: "Product",
    permissions: [
      { key: "product.view", label: "View Product", description: "View all products and their variants in your organization's catalog." },
      { key: "product.add", label: "Add Product", description: "Add new products with category, unit, and variant information." },
      { key: "product.edit", label: "Edit Product", description: "Edit product details including description, category, and variants." },
      { key: "product.archive", label: "Archive Product", description: "Archive products so they are no longer available for use in orders/auctions." },
    ],
  },
  {
    entity: "vendor",
    label: "Vendor",
    permissions: [
      { key: "vendor.view", label: "View Vendor", description: "View vendor companies, their users, and their locations." },
      { key: "vendor.add", label: "Add Vendor", description: "Add new vendor companies and primary contacts." },
      { key: "vendor.edit", label: "Edit Vendor", description: "Edit vendor company details, user access, and locations." },
    ],
  },
  {
    entity: "purchase-order",
    label: "Purchase Order",
    permissions: [
      { key: "purchase-order.view", label: "View Purchase Order", description: "View all purchase orders." },
      { key: "purchase-order.add", label: "Add Purchase Order", description: "Create new purchase orders." },
      { key: "purchase-order.edit", label: "Edit Purchase Order", description: "Edit purchase order details." },
      { key: "purchase-order.cancel", label: "Cancel Purchase Order", description: "Cancel an existing purchase order that is not yet fulfilled." },
      { key: "purchase-order.confirm", label: "Confirm Purchase Order", description: "Confirm a purchase order to lock it for processing." },
      { key: "purchase-order.receipt.add", label: "Create Receipt", description: "Create receipts for received items against a purchase order." },
      { key: "purchase-order.receipt.edit", label: "Edit Receipt", description: "Edit previously created receipts for corrections or updates." },
      { key: "purchase-order.force-close", label: "Force Close", description: "Manually close a purchase order when not all items are expected to arrive." },
      { key: "purchase-order.undo-force-close", label: "Undo Force Close", description: "Undo the force-close action to allow further receipts." },
      { key: "purchase-order.audit-log", label: "View Audit Log", description: "View the audit log of actions performed on a purchase order." },
      { key: "purchase-order.download-csv", label: "Download CSV", description: "Download CSV of purchase orders." },
    ],
  },
  {
    entity: "sales-order",
    label: "Sales Order",
    permissions: [
      { key: "sales-order.view", label: "View Sales Order", description: "View all sales orders." },
      { key: "sales-order.add", label: "Add Sales Order", description: "Create new sales orders." },
      { key: "sales-order.edit", label: "Edit Sales Order", description: "Edit sales order details." },
      { key: "sales-order.cancel", label: "Cancel Sales Order", description: "Cancel an existing sales order that is not yet fulfilled." },
      { key: "sales-order.confirm", label: "Confirm Sales Order", description: "Confirm a sales order to lock it for processing." },
      { key: "sales-order.shipment.add", label: "Create Shipment", description: "Create shipments for received items against a sales order." },
      { key: "sales-order.shipment.edit", label: "Edit Shipment", description: "Edit previously created shipments for corrections or updates." },
      { key: "sales-order.force-close", label: "Force Close", description: "Manually close a sales order when not all items are going to be shipped." },
      { key: "sales-order.undo-force-close", label: "Undo Force Close", description: "Undo the force-close action to allow further shipments." },
      { key: "sales-order.audit-log", label: "View Audit Log", description: "View the audit log of actions performed on a sales order." },
      { key: "sales-order.download-csv", label: "Download CSV", description: "Download CSV of sales orders." },
    ],
  },
  {
    entity: "auction-buy",
    label: "Auctions (Buy)",
    permissions: [
      { key: "auction-buy.view", label: "View Auction", description: "View all buy-type auctions and their details." },
      { key: "auction-buy.add", label: "Add Auction", description: "Add buy-type auction details and configurations." },
      { key: "auction-buy.edit", label: "Edit Auction", description: "Edit buy-type auction details and configurations." },
      { key: "auction-buy.view-bids", label: "View Bids", description: "View all bids received from vendors in a buy-type auction." },
      { key: "auction-buy.reject-bid", label: "Reject Bid", description: "Reject a vendor's bid in a buy-type auction." },
      { key: "auction-buy.create-counter-offer", label: "Create Counter Offer", description: "Create a counter offer in response to a vendor's bid." },
      { key: "auction-buy.revoke-counter-offer", label: "Revoke Counter Offer", description: "Revoke a counter offer that hasn't been responded to yet." },
      { key: "auction-buy.accept-bid", label: "Accept Bid", description: "Accept a bid submitted by a vendor in a buy-type auction." },
      { key: "auction-buy.create-po", label: "Create Purchase Order once awarded", description: "Create a purchase order from an accepted bid in a buy-type auction." },
    ],
  },
  {
    entity: "auction-sale",
    label: "Auctions (Sell)",
    permissions: [
      { key: "auction-sale.view", label: "View Auction", description: "View all sell-type auctions and their details." },
      { key: "auction-sale.add", label: "Add Auction", description: "Add sell-type auction details and configurations." },
      { key: "auction-sale.edit", label: "Edit Auction", description: "Edit sell-type auction details and configurations." },
      { key: "auction-sale.view-bids", label: "View Bids", description: "View all bids received from vendors in a sell-type auction." },
      { key: "auction-sale.reject-bid", label: "Reject Bid", description: "Reject a vendor's bid in a sell-type auction." },
      { key: "auction-sale.create-counter-offer", label: "Create Counter Offer", description: "Create a counter offer in response to a vendor's bid." },
      { key: "auction-sale.revoke-counter-offer", label: "Revoke Counter Offer", description: "Revoke a counter offer that hasn't been responded to yet." },
      { key: "auction-sale.accept-bid", label: "Accept Bid", description: "Accept a bid submitted by a vendor in a sell-type auction." },
      { key: "auction-sale.create-po", label: "Create Purchase Order once awarded", description: "Create a purchase order from an accepted bid in a buy-type auction." },
    ],
  },
  {
    entity: "notification",
    label: "Notifications",
    permissions: [
      { key: "notification.view", label: "View Notifications", description: "View all notifications sent to vendor users or team members." },
      { key: "notification.send", label: "Send Notifications", description: "Send custom notifications to vendors or internal teams." },
    ],
  },
];

// ── Types ────────────────────────────────────────────────────────────────────

type AccessLevel = "full" | "custom" | "none";

interface EntityState {
  access: AccessLevel;
  permissions: string[];
}

// ── Props ────────────────────────────────────────────────────────────────────

interface RoleFormProps {
  mode: "create" | "edit";
  roleId?: string;
  initialValues?: {
    name: string;
    description: string;
    permissionsPerEntity: RolePermission[];
  };
}

interface FormErrors {
  name?: string;
  permissions?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialState(
  initial?: RolePermission[]
): Record<string, EntityState> {
  const state: Record<string, EntityState> = {};
  for (const entity of ENTITIES) {
    const existing = initial?.find((p) => p.entity === entity.entity);
    if (existing) {
      state[entity.entity] = {
        access: existing.access,
        permissions: [...existing.permissions],
      };
    } else {
      state[entity.entity] = { access: "none", permissions: [] };
    }
  }
  return state;
}

function buildPayloadPermissions(
  entityStates: Record<string, EntityState>
): RolePermission[] {
  const result: RolePermission[] = [];
  for (const entityDef of ENTITIES) {
    const s = entityStates[entityDef.entity];
    if (s.access === "none") continue;
    result.push({
      entity: entityDef.entity,
      access: s.access,
      permissions:
        s.access === "full"
          ? entityDef.permissions.map((p) => p.key)
          : s.permissions,
    });
  }
  return result;
}

// ── Checkbox component ───────────────────────────────────────────────────────

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
        checked
          ? "border-[#0d9488] bg-[#0d9488]"
          : "border-gray-300 bg-white hover:border-[#0d9488]"
      }`}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M1.5 5.5L3.5 7.5L8.5 2.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// ── Access toggle ────────────────────────────────────────────────────────────

function AccessToggle({
  value,
  onChange,
}: {
  value: AccessLevel;
  onChange: (v: AccessLevel) => void;
}) {
  const options: { label: string; val: AccessLevel }[] = [
    { label: "All", val: "full" },
    { label: "Custom", val: "custom" },
    { label: "None", val: "none" },
  ];

  return (
    <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
      {options.map((opt) => {
        const activeColors: Record<AccessLevel, string> = {
          full: "bg-[#0d9488] text-white",
          custom: "bg-[#3b82f6] text-white",
          none: "bg-[#dc2626] text-white",
        };
        const isActive = value === opt.val;
        return (
          <button
            key={opt.val}
            type="button"
            onClick={() => onChange(opt.val)}
            className={`px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              isActive
                ? activeColors[opt.val]
                : "bg-white text-gray-600 hover:bg-gray-50"
            } ${opt.val !== "full" ? "border-l border-gray-300" : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Entity permission section ────────────────────────────────────────────────

function EntitySection({
  entityDef,
  state,
  onChange,
  striped,
}: {
  entityDef: EntityDef;
  state: EntityState;
  onChange: (s: EntityState) => void;
  striped?: boolean;
}) {
  function handleAccessChange(access: AccessLevel) {
    if (access === "full") {
      onChange({
        access: "full",
        permissions: entityDef.permissions.map((p) => p.key),
      });
    } else if (access === "none") {
      onChange({ access: "none", permissions: [] });
    } else {
      onChange({ access: "custom", permissions: state.permissions });
    }
  }

  function togglePermission(key: string) {
    const perms = state.permissions.includes(key)
      ? state.permissions.filter((p) => p !== key)
      : [...state.permissions, key];
    onChange({ access: "custom", permissions: perms });
  }

  return (
    <div className={striped ? "bg-[#f9fafb]" : ""}>
      {/* Entity row */}
      <div className="flex items-center justify-between py-3 px-2">
        <span className="text-[14px] font-medium text-[#111827]">
          {entityDef.label}
        </span>
        <AccessToggle value={state.access} onChange={handleAccessChange} />
      </div>

      {/* Permission rows — only shown when custom */}
      {state.access === "custom" && (
        <div className="divide-y divide-gray-200">
          {entityDef.permissions.map((perm) => (
            <div
              key={perm.key}
              className="flex items-center justify-between pl-8 pr-4 py-2.5"
            >
              <div className="pr-4">
                <p className="text-[13px] font-medium text-[#111827]">
                  {perm.label}
                </p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {perm.description}
                </p>
              </div>
              <Checkbox
                checked={state.permissions.includes(perm.key)}
                onChange={() => togglePermission(perm.key)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main form ────────────────────────────────────────────────────────────────

export function RoleForm({ mode, roleId, initialValues }: RoleFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? ""
  );
  const [entityStates, setEntityStates] = useState<Record<string, EntityState>>(
    () => buildInitialState(initialValues?.permissionsPerEntity)
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateEntity(entity: string, state: EntityState) {
    setEntityStates((prev) => ({ ...prev, [entity]: state }));
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!name.trim()) errs.name = "Role name is required";

    const hasAnyPermission = Object.values(entityStates).some(
      (s) => s.access !== "none"
    );
    if (!hasAnyPermission) {
      errs.permissions =
        "At least one entity must have All or Custom access";
    }

    // Check custom entities have at least one permission selected
    for (const entityDef of ENTITIES) {
      const s = entityStates[entityDef.entity];
      if (s.access === "custom" && s.permissions.length === 0) {
        errs.permissions = `Select at least one permission for ${entityDef.label} or set it to None`;
        break;
      }
    }

    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Scroll to first error
      setTimeout(() => {
        const el = document.querySelector("[data-error]");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    if (isSubmitting) return;

    const payload = {
      name: name.trim(),
      description: description.trim(),
      permissionsPerEntity: buildPayloadPermissions(entityStates),
    };

    setIsSubmitting(true);
    try {
      if (isEdit && roleId) {
        await rolesService.update(roleId, payload);
        toast.success("Role updated successfully");
      } else {
        await rolesService.create(payload);
        toast.success("Role created successfully");
      }
      router.push("/roles");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        `Failed to ${isEdit ? "update" : "create"} role`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-6">
        {isEdit && (
          <button
            onClick={() => router.push("/roles")}
            className="mr-3 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
            aria-label="Back to roles"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-[18px] font-semibold text-[#111827]">
          {isEdit ? "Edit Role" : "Create Role"}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-[#f9fafb]">
        <div className="mx-auto max-w-[800px] p-6">
          {/* Name & Description card */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5 mb-6">
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter role name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full border ${
                    errors.name ? "border-[#dc2626]" : "border-gray-300"
                  } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
                />
                {errors.name && (
                  <p data-error className="text-[12px] text-[#dc2626] mt-1">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  placeholder="Enter role description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]"
                />
              </div>
            </div>
          </div>

          {/* Permissions card */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5 mb-6">
            <div className="mb-4">
              <h3 className="text-[15px] font-semibold text-[#111827]">
                Permissions
              </h3>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Configure access levels for each entity
              </p>
            </div>

            {errors.permissions && (
              <div data-error className="mb-4 rounded-md bg-[#fef2f2] border border-[#fecaca] px-4 py-2.5">
                <p className="text-[13px] text-[#dc2626]">
                  {errors.permissions}
                </p>
              </div>
            )}

            {/* Entity permission sections */}
            <div className="divide-y divide-gray-200">
              {ENTITIES.map((entityDef, index) => (
                <EntitySection
                  key={entityDef.entity}
                  entityDef={entityDef}
                  state={entityStates[entityDef.entity]}
                  onChange={(s) => updateEntity(entityDef.entity, s)}
                  striped={index % 2 === 1}
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pb-6">
            <Button
              variant="outline"
              onClick={() => router.push("/roles")}
              disabled={isSubmitting}
              className="border-gray-200 text-gray-600 hover:text-[#0F1720]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
            >
              {isSubmitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {isEdit ? "Update Role" : "Create Role"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
