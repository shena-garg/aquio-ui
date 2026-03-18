"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  categoriesService,
  type CustomAttribute,
} from "@/services/categories";
import { productsService, type CreateProductPayload } from "@/services/products";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { getUOMAbbreviation } from "@/lib/uom";
import type { Product } from "@/services/products";

interface ProductDetailsTabsProps {
  product: Product;
}

const TAB_KEYS = ["variants", "analytics"] as const;
type TabKey = (typeof TAB_KEYS)[number];

export function ProductDetailsTabs({
  product,
}: ProductDetailsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("variants");

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "variants", label: "Variants", count: product.variants.length },
    { key: "analytics", label: "Analytics" },
  ];

  return (
    <div className="flex flex-col flex-1 mt-2">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "border-[#0d9488] text-[#111827]"
                  : "border-transparent text-[#6b7280] hover:text-[#111827]",
              )}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span
                  className={cn(
                    "rounded-[10px] px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                    isActive
                      ? "bg-[#fef3c7] text-[#b45309]"
                      : "bg-[#f3f4f6] text-[#6b7280]",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {activeTab === "variants" ? (
          <VariantsTab product={product} />
        ) : activeTab === "analytics" ? (
          <AnalyticsTab product={product} />
        ) : null}
      </div>
    </div>
  );
}

/* ── Variants Tab ─────────────────────────────────────────────────────────── */

function formatAttrLabel(label: string, unit: string) {
  return unit ? `${label} (${unit})` : label;
}

/* ── Variant Edit Dialog ─────────────────────────────────────────────────── */

interface VariantEditData {
  name: string;
  customAttributes: { label: string; unit: string; value: string }[];
}

function VariantEditDialog({
  initial,
  subCategoryAttrs,
  onSave,
  onCancel,
  isSaving,
  title,
}: {
  initial: VariantEditData;
  subCategoryAttrs: CustomAttribute[];
  onSave: (data: VariantEditData) => void;
  onCancel: () => void;
  isSaving: boolean;
  title: string;
}) {
  const [name, setName] = useState(initial.name);
  const [attrs, setAttrs] = useState(initial.customAttributes);
  const [errors, setErrors] = useState<Set<number>>(new Set());

  function updateAttrValue(index: number, value: string) {
    const updated = [...attrs];
    updated[index] = { ...updated[index], value };
    setAttrs(updated);
    // Clear error on change
    if (errors.has(index)) {
      const next = new Set(errors);
      next.delete(index);
      setErrors(next);
    }
  }

  function addCustomAttr() {
    setAttrs([...attrs, { label: "", unit: "", value: "" }]);
  }

  function updateAttrField(
    index: number,
    field: "label" | "unit",
    value: string,
  ) {
    const updated = [...attrs];
    updated[index] = { ...updated[index], [field]: value };
    setAttrs(updated);
  }

  function removeAttr(index: number) {
    const attr = attrs[index];
    const isFromSubCat = subCategoryAttrs.some((s) => s.label === attr.label);
    if (isFromSubCat) return;
    setAttrs(attrs.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const errs = new Set<number>();
    attrs.forEach((attr, i) => {
      const subCatAttr = subCategoryAttrs.find((s) => s.label === attr.label);
      if (subCatAttr?.required && !attr.value.trim()) {
        errs.add(i);
      }
    });
    setErrors(errs);
    return errs.size === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({ name, customAttributes: attrs });
  }

  const inputCls =
    "h-8 w-full rounded-[6px] border border-[#e5e7eb] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]";
  const inputErrorCls =
    "h-8 w-full rounded-[6px] border border-[#dc2626] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626]";

  return (
    <div className="mx-6 mt-4 mb-6 border border-[#0d9488]/30 rounded-lg bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
        <span className="text-[13px] font-semibold text-[#111827]">{title}</span>
        <button type="button" onClick={onCancel} className="text-[#9ca3af] hover:text-[#6b7280]">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Variant Name */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] mb-1 block">
            Variant Name
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Standard, Premium…" />
        </div>

        {/* Attributes Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
              Custom Attributes
            </label>
            <button
              type="button"
              onClick={addCustomAttr}
              className="flex items-center gap-1 text-[12px] text-[#0d9488] font-medium hover:text-[#0f766e]"
            >
              <Plus size={12} />
              Add Attribute
            </button>
          </div>

          {attrs.length > 0 ? (
            <div className="border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                    <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">Label</th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] w-[120px]">Unit</th>
                    <th className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">Value</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {attrs.map((attr, i) => {
                    const subCatAttr = subCategoryAttrs.find(
                      (s) => s.label === attr.label,
                    );
                    const isFromSubCat = !!subCatAttr;
                    const isRequired = subCatAttr?.required === true;
                    const isDropdown = subCatAttr?.valueType === "dropdown";
                    const dropdownOptions = isDropdown
                      ? (subCatAttr.values ?? "").split(",").map((v) => v.trim()).filter(Boolean)
                      : [];
                    const hasError = errors.has(i);

                    return (
                      <tr key={i} className="border-b border-[#e5e7eb] last:border-b-0">
                        <td className="py-2 px-3">
                          {isFromSubCat ? (
                            <span className="text-[13px] text-[#111827]">
                              {attr.label}
                              {isRequired && <span className="text-[#dc2626] ml-0.5">*</span>}
                            </span>
                          ) : (
                            <input
                              value={attr.label}
                              onChange={(e) => updateAttrField(i, "label", e.target.value)}
                              className={inputCls}
                              placeholder="Attribute name"
                            />
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {isFromSubCat ? (
                            <span className="text-[13px] text-[#6b7280]">{attr.unit || "—"}</span>
                          ) : (
                            <input
                              value={attr.unit}
                              onChange={(e) => updateAttrField(i, "unit", e.target.value)}
                              className={inputCls}
                              placeholder="Unit"
                            />
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {isDropdown ? (
                            <select
                              value={attr.value}
                              onChange={(e) => updateAttrValue(i, e.target.value)}
                              className={hasError ? inputErrorCls : inputCls}
                            >
                              <option value="">Select…</option>
                              {dropdownOptions.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={attr.value}
                              onChange={(e) => updateAttrValue(i, e.target.value)}
                              className={hasError ? inputErrorCls : inputCls}
                              placeholder={isRequired ? "Required" : "Value"}
                            />
                          )}
                          {hasError && (
                            <p className="text-[11px] text-[#dc2626] mt-0.5">This field is required</p>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {!isFromSubCat && (
                            <button
                              type="button"
                              onClick={() => removeAttr(i)}
                              className="p-1 text-[#9ca3af] hover:text-[#dc2626]"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[13px] text-[#9ca3af]">No attributes defined</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
            className="h-8 text-[13px]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="h-8 text-[13px] bg-[#0F1720] text-white hover:bg-[#1a2533]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Variant"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Variants Tab ─────────────────────────────────────────────────────────── */

function VariantsTab({ product }: { product: Product }) {
  const { variants } = product;
  const queryClient = useQueryClient();
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Always fetch subcategory custom attributes so they're ready when dialog opens
  const { data: subCategoryData, isLoading: isSubCatLoading } = useQuery({
    queryKey: ["subcategory", product.subCategoryId],
    queryFn: () =>
      categoriesService
        .getSubCategoryById(product.subCategoryId)
        .then((r) => r.data),
    enabled: !!product.subCategoryId,
    staleTime: Infinity,
  });

  const subCategoryAttrs: CustomAttribute[] =
    subCategoryData?.customAttributes ?? [];

  // Build the full payload from product + optional variant changes
  function buildPayload(
    updatedVariants: {
      name: string;
      customAttributes: { label: string; unit: string; value?: string }[];
    }[],
  ): CreateProductPayload {
    return {
      name: product.name,
      unitOfMeasurement: product.unitOfMeasurement,
      categoryId: product.categoryId,
      subCategoryId: product.subCategoryId,
      hsnCode: product.hsnCode,
      gst: product.gst,
      description: product.description || undefined,
      termsOfConditions: product.termsOfConditions,
      files: product.files,
      variants: updatedVariants,
    };
  }

  async function handleSaveVariant(data: VariantEditData) {
    setIsSaving(true);
    try {
      const updatedVariants = editingVariantId
        ? // Edit existing
          variants.map((v) =>
            v._id === editingVariantId
              ? {
                  name: data.name,
                  customAttributes: data.customAttributes.map((a) => ({
                    label: a.label,
                    unit: a.unit,
                    value: a.value || undefined,
                  })),
                }
              : {
                  name: v.name,
                  customAttributes: v.customAttributes.map((a) => ({
                    label: a.label,
                    unit: a.unit,
                    value: a.value || undefined,
                  })),
                },
          )
        : // Add new
          [
            ...variants.map((v) => ({
              name: v.name,
              customAttributes: v.customAttributes.map((a) => ({
                label: a.label,
                unit: a.unit,
                value: a.value || undefined,
              })),
            })),
            {
              name: data.name,
              customAttributes: data.customAttributes.map((a) => ({
                label: a.label,
                unit: a.unit,
                value: a.value || undefined,
              })),
            },
          ];

      await productsService.update(product._id, buildPayload(updatedVariants));
      toast.success(
        editingVariantId ? "Variant updated" : "Variant added",
      );
      queryClient.invalidateQueries({ queryKey: ["product", product._id] });
      setEditingVariantId(null);
      setIsAdding(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save variant.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteVariant(variantId: string) {
    if (variants.length <= 1) {
      toast.error("Product must have at least one variant.");
      return;
    }
    setIsSaving(true);
    try {
      const updatedVariants = variants
        .filter((v) => v._id !== variantId)
        .map((v) => ({
          name: v.name,
          customAttributes: v.customAttributes.map((a) => ({
            label: a.label,
            unit: a.unit,
            value: a.value || undefined,
          })),
        }));

      await productsService.update(product._id, buildPayload(updatedVariants));
      toast.success("Variant deleted");
      queryClient.invalidateQueries({ queryKey: ["product", product._id] });
    } catch {
      toast.error("Failed to delete variant");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditVariant(variantId: string) {
    setIsAdding(false);
    setEditingVariantId(variantId);
  }

  function handleStartAdd() {
    setEditingVariantId(null);
    setIsAdding(true);
  }

  // ── Editing/Adding inline form ──
  if (editingVariantId || isAdding) {
    // Show loading while subcategory attributes are being fetched
    if (isSubCatLoading && product.subCategoryId) {
      return (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-[#9ca3af]" />
        </div>
      );
    }

    if (editingVariantId) {
      const variant = variants.find((v) => v._id === editingVariantId);
      if (!variant) return null;

      // Merge: start with subcategory attrs (pre-filled with existing values),
      // then append any extra custom attrs the variant has
      const mergedAttrs: { label: string; unit: string; value: string }[] = [];
      const usedLabels = new Set<string>();

      // First: subcategory attributes with existing values overlaid
      for (const sa of subCategoryAttrs) {
        const existing = variant.customAttributes.find(
          (a) => a.label === sa.label,
        );
        mergedAttrs.push({
          label: sa.label,
          unit: sa.unit,
          value: existing?.value ?? "",
        });
        usedLabels.add(sa.label);
      }

      // Then: any extra attributes from the variant not in subcategory
      for (const a of variant.customAttributes) {
        if (!usedLabels.has(a.label)) {
          mergedAttrs.push({
            label: a.label,
            unit: a.unit,
            value: a.value ?? "",
          });
        }
      }

      return (
        <VariantEditDialog
          title={`Edit Variant: ${variant.name}`}
          initial={{
            name: variant.name,
            customAttributes: mergedAttrs,
          }}
          subCategoryAttrs={subCategoryAttrs}
          onSave={handleSaveVariant}
          onCancel={() => setEditingVariantId(null)}
          isSaving={isSaving}
        />
      );
    }

    // Adding new variant — pre-fill with subcategory custom attributes
    const initialAttrs = subCategoryAttrs.map((a) => ({
      label: a.label,
      unit: a.unit,
      value: "",
    }));

    return (
      <VariantEditDialog
        title="Add Variant"
        initial={{ name: "", customAttributes: initialAttrs }}
        subCategoryAttrs={subCategoryAttrs}
        onSave={handleSaveVariant}
        onCancel={() => setIsAdding(false)}
        isSaving={isSaving}
      />
    );
  }

  // ── View mode ──
  const isActive = product.status === "active";

  const addColumnHeader = isActive && (
    <th className="h-[52px] px-2 bg-white align-middle border-l border-[#f3f4f6]" style={{ width: 52 }}>
      <button
        onClick={handleStartAdd}
        className="flex items-center justify-center w-8 h-8 rounded-[6px] border border-dashed border-[#d1d5db] text-[#9ca3af] hover:border-[#0d9488] hover:text-[#0d9488] hover:bg-[#f0fdfa] transition-colors"
        title="Add Variant"
      >
        <Plus size={16} />
      </button>
    </th>
  );

  if (variants.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[#6b7280]">
        No variants defined
        {isActive && (
          <button
            onClick={handleStartAdd}
            className="ml-2 flex items-center gap-1 text-[13px] text-[#0d9488] font-medium hover:text-[#0f766e]"
          >
            <Plus size={14} />
            Add Variant
          </button>
        )}
      </div>
    );
  }

  // Collect all unique custom attribute labels across all variants
  const allLabels = new Map<string, string>(); // label -> unit
  for (const v of variants) {
    for (const attr of v.customAttributes) {
      if (!allLabels.has(attr.label)) {
        allLabels.set(attr.label, attr.unit ?? "");
      }
    }
  }

  const attributeRows = Array.from(allLabels.entries());

  if (attributeRows.length === 0) {
    // No custom attributes — just show variant names
    return (
      <div className="mx-6 mt-4 mb-6">
        <div className="border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
                  Variant Name
                </th>
                {isActive && (
                  <th className="w-20" />
                )}
                {addColumnHeader}
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v._id} className="border-b border-[#e5e7eb] last:border-b-0 group">
                  <td className="py-2.5 px-4 text-[13px] font-medium text-[#111827]">
                    {v.name}
                  </td>
                  {isActive && (
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditVariant(v._id)} className="p-1 text-[#6b7280] hover:text-[#0d9488]">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDeleteVariant(v._id)} className="p-1 text-[#6b7280] hover:text-[#dc2626]">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                  {isActive && <td />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Split-table for > 2 variants, regular table for 1-2
  if (variants.length > 2) {
    return (
      <SplitVariantsTable
        variants={variants}
        attributeRows={attributeRows}
        onEdit={isActive ? handleEditVariant : undefined}
        onDelete={isActive ? handleDeleteVariant : undefined}
        onAdd={isActive ? handleStartAdd : undefined}
      />
    );
  }

  // Regular single table for 1-2 variants
  return (
    <div className="mx-6 mt-4 mb-6">
      <div className="border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
              <th className="text-left py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] whitespace-nowrap">
                Attribute
              </th>
              {variants.map((v) => (
                <th
                  key={v._id}
                  className="text-left py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#111827] whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    {v.name}
                    {isActive && (
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleEditVariant(v._id)} className="p-0.5 text-[#9ca3af] hover:text-[#0d9488]">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDeleteVariant(v._id)} className="p-0.5 text-[#9ca3af] hover:text-[#dc2626]">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {addColumnHeader}
            </tr>
          </thead>
          <tbody>
            {attributeRows.map(([label, unit]) => (
              <tr key={label} className="border-b border-[#e5e7eb] last:border-b-0">
                <td className="py-2.5 px-4 text-[13px] font-medium text-[#111827] whitespace-nowrap">
                  {formatAttrLabel(label, unit)}
                </td>
                {variants.map((v) => {
                  const attr = v.customAttributes.find((a) => a.label === label);
                  return (
                    <td
                      key={v._id}
                      className="py-2.5 px-4 text-[13px] text-[#111827] whitespace-nowrap"
                    >
                      {attr?.value ?? "—"}
                    </td>
                  );
                })}
                {isActive && <td />}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Split Variants Table (frozen left column) ───────────────────────────── */

function SplitVariantsTable({
  variants,
  attributeRows,
  onEdit,
  onDelete,
  onAdd,
}: {
  variants: Product["variants"];
  attributeRows: [string, string][];
  onEdit?: (variantId: string) => void;
  onDelete?: (variantId: string) => void;
  onAdd?: () => void;
}) {
  const leftHeaderRef = useRef<HTMLTableRowElement>(null);
  const rightHeaderRef = useRef<HTMLTableRowElement>(null);
  const leftBodyRef = useRef<HTMLTableSectionElement>(null);
  const rightBodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    // Sync header row heights
    const lh = leftHeaderRef.current?.querySelector("th");
    const rh = rightHeaderRef.current?.querySelector("th");
    if (lh && rh) {
      const maxH = Math.max(lh.offsetHeight, rh.offsetHeight);
      lh.style.height = `${maxH}px`;
      rh.style.height = `${maxH}px`;
    }

    // Sync body row heights
    const leftRows = leftBodyRef.current?.querySelectorAll("tr");
    const rightRows = rightBodyRef.current?.querySelectorAll("tr");
    if (leftRows && rightRows) {
      leftRows.forEach((lr, i) => {
        const rr = rightRows[i];
        if (!rr) return;
        // Reset heights first
        (lr as HTMLElement).style.height = "";
        (rr as HTMLElement).style.height = "";
        const maxH = Math.max(lr.offsetHeight, rr.offsetHeight);
        (lr as HTMLElement).style.height = `${maxH}px`;
        (rr as HTMLElement).style.height = `${maxH}px`;
      });
    }
  }, [variants, attributeRows]);

  return (
    <div className="mx-6 mt-4 mb-6">
      <div className="flex border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
        {/* Left frozen panel */}
        <div className="w-[280px] flex-shrink-0 border-r border-[#e5e7eb]">
          <table className="w-full">
            <thead>
              <tr ref={leftHeaderRef} className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                <th className="text-left py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] whitespace-nowrap">
                  Attribute
                </th>
              </tr>
            </thead>
            <tbody ref={leftBodyRef}>
              {attributeRows.map(([label, unit]) => (
                <tr key={label} className="border-b border-[#e5e7eb] last:border-b-0 bg-[#f9fafb]">
                  <td className="py-2.5 px-4 text-[13px] font-medium text-[#111827] whitespace-nowrap">
                    {formatAttrLabel(label, unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right scrollable panel */}
        <div className="flex-1 overflow-x-auto bg-white">
          <table className="w-full">
            <thead>
              <tr ref={rightHeaderRef} className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {variants.map((v) => (
                  <th
                    key={v._id}
                    className="text-left py-2.5 px-4 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#111827] whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      {v.name}
                      {(onEdit || onDelete) && (
                        <div className="flex items-center gap-0.5">
                          {onEdit && (
                            <button onClick={() => onEdit(v._id)} className="p-0.5 text-[#9ca3af] hover:text-[#0d9488]">
                              <Pencil size={12} />
                            </button>
                          )}
                          {onDelete && (
                            <button onClick={() => onDelete(v._id)} className="p-0.5 text-[#9ca3af] hover:text-[#dc2626]">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                {onAdd && (
                  <th className="h-[52px] px-2 bg-white align-middle border-l border-[#f3f4f6]" style={{ width: 52 }}>
                    <button
                      onClick={onAdd}
                      className="flex items-center justify-center w-8 h-8 rounded-[6px] border border-dashed border-[#d1d5db] text-[#9ca3af] hover:border-[#0d9488] hover:text-[#0d9488] hover:bg-[#f0fdfa] transition-colors"
                      title="Add Variant"
                    >
                      <Plus size={16} />
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody ref={rightBodyRef}>
              {attributeRows.map(([label]) => (
                <tr key={label} className="border-b border-[#e5e7eb] last:border-b-0">
                  {variants.map((v) => {
                    const attr = v.customAttributes.find((a) => a.label === label);
                    return (
                      <td
                        key={v._id}
                        className="py-2.5 px-4 text-[13px] text-[#111827] whitespace-nowrap"
                      >
                        {attr?.value ?? "—"}
                      </td>
                    );
                  })}
                  {onAdd && <td />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Analytics Tab ───────────────────────────────────────────────────────── */

const PERIOD_OPTIONS = [
  { value: "3m", label: "Last 3 Months" },
  { value: "6m", label: "Last 6 Months" },
  { value: "9m", label: "Last 9 Months" },
  { value: "12m", label: "Last 12 Months" },
  { value: "custom", label: "Custom Date Range" },
] as const;

type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];

const ANALYTICS_SUB_TABS = ["procurement", "sales", "margin"] as const;
type AnalyticsSubTab = (typeof ANALYTICS_SUB_TABS)[number];

const SUB_TAB_LABELS: Record<AnalyticsSubTab, string> = {
  procurement: "Procurement",
  sales: "Sales",
  margin: "Margin",
};

const selectCls =
  "border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[13px] text-[#111827] bg-white focus:outline-none focus:ring-1 focus:ring-[#0d9488]";

function computePriceDomain(prices: number[]): [number, number] {
  if (prices.length === 0) return [0, 100];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = (max - min) * 0.2 || max * 0.05;
  return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
}

function computeDateRange(
  period: PeriodValue,
  customFrom: string,
  customTo: string,
): { fromDate: string; toDate: string } {
  if (period === "custom") {
    return { fromDate: customFrom, toDate: customTo };
  }
  const months = { "3m": 3, "6m": 6, "9m": 9, "12m": 12 }[period];
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}

function AnalyticsTab({ product }: { product: Product }) {
  const { variants } = product;
  const [selectedVariant, setSelectedVariant] = useState(variants[0]?._id ?? "");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodValue>("12m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>("procurement");

  const { fromDate, toDate } = useMemo(
    () => computeDateRange(selectedPeriod, customFrom, customTo),
    [selectedPeriod, customFrom, customTo],
  );

  return (
    <div className="flex flex-col flex-1">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 px-4 sm:px-8 py-4">
        {/* Variant dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-[#6b7280]">Variant</label>
          <select
            className={selectCls}
            value={selectedVariant}
            onChange={(e) => setSelectedVariant(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Period dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-[#6b7280]">Period</label>
          <select
            className={selectCls}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as PeriodValue)}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom date range */}
        {selectedPeriod === "custom" && (
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-[#6b7280]">From</label>
            <input
              type="date"
              className={selectCls}
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <label className="text-[12px] text-[#6b7280]">To</label>
            <input
              type="date"
              className={selectCls}
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        )}

        {/* Read-only date display */}
        {selectedPeriod !== "custom" && fromDate && toDate && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#6b7280] uppercase tracking-[0.6px] font-medium">From</span>
            <input
              type="text"
              value={formatShortDate(fromDate)}
              disabled
              className="bg-[#f9fafb] border border-[#e5e7eb] text-[#6b7280] rounded px-2 sm:px-3 py-1.5 text-[12px] sm:text-sm cursor-not-allowed w-24 sm:w-28 text-center"
            />
            <span className="text-[11px] text-[#6b7280] uppercase tracking-[0.6px] font-medium">To</span>
            <input
              type="text"
              value={formatShortDate(toDate)}
              disabled
              className="bg-[#f9fafb] border border-[#e5e7eb] text-[#6b7280] rounded px-2 sm:px-3 py-1.5 text-[12px] sm:text-sm cursor-not-allowed w-24 sm:w-28 text-center"
            />
          </div>
        )}
      </div>

      {/* Sub-tab bar */}
      <div className="flex overflow-x-auto gap-6 sm:gap-8 px-4 sm:px-8 pb-0 border-b border-[#e5e7eb]">
        {ANALYTICS_SUB_TABS.map((tab) => {
          const isActive = tab === activeSubTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={cn(
                "pb-3 text-[13px] transition-colors",
                isActive
                  ? "font-medium text-[#0d9488] border-b-2 border-[#0d9488]"
                  : "text-[#6b7280] hover:text-[#111827]",
              )}
            >
              {SUB_TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      {activeSubTab === "procurement" ? (
        <ProcurementContent
          productId={product._id}
          selectedVariant={selectedVariant}
          selectedPeriod={selectedPeriod}
          fromDate={fromDate}
          toDate={toDate}
        />
      ) : activeSubTab === "sales" ? (
        <SalesContent
          productId={product._id}
          selectedVariant={selectedVariant}
          selectedPeriod={selectedPeriod}
          fromDate={fromDate}
          toDate={toDate}
        />
      ) : activeSubTab === "margin" ? (
        <MarginContent
          productId={product._id}
          selectedVariant={selectedVariant}
          selectedPeriod={selectedPeriod}
          fromDate={fromDate}
          toDate={toDate}
        />
      ) : null}
    </div>
  );
}

/* ── Procurement KPI Cards ──────────────────────────────────────────────── */

function ProcurementContent({
  productId,
  selectedVariant,
  selectedPeriod,
  fromDate,
  toDate,
}: {
  productId: string;
  selectedVariant: string;
  selectedPeriod: PeriodValue;
  fromDate: string;
  toDate: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "product-procurement-analytics",
      productId,
      selectedVariant,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      productsService.getProcurementAnalytics({
        productId,
        variantId: selectedVariant,
        fromDate,
        toDate,
      }),
    enabled: !!selectedVariant && !!fromDate && !!toDate,
  });

  if (isLoading) {
    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mx-4 sm:mx-8 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3 animate-pulse"
            >
              <div className="h-3 w-20 bg-[#e5e7eb] rounded mb-3" />
              <div className="h-6 w-24 bg-[#e5e7eb] rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mx-4 sm:mx-8 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3 animate-pulse"
            >
              <div className="h-3 w-24 bg-[#f3f4f6] rounded mb-3" />
              <div className="h-6 w-20 bg-[#f3f4f6] rounded mb-2" />
              <div className="h-3 w-16 bg-[#f3f4f6] rounded" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <div className="mx-4 sm:mx-8 mt-4 border border-red-200 rounded-lg bg-red-50 px-4 py-3">
        <p className="text-[13px] text-red-600">
          Failed to load procurement analytics. Please try again.
        </p>
      </div>
    );
  }

  const summary = data?.summary;

  const kpis = [
    {
      label: "Total Ordered",
      value: summary
        ? `${summary.totalUnitsOrdered.toLocaleString("en-IN")}${summary.uom ? " " + summary.uom : ""}`
        : "—",
    },
    {
      label: "Total Received",
      value: summary
        ? `${summary.totalUnitsReceived.toLocaleString("en-IN")}${summary.uom ? " " + summary.uom : ""}`
        : "—",
    },
    {
      label: "Total Spend",
      value: summary
        ? `₹${summary.totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        : "—",
    },
    {
      label: "Orders Raised",
      value: summary ? String(summary.poCount) : "—",
    },
  ];

  const priceHistory: { month: string; avgPrice: number; minPrice: number; maxPrice: number }[] =
    data?.priceHistory ?? [];
  const volumeHistory: { month: string; unitsOrdered: number; unitsReceived: number }[] =
    data?.volumeHistory ?? [];
  const [priceYMin, priceYMax] = computePriceDomain(
    priceHistory.map((p) => p.avgPrice),
  );

  return (
    <>
      {/* Smart Alerts */}
      <SmartAlertsPanel data={data} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mx-4 sm:mx-8 mt-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
              {kpi.label}
            </div>
            <div className="text-[20px] font-semibold text-[#111827] mt-1">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Price Intelligence Card */}
      {summary && summary.poCount > 0 && (
        <PriceIntelligenceCard summary={summary} />
      )}

      {/* Charts */}
      <div className="mx-4 sm:mx-8 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Price Trend */}
        <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 pt-3 pb-2">
          <div className="text-[13px] font-semibold text-[#111827] mb-2">
            Buy Price Trend
          </div>
          {priceHistory.length > 0 ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[priceYMin, priceYMax]}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                    tickFormatter={(v: number) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((value: number, name: string) => {
                      const label =
                        name === "avgPrice"
                          ? "Avg Price"
                          : name === "minPrice"
                            ? "Min Price"
                            : "Max Price";
                      return [`₹${value.toLocaleString("en-IN")}`, label];
                    }) as any}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgPrice"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#0d9488" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-[13px] text-[#6b7280]">No data available</p>
            </div>
          )}
        </div>

        {/* Volume */}
        <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 pt-3 pb-2">
          <div className="text-[13px] font-semibold text-[#111827] mb-2">
            Order vs Receipt Volume
          </div>
          {volumeHistory.length > 0 ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={volumeHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend
                    iconSize={10}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar
                    dataKey="unitsOrdered"
                    name="Ordered"
                    fill="#0d9488"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="unitsReceived"
                    name="Received"
                    fill="#99f6e4"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-[13px] text-[#6b7280]">No data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Supplier Intelligence */}
      <SupplierIntelligenceTable suppliers={data?.suppliers ?? []} />

      {/* Volume Intelligence / Demand Patterns */}
      {data?.volumeIntelligence && summary && summary.poCount > 0 && (
        <VolumeIntelligenceCard
          volumeIntelligence={data.volumeIntelligence}
          avgOrderIntervalDays={summary.avgOrderIntervalDays ?? null}
          uom={summary.uom ?? ""}
        />
      )}

      {/* Recent POs */}
      <RecentPOsTable recentPOs={data?.recentPOs ?? []} />
    </>
  );
}

/* ── Smart Alerts Panel ──────────────────────────────────────────────── */

type AlertLevel = "critical" | "warning" | "positive" | "info";

interface SmartAlert {
  level: AlertLevel;
  message: string;
}

const ALERT_LEVEL_ORDER: Record<AlertLevel, number> = {
  critical: 0,
  warning: 1,
  positive: 2,
  info: 3,
};

const ALERT_BADGE_STYLES: Record<AlertLevel, { bg: string; text: string; label: string; dot: string }> = {
  critical: { bg: "bg-[#fef2f2]", text: "text-[#dc2626]", label: "critical", dot: "bg-[#dc2626]" },
  warning:  { bg: "bg-[#fffbeb]", text: "text-[#d97706]", label: "warning",  dot: "bg-[#d97706]" },
  positive: { bg: "bg-[#f0fdf4]", text: "text-[#059669]", label: "positive", dot: "bg-[#059669]" },
  info:     { bg: "bg-[#eff6ff]", text: "text-[#2563eb]", label: "info",     dot: "bg-[#2563eb]" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeSmartAlerts(data: any): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const summary = data?.summary;
  if (!summary || !summary.poCount) return alerts;

  // 🔴 Single source risk
  if (summary.supplierCount === 1) {
    alerts.push({
      level: "critical",
      message: "Only 1 active supplier — single source risk. Consider qualifying backup suppliers.",
    });
  }

  // 🔴 Buy price rising > 5%
  if (summary.priceTrend === "up" && summary.priceTrendPct > 5) {
    alerts.push({
      level: "critical",
      message: `Buy price up ${summary.priceTrendPct}% over last 3 months — review pricing with suppliers.`,
    });
  }

  // 🟡 Fulfillment rate below 90%
  const cappedFulfillment = Math.min(summary.fulfillmentRate, 100);
  if (cappedFulfillment < 90 && cappedFulfillment > 0) {
    alerts.push({
      level: "warning",
      message: `Overall fulfillment rate is ${cappedFulfillment}% — ${(100 - cappedFulfillment).toFixed(1)}% of ordered quantity was not delivered.`,
    });
  }

  // 🟡 Price volatility high
  if (summary.priceVolatilityLevel === "high") {
    alerts.push({
      level: "warning",
      message: `High price volatility (${summary.priceVolatilityScore}% variation) — prices are inconsistent across orders.`,
    });
  }

  // 🟡 Any supplier with price trending up > 3%
  const suppliers: SupplierRow[] = data?.suppliers ?? [];
  suppliers
    .filter((s) => s.priceTrend === "up" && (s.priceTrendPct ?? 0) > 3)
    .forEach((s) => {
      const recentFmt = s.recentAvgPrice != null
        ? `₹${s.recentAvgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        : "—";
      const historicFmt = s.historicAvgPrice != null
        ? `₹${s.historicAvgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        : "—";
      alerts.push({
        level: "warning",
        message: `${s.supplierName} prices up ${s.priceTrendPct}% recently — recent avg ${recentFmt} vs historic ${historicFmt}.`,
      });
    });

  // 🟢 Buy price falling > 3%
  if (summary.priceTrend === "down" && summary.priceTrendPct < -3) {
    alerts.push({
      level: "positive",
      message: `Buy price trending down ${Math.abs(summary.priceTrendPct)}% — good time to place larger orders and lock in rates.`,
    });
  }

  // 🔵 Volume surging > 20%
  if (data.volumeIntelligence?.volumeTrend === "up" && data.volumeIntelligence.volumeTrendPct > 20) {
    alerts.push({
      level: "info",
      message: `Order volume up ${data.volumeIntelligence.volumeTrendPct}% vs last quarter — consider increasing reorder quantity.`,
    });
  }

  alerts.sort((a, b) => ALERT_LEVEL_ORDER[a.level] - ALERT_LEVEL_ORDER[b.level]);
  return alerts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SmartAlertsPanel({ data }: { data: any }) {
  const [expanded, setExpanded] = useState(false);
  const alerts = useMemo(() => computeSmartAlerts(data), [data]);

  if (alerts.length === 0) return null;

  // Count by level
  const counts = alerts.reduce<Partial<Record<AlertLevel, number>>>((acc, a) => {
    acc[a.level] = (acc[a.level] ?? 0) + 1;
    return acc;
  }, {});

  const levelOrder: AlertLevel[] = ["critical", "warning", "positive", "info"];

  return (
    <div className="mx-4 sm:mx-8 mt-4 border border-[#e5e7eb] rounded-lg bg-white overflow-hidden">
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {levelOrder
            .filter((lvl) => (counts[lvl] ?? 0) > 0)
            .map((lvl) => {
              const style = ALERT_BADGE_STYLES[lvl];
              return (
                <span
                  key={lvl}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    style.bg,
                    style.text,
                  )}
                >
                  {counts[lvl]} {style.label}
                </span>
              );
            })}
        </div>
        <span className="text-xs text-[#0d9488] font-medium select-none">
          {expanded ? "Hide ▲" : "Show alerts ▼"}
        </span>
      </div>

      {/* Alert rows — visible when expanded */}
      {expanded && (
        <div className="border-t border-[#e5e7eb]">
          {alerts.map((alert, i) => {
            const style = ALERT_BADGE_STYLES[alert.level];
            return (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 border-b border-[#f3f4f6] last:border-b-0"
              >
                <span
                  className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", style.dot)}
                />
                <span className="text-sm text-[#374151]">{alert.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Volume Intelligence Card ────────────────────────────────────────── */

interface VolumeIntelligenceData {
  avgMonthlyVolume: number;
  peakMonth: string;
  peakMonthVolume: number;
  lowMonth: string;
  lowMonthVolume: number;
  volumeTrend: "up" | "down" | "stable";
  volumeTrendPct: number;
  avgOrderSize: number;
}

function VolumeIntelligenceCard({
  volumeIntelligence,
  avgOrderIntervalDays,
  uom,
}: {
  volumeIntelligence: VolumeIntelligenceData;
  avgOrderIntervalDays: number | null;
  uom: string;
}) {
  const abbr = getUOMAbbreviation(uom);
  const {
    avgMonthlyVolume,
    peakMonth,
    peakMonthVolume,
    volumeTrend,
    volumeTrendPct,
  } = volumeIntelligence;

  return (
    <div className="mx-4 sm:mx-8 mt-4">
      <div className="border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
          <span className="text-[13px] font-semibold text-[#111827]">
            Demand Patterns
          </span>
        </div>

        <div className="p-4">
          {/* 3 column metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Avg Monthly Order */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
                Avg Monthly Order
              </div>
              <div className="text-xl font-semibold text-[#111827] mt-1">
                {avgMonthlyVolume.toLocaleString("en-IN")} {abbr}
              </div>
            </div>

            {/* Peak Month */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
                Peak Month
              </div>
              <div className="text-xl font-semibold text-[#111827] mt-1">
                {peakMonth}
              </div>
              <div className="text-sm text-[#6b7280]">
                {peakMonthVolume.toLocaleString("en-IN")} {abbr}
              </div>
            </div>

            {/* Order Frequency */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
                Order Frequency
              </div>
              <div className="text-xl font-semibold text-[#111827] mt-1">
                {avgOrderIntervalDays != null
                  ? `Every ~${avgOrderIntervalDays} days`
                  : "—"}
              </div>
            </div>
          </div>

          {/* Insight strip */}
          {volumeTrend !== "stable" && (
            <div className="border-t border-[#e5e7eb] mt-3 pt-3">
              {volumeTrend === "up" ? (
                <p className="text-[13px] text-[#059669]">
                  📈 Order volume up {volumeTrendPct}% vs last quarter — consider
                  increasing reorder quantity
                </p>
              ) : (
                <p className="text-[13px] text-[#d97706]">
                  📉 Order volume down {Math.abs(volumeTrendPct)}% vs last quarter —
                  demand may be slowing
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Price Intelligence Card ──────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PriceIntelligenceCard({ summary }: { summary: any }) {
  const volatilityLevel: string = summary.priceVolatilityLevel ?? "low";
  const volatilityColor =
    volatilityLevel === "high"
      ? "text-[#dc2626]"
      : volatilityLevel === "medium"
        ? "text-[#d97706]"
        : "text-[#059669]";

  const trend: string = summary.priceTrend ?? "stable";
  const trendPct: number | null = summary.priceTrendPct ?? null;
  const trendArrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendColor =
    trend === "up"
      ? "text-[#dc2626]"
      : trend === "down"
        ? "text-[#059669]"
        : "text-[#6b7280]";
  const trendValueStr =
    trend === "stable"
      ? "Stable"
      : trendPct != null
        ? `${trendPct > 0 ? "+" : ""}${trendPct}%`
        : "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mx-4 sm:mx-8 mt-4">
      {/* Best Price */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
          Best Price Paid
        </div>
        <div className="text-2xl font-semibold text-[#059669] mt-1">
          {summary.bestPrice != null
            ? `₹${summary.bestPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
            : "—"}
        </div>
        {summary.bestPriceMonth && (
          <div className="text-xs text-[#6b7280] mt-0.5">{summary.bestPriceMonth}</div>
        )}
      </div>

      {/* Worst Price */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
          Worst Price Paid
        </div>
        <div className="text-2xl font-semibold text-[#dc2626] mt-1">
          {summary.worstPrice != null
            ? `₹${summary.worstPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
            : "—"}
        </div>
        {summary.worstPriceMonth && (
          <div className="text-xs text-[#6b7280] mt-0.5">{summary.worstPriceMonth}</div>
        )}
      </div>

      {/* Price Volatility */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
          Price Volatility
        </div>
        <div className={cn("text-2xl font-semibold mt-1", volatilityColor)}>
          {volatilityLevel.charAt(0).toUpperCase() + volatilityLevel.slice(1)}
        </div>
        {summary.priceVolatilityScore != null && (
          <div className="text-xs text-[#6b7280] mt-0.5">
            {summary.priceVolatilityScore}% variation
          </div>
        )}
      </div>

      {/* Price Trend */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
          Price Trend
        </div>
        <div className={cn("text-2xl font-semibold mt-1", trendColor)}>
          {trendArrow} {trendValueStr}
        </div>
        <div className="text-xs text-[#6b7280] mt-0.5">last 3 months</div>
      </div>
    </div>
  );
}

/* ── Sales Content ──────────────────────────────────────────────────────── */

function SalesContent({
  productId,
  selectedVariant,
  selectedPeriod,
  fromDate,
  toDate,
}: {
  productId: string;
  selectedVariant: string;
  selectedPeriod: PeriodValue;
  fromDate: string;
  toDate: string;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "product-sales-analytics",
      productId,
      selectedVariant,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      productsService.getSalesAnalytics({
        productId,
        variantId: selectedVariant,
        fromDate,
        toDate,
      }),
    enabled: !!selectedVariant && !!fromDate && !!toDate,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mx-4 sm:mx-8 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3 animate-pulse"
          >
            <div className="h-3 w-20 bg-[#e5e7eb] rounded mb-3" />
            <div className="h-6 w-24 bg-[#e5e7eb] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-4 sm:mx-8 mt-4 border border-red-200 rounded-lg bg-red-50 px-4 py-3">
        <p className="text-[13px] text-red-600">
          Failed to load sales analytics. Please try again.
        </p>
      </div>
    );
  }

  const summary = data?.summary;

  const kpis = [
    {
      label: "Total Sold",
      value: summary
        ? `${summary.totalUnitsSold.toLocaleString("en-IN")}${summary.uom ? " " + summary.uom : ""}`
        : "—",
    },
    {
      label: "Total Delivered",
      value: summary
        ? `${summary.totalUnitsDelivered.toLocaleString("en-IN")}${summary.uom ? " " + summary.uom : ""}`
        : "—",
    },
    {
      label: "Total Revenue",
      value: summary
        ? `₹${summary.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        : "—",
    },
    {
      label: "Orders Raised",
      value: summary ? String(summary.soCount) : "—",
    },
  ];

  const priceHistory: { month: string; avgPrice: number; minPrice: number; maxPrice: number }[] =
    data?.priceHistory ?? [];
  const volumeHistory: { month: string; unitsOrdered: number; unitsReceived: number }[] =
    data?.volumeHistory ?? [];
  const [sellPriceYMin, sellPriceYMax] = computePriceDomain(
    priceHistory.map((p) => p.avgPrice),
  );

  return (
    <>
      {/* Smart Alerts */}
      <SalesSmartAlertsPanel data={data} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mx-4 sm:mx-8 mt-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
              {kpi.label}
            </div>
            <div className="text-[20px] font-semibold text-[#111827] mt-1">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Sales Price Intelligence */}
      {summary && summary.soCount > 0 && (
        <SalesPriceIntelligenceCard summary={summary} />
      )}

      {/* Charts */}
      <div className="mx-4 sm:mx-8 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Sell Price Trend */}
        <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 pt-3 pb-2">
          <div className="text-[13px] font-semibold text-[#111827] mb-2">
            Sell Price Trend
          </div>
          {priceHistory.length > 0 ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[sellPriceYMin, sellPriceYMax]}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                    tickFormatter={(v: number) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((value: number, name: string) => {
                      const label =
                        name === "avgPrice"
                          ? "Avg Price"
                          : name === "minPrice"
                            ? "Min Price"
                            : "Max Price";
                      return [`₹${value.toLocaleString("en-IN")}`, label];
                    }) as any}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgPrice"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#0d9488" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-[13px] text-[#6b7280]">No data available</p>
            </div>
          )}
        </div>

        {/* Order vs Delivery Volume */}
        <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 pt-3 pb-2">
          <div className="text-[13px] font-semibold text-[#111827] mb-2">
            Order vs Delivery Volume
          </div>
          {volumeHistory.length > 0 ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={volumeHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend
                    iconSize={10}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar
                    dataKey="unitsOrdered"
                    name="Ordered"
                    fill="#0d9488"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="unitsReceived"
                    name="Delivered"
                    fill="#99f6e4"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-[13px] text-[#6b7280]">No data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Buyer Intelligence */}
      <BuyerIntelligenceTable buyers={data?.buyers ?? []} />

      {/* Demand Patterns */}
      {data?.volumeIntelligence && summary && summary.soCount > 0 && (
        <SalesDemandPatternsCard
          volumeIntelligence={data.volumeIntelligence}
          avgOrderIntervalDays={summary.avgOrderIntervalDays ?? null}
          uom={summary.uom ?? ""}
        />
      )}

      {/* Recent Sales Orders */}
      <RecentSalesOrdersTable recentOrders={data?.recentSOs ?? []} />
    </>
  );
}

/* ── Sales Price Intelligence Card ────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SalesPriceIntelligenceCard({ summary }: { summary: any }) {
  const volatilityLevel: string = summary.priceVolatilityLevel ?? "low";
  const volatilityColor =
    volatilityLevel === "high"
      ? "text-[#dc2626]"
      : volatilityLevel === "medium"
        ? "text-[#d97706]"
        : "text-[#059669]";

  const trend: string = summary.priceTrend ?? "stable";
  const trendPct: number | null = summary.priceTrendPct ?? null;
  const trendArrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  // Flipped for sales: up = good (green), down = bad (red)
  const trendColor =
    trend === "up"
      ? "text-[#059669]"
      : trend === "down"
        ? "text-[#dc2626]"
        : "text-[#6b7280]";
  const trendValueStr =
    trend === "stable"
      ? "Stable"
      : trendPct != null
        ? `${trendPct > 0 ? "+" : ""}${trendPct}%`
        : "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mx-4 sm:mx-8 mt-4">
      {/* Best Price (highest sell = good) */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
          Best Price Achieved
        </div>
        <div className="text-2xl font-semibold text-[#059669] mt-1">
          {summary.bestPrice != null
            ? `₹${summary.bestPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
            : "—"}
        </div>
        {summary.bestPriceMonth && (
          <div className="text-xs text-[#6b7280] mt-0.5">{summary.bestPriceMonth}</div>
        )}
      </div>

      {/* Worst Price (lowest sell = bad) */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
          Worst Price Achieved
        </div>
        <div className="text-2xl font-semibold text-[#dc2626] mt-1">
          {summary.worstPrice != null
            ? `₹${summary.worstPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
            : "—"}
        </div>
        {summary.worstPriceMonth && (
          <div className="text-xs text-[#6b7280] mt-0.5">{summary.worstPriceMonth}</div>
        )}
      </div>

      {/* Price Volatility */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
          Price Volatility
        </div>
        <div className={cn("text-2xl font-semibold mt-1", volatilityColor)}>
          {volatilityLevel.charAt(0).toUpperCase() + volatilityLevel.slice(1)}
        </div>
        {summary.priceVolatilityScore != null && (
          <div className="text-xs text-[#6b7280] mt-0.5">
            {summary.priceVolatilityScore}% variation
          </div>
        )}
      </div>

      {/* Price Trend */}
      <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
          Price Trend
        </div>
        <div className={cn("text-2xl font-semibold mt-1", trendColor)}>
          {trendArrow} {trendValueStr}
        </div>
        <div className="text-xs text-[#6b7280] mt-0.5">last 3 months</div>
      </div>
    </div>
  );
}

/* ── Sales Smart Alerts Panel ────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeSalesSmartAlerts(data: any): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const summary = data?.summary;
  if (!summary || !summary.soCount) return alerts;

  // 🔴 Sell price falling > 5%
  if (summary.priceTrend === "down" && summary.priceTrendPct < -5) {
    alerts.push({
      level: "critical",
      message: `Sell price down ${Math.abs(summary.priceTrendPct)}% over last 3 months — margin may be under pressure.`,
    });
  }

  // 🔴 Fulfillment rate critically low
  const cappedFulfillment = Math.min(summary.fulfillmentRate, 100);
  if (cappedFulfillment < 80 && cappedFulfillment > 0) {
    alerts.push({
      level: "critical",
      message: `Fulfillment rate is only ${cappedFulfillment}% — customers are not receiving what they ordered.`,
    });
  }

  // 🟡 Fulfillment rate below 90%
  if (cappedFulfillment >= 80 && cappedFulfillment < 90) {
    alerts.push({
      level: "warning",
      message: `Fulfillment rate is ${cappedFulfillment}% — ${(100 - cappedFulfillment).toFixed(1)}% of ordered quantity was not delivered.`,
    });
  }

  // 🟡 High price volatility
  if (summary.priceVolatilityLevel === "high") {
    alerts.push({
      level: "warning",
      message: `High sell price volatility (${summary.priceVolatilityScore}% variation) — different buyers paying very different prices.`,
    });
  }

  // 🟡 Any buyer with price trending down > 3%
  const buyers: BuyerRow[] = data?.buyers ?? [];
  buyers
    .filter((b) => b.priceTrend === "down" && (b.priceTrendPct ?? 0) < -3)
    .forEach((b) => {
      const recentFmt = b.recentAvgPrice != null
        ? `₹${b.recentAvgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        : "—";
      const historicFmt = b.historicAvgPrice != null
        ? `₹${b.historicAvgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
        : "—";
      alerts.push({
        level: "warning",
        message: `${b.buyerName} paying ${Math.abs(b.priceTrendPct ?? 0)}% less recently — recent avg ${recentFmt} vs historic ${historicFmt}.`,
      });
    });

  // 🟡 Only 1 buyer — concentration risk
  if (summary.buyerCount === 1) {
    alerts.push({
      level: "warning",
      message: "Only 1 active buyer — revenue concentration risk. Consider diversifying your customer base.",
    });
  }

  // 🟢 Sell price rising > 3%
  if (summary.priceTrend === "up" && summary.priceTrendPct > 3) {
    alerts.push({
      level: "positive",
      message: `Sell price up ${summary.priceTrendPct}% over last 3 months — strong pricing power.`,
    });
  }

  // 🟢 High fulfillment rate
  if (cappedFulfillment >= 95) {
    alerts.push({
      level: "positive",
      message: `Excellent fulfillment rate of ${cappedFulfillment}% — customers are receiving their full orders.`,
    });
  }

  // 🔵 Volume surging > 20%
  if (data.volumeIntelligence?.volumeTrend === "up" && data.volumeIntelligence.volumeTrendPct > 20) {
    alerts.push({
      level: "info",
      message: `Sales volume up ${data.volumeIntelligence.volumeTrendPct}% vs last quarter — strong demand, ensure procurement is keeping up.`,
    });
  }

  alerts.sort((a, b) => ALERT_LEVEL_ORDER[a.level] - ALERT_LEVEL_ORDER[b.level]);
  return alerts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SalesSmartAlertsPanel({ data }: { data: any }) {
  const [expanded, setExpanded] = useState(false);
  const alerts = useMemo(() => computeSalesSmartAlerts(data), [data]);

  if (alerts.length === 0) return null;

  const counts = alerts.reduce<Partial<Record<AlertLevel, number>>>((acc, a) => {
    acc[a.level] = (acc[a.level] ?? 0) + 1;
    return acc;
  }, {});

  const levelOrder: AlertLevel[] = ["critical", "warning", "positive", "info"];

  return (
    <div className="mx-4 sm:mx-8 mt-4 border border-[#e5e7eb] rounded-lg bg-white overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {levelOrder
            .filter((lvl) => (counts[lvl] ?? 0) > 0)
            .map((lvl) => {
              const style = ALERT_BADGE_STYLES[lvl];
              return (
                <span
                  key={lvl}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    style.bg,
                    style.text,
                  )}
                >
                  {counts[lvl]} {style.label}
                </span>
              );
            })}
        </div>
        <span className="text-xs text-[#0d9488] font-medium select-none">
          {expanded ? "Hide ▲" : "Show alerts ▼"}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-[#e5e7eb]">
          {alerts.map((alert, i) => {
            const style = ALERT_BADGE_STYLES[alert.level];
            return (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 border-b border-[#f3f4f6] last:border-b-0"
              >
                <span
                  className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", style.dot)}
                />
                <span className="text-sm text-[#374151]">{alert.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Sales Demand Patterns Card ──────────────────────────────────────── */

function SalesDemandPatternsCard({
  volumeIntelligence,
  avgOrderIntervalDays,
  uom,
}: {
  volumeIntelligence: VolumeIntelligenceData;
  avgOrderIntervalDays: number | null;
  uom: string;
}) {
  const abbr = getUOMAbbreviation(uom);
  const {
    avgMonthlyVolume,
    peakMonth,
    peakMonthVolume,
    volumeTrend,
    volumeTrendPct,
  } = volumeIntelligence;

  return (
    <div className="mx-4 sm:mx-8 mt-4">
      <div className="border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
          <span className="text-[13px] font-semibold text-[#111827]">
            Demand Patterns
          </span>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Avg Monthly Sales */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
                Avg Monthly Sales
              </div>
              <div className="text-xl font-semibold text-[#111827] mt-1">
                {avgMonthlyVolume.toLocaleString("en-IN")} {abbr}
              </div>
            </div>

            {/* Peak Month */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
                Peak Month
              </div>
              <div className="text-xl font-semibold text-[#111827] mt-1">
                {peakMonth}
              </div>
              <div className="text-sm text-[#6b7280]">
                {peakMonthVolume.toLocaleString("en-IN")} {abbr}
              </div>
            </div>

            {/* Order Frequency */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
                Order Frequency
              </div>
              <div className="text-xl font-semibold text-[#111827] mt-1">
                {avgOrderIntervalDays != null
                  ? `Every ~${avgOrderIntervalDays} days`
                  : "—"}
              </div>
            </div>
          </div>

          {/* Insight strip */}
          {volumeTrend !== "stable" && (
            <div className="border-t border-[#e5e7eb] mt-3 pt-3">
              {volumeTrend === "up" ? (
                <p className="text-[13px] text-[#059669]">
                  📈 Sales volume up {volumeTrendPct}% vs last quarter — strong demand
                  signal
                </p>
              ) : (
                <p className="text-[13px] text-[#d97706]">
                  📉 Sales volume down {Math.abs(volumeTrendPct)}% vs last quarter —
                  demand may be softening
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Buyer Intelligence Table Helpers ────────────────────────────────── */

function buyerPriceTrendBadge(b: BuyerRow): {
  display: React.ReactNode;
  tooltip: string;
} {
  const trend = b.priceTrend;
  const pct = b.priceTrendPct;

  if (!trend || pct == null || pct === 0) {
    return { display: "—", tooltip: "" };
  }

  const fmtPrice = (v: number | null | undefined) =>
    v != null ? `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

  // For sales: up = good (green), down = bad (red)
  if (trend === "up") {
    return {
      display: (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#f0fdf4] px-2 py-0.5 text-xs font-medium text-[#059669] whitespace-nowrap">
          ↑ +{pct}%
        </span>
      ),
      tooltip: `Recent avg ${fmtPrice(b.recentAvgPrice)} vs historic ${fmtPrice(b.historicAvgPrice)}`,
    };
  }

  if (trend === "down") {
    return {
      display: (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#fef2f2] px-2 py-0.5 text-xs font-medium text-[#dc2626] whitespace-nowrap">
          ↓ {pct}%
        </span>
      ),
      tooltip: `Recent avg ${fmtPrice(b.recentAvgPrice)} vs historic ${fmtPrice(b.historicAvgPrice)}`,
    };
  }

  return {
    display: (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f9fafb] px-2 py-0.5 text-xs font-medium text-[#6b7280] whitespace-nowrap">
        → Stable
      </span>
    ),
    tooltip: "Price has been consistent",
  };
}

function buyerFulfillment(b: BuyerRow): {
  text: string;
  colorClass: string;
  tooltip: string;
} {
  const rate = b.fulfillmentRate;
  if (rate == null) return { text: "—", colorClass: "", tooltip: "" };
  const capped = Math.min(rate, 100);
  return {
    text: `${capped.toFixed(1)}%`,
    colorClass: fulfillmentRateClass(capped),
    tooltip: `${capped.toFixed(1)}% of ordered quantity was actually delivered`,
  };
}

function buyerLastOrder(b: BuyerRow): {
  text: string;
  colorClass: string;
  tooltip: string;
} {
  const dateStr = b.lastOrderDate;
  if (!dateStr) return { text: "—", colorClass: "", tooltip: "" };

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const formatted = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (diffDays <= 30) {
    return { text: formatted, colorClass: "text-[#111827]", tooltip: "Active buyer" };
  }
  if (diffDays <= 90) {
    return { text: formatted, colorClass: "text-[#d97706]", tooltip: "No orders in 30+ days" };
  }
  return {
    text: formatted,
    colorClass: "text-[#dc2626]",
    tooltip: "No orders in 90+ days — buyer may be inactive",
  };
}

/* ── Buyer Intelligence Table ───────────────────────────────────────────── */

function BuyerIntelligenceTable({ buyers }: { buyers: BuyerRow[] }) {
  return (
    <div className="mx-4 sm:mx-8 mt-4 border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
        <span className="text-[13px] font-semibold text-[#111827]">
          Buyer Intelligence
        </span>
      </div>
      {buyers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                <th className={thCls}>Buyer</th>
                <th className={thCls}>Units</th>
                <th className={thCls}>Avg Price</th>
                <th className={thCls}>Price Range</th>
                <th className={thCls}>Orders</th>
                <th className={thCls}>Avg Lead Time</th>
                <th className={thCls}>On-Time Rate</th>
                <th className={thCls}>Price Trend</th>
                <th className={thCls}>Fulfillment</th>
                <th className={thCls}>Last Order</th>
                <th className={thCls}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map((b) => {
                const trendBadge = buyerPriceTrendBadge(b);
                const fulfillment = buyerFulfillment(b);
                const lastOrder = buyerLastOrder(b);
                return (
                  <tr
                    key={b.buyerId}
                    className="border-b border-[#e5e7eb] last:border-b-0 hover:bg-[#f9fafb]"
                  >
                    <td className={cn(tdCls, "font-medium")}>{b.buyerName}</td>
                    <td className={tdCls}>{b.units}</td>
                    <td className={tdCls}>
                      ₹{b.avgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={tdCls}>
                      ₹{b.minPrice.toLocaleString("en-IN")} – ₹{b.maxPrice.toLocaleString("en-IN")}
                    </td>
                    <td className={tdCls}>{b.soCount}</td>
                    <td className={tdCls}>
                      {b.avgLeadTimeDays != null ? `${b.avgLeadTimeDays} days` : "—"}
                    </td>
                    <td className={cn(tdCls, onTimeRateClass(b.onTimeRate))}>
                      {b.onTimeRate != null ? `${b.onTimeRate}%` : "—"}
                    </td>
                    <td className={tdCls} title={trendBadge.tooltip}>
                      {trendBadge.display}
                    </td>
                    <td className={cn(tdCls, fulfillment.colorClass)} title={fulfillment.tooltip}>
                      {fulfillment.text}
                    </td>
                    <td className={cn(tdCls, lastOrder.colorClass)} title={lastOrder.tooltip}>
                      {lastOrder.text}
                    </td>
                    <td className={tdCls}>
                      ₹{b.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-24">
          <p className="text-[13px] text-[#6b7280]">No buyer data available</p>
        </div>
      )}
    </div>
  );
}

/* ── Recent Sales Orders Table ──────────────────────────────────────────── */

function RecentSalesOrdersTable({ recentOrders }: { recentOrders: RecentSO[] }) {
  return (
    <div className="mx-4 sm:mx-8 mt-4 mb-8 border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
        <span className="text-[13px] font-semibold text-[#111827]">
          Recent Sales Orders
        </span>
      </div>
      {recentOrders.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                <th className={thCls}>SO Number</th>
                <th className={thCls}>Buyer</th>
                <th className={thCls}>Issue Date</th>
                <th className={thCls}>Delivery Date</th>
                <th className={thCls}>Unit Price</th>
                <th className={thCls}>Ordered</th>
                <th className={thCls}>Delivered</th>
                <th className={thCls}>PO Status</th>
                <th className={thCls}>Receipt Status</th>
                <th className={thCls}>Lead Time</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((so) => {
                const orderBadge = ORDER_STATUS_CONFIG[so.status] ?? {
                  label: so.status,
                  className: "bg-gray-100 text-gray-500 border border-gray-200",
                };
                const receiptBadge = RECEIPT_STATUS_CONFIG[so.productReceiptStatus] ?? {
                  label: so.productReceiptStatus,
                  className: "bg-gray-100 text-gray-500 border border-gray-200",
                };
                return (
                  <tr
                    key={so.soId}
                    className="border-b border-[#e5e7eb] last:border-b-0 hover:bg-[#f9fafb]"
                  >
                    <td className={tdCls}>
                      <Link
                        href={`/sales-orders/${so.soId}`}
                        className="text-[#0d9488] hover:underline"
                      >
                        {so.soNumber}
                      </Link>
                    </td>
                    <td className={tdCls}>{so.buyerName}</td>
                    <td className={tdCls}>{formatShortDate(so.issueDate)}</td>
                    <td className={tdCls}>{formatShortDate(so.deliveryDate)}</td>
                    <td className={tdCls}>
                      ₹{so.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={tdCls}>{so.unitsSold}</td>
                    <td className={cn(tdCls, getReceivedColor(so.unitsDelivered, so.unitsSold))}>{so.unitsDelivered}</td>
                    <td className={tdCls}>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                          orderBadge.className,
                        )}
                      >
                        {orderBadge.label}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                          receiptBadge.className,
                        )}
                      >
                        {receiptBadge.label}
                      </span>
                    </td>
                    <td className={tdCls}>{formatLeadTime(so.leadTimeDays)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-24">
          <p className="text-[13px] text-[#6b7280]">No recent sales orders</p>
        </div>
      )}
    </div>
  );
}

/* ── Margin Content ─────────────────────────────────────────────────────── */

function getWaterfallTextColor(type: string, value: number, label?: string): string {
  // Check label as fallback for type mismatches from API
  const normalizedLabel = label?.toLowerCase() ?? "";
  if (type === "tax" || normalizedLabel.includes("gst collected")) return "#d97706";
  if (type === "cost" || normalizedLabel.includes("gst on purchase")) return "#dc2626";
  switch (type) {
    case "base":
      return "#111827";
    case "revenue":
      return "#059669";
    case "result":
      return value > 0 ? "#059669" : "#dc2626";
    default:
      return "#6b7280";
  }
}

function waterfallSubtext(type: string, value: number): string {
  switch (type) {
    case "base":
      return "avg buy price excl. GST";
    case "cost":
      return "GST paid on purchase";
    case "revenue":
      return "avg sell price excl. GST";
    case "tax":
      return "GST collected from buyer";
    case "result":
      return value >= 0 ? "profit per unit" : "loss per unit";
    default:
      return "";
  }
}

function MarginContent({
  productId,
  selectedVariant,
  selectedPeriod,
  fromDate,
  toDate,
}: {
  productId: string;
  selectedVariant: string;
  selectedPeriod: PeriodValue;
  fromDate: string;
  toDate: string;
}) {
  const {
    data: marginData,
    isLoading: marginLoading,
    isError: marginError,
  } = useQuery({
    queryKey: [
      "product-margin-analytics",
      productId,
      selectedVariant,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      productsService.getMarginAnalytics({
        productId,
        variantId: selectedVariant,
        fromDate,
        toDate,
      }),
    enabled: !!selectedVariant && !!fromDate && !!toDate,
  });

  // Break-even calculator state — pre-populated once data loads
  const [beInitialized, setBeInitialized] = useState(false);
  const [beBuyPrice, setBeBuyPrice] = useState(0);
  const [beTargetMargin, setBeTargetMargin] = useState(18);
  const [beGstRate, setBeGstRate] = useState(18);

  useEffect(() => {
    if (marginData?.summary && !beInitialized) {
      setBeBuyPrice(marginData.summary.currentBuyPrice ?? 0);
      setBeGstRate(marginData.summary.gstRate ?? 18);
      setBeInitialized(true);
    }
  }, [marginData, beInitialized]);

  if (marginLoading) {
    return (
      <>
        {/* KPI skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mx-4 sm:mx-8 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3 animate-pulse"
            >
              <div className="h-3 w-20 bg-[#e5e7eb] rounded mb-3" />
              <div className="h-6 w-24 bg-[#e5e7eb] rounded" />
            </div>
          ))}
        </div>
        {/* Waterfall skeleton */}
        <div className="mx-4 sm:mx-8 mt-4 border border-[#e5e7eb] rounded-lg bg-white p-4 animate-pulse">
          <div className="h-4 w-32 bg-[#e5e7eb] rounded mb-4" />
          <div className="h-[280px] bg-[#f3f4f6] rounded" />
        </div>
        {/* Margin trend skeleton */}
        <div className="mx-4 sm:mx-8 mt-4 border border-[#e5e7eb] rounded-lg bg-white p-4 animate-pulse">
          <div className="h-4 w-28 bg-[#e5e7eb] rounded mb-4" />
          <div className="h-[200px] bg-[#f3f4f6] rounded" />
        </div>
        {/* Break-even skeleton */}
        <div className="mx-4 sm:mx-8 mt-4 mb-8 border border-[#e5e7eb] rounded-lg bg-white p-4 animate-pulse">
          <div className="h-4 w-40 bg-[#e5e7eb] rounded mb-4" />
          <div className="h-[120px] bg-[#f3f4f6] rounded" />
        </div>
      </>
    );
  }

  if (marginError) {
    return (
      <div className="mx-4 sm:mx-8 mt-4 border border-red-200 rounded-lg bg-red-50 px-4 py-3">
        <p className="text-[13px] text-red-600">
          Failed to load margin analytics. Please try again.
        </p>
      </div>
    );
  }

  // Empty state
  if (!marginData || (marginData.marginHistory ?? []).length === 0) {
    return (
      <div className="mx-4 sm:mx-8 mt-4 border border-[#e5e7eb] rounded-lg bg-white flex items-center justify-center h-48">
        <p className="text-sm text-[#6b7280]">
          No overlapping buy and sell data found for this period.
        </p>
      </div>
    );
  }

  const summary = marginData.summary;
  const avgBuyPrice: number = summary?.avgBuyPrice ?? 0;
  const avgSellPrice: number = summary?.avgSellPrice ?? 0;
  const avgGrossMargin: number = summary?.avgGrossMarginPct ?? 0;
  const mTrend: string = summary?.marginTrend ?? "stable";
  const mTrendPct: number | null = summary?.marginTrendPct ?? null;

  // Margin trend color
  const mTrendArrow = mTrend === "up" ? "↑" : mTrend === "down" ? "↓" : "→";
  const mTrendColor =
    mTrend === "up"
      ? "text-[#059669]"
      : mTrend === "down"
        ? "text-[#dc2626]"
        : "text-[#6b7280]";
  const mTrendValueStr =
    mTrend === "stable"
      ? "Stable"
      : mTrendPct != null
        ? `${mTrendPct > 0 ? "+" : ""}${mTrendPct}%`
        : "—";

  // Margin color helper
  const marginPctColor = (v: number | null) => {
    if (v == null) return "";
    if (v >= 15) return "text-[#059669]";
    if (v >= 5) return "text-[#d97706]";
    return "text-[#dc2626]";
  };

  // Waterfall data
  const waterfall: { label: string; value: number; type: string }[] =
    marginData.waterfall ?? [];

  // Margin history
  const marginHistory: { month: string; grossMarginPct: number }[] =
    marginData.marginHistory ?? [];

  // Break-even computations
  const currentSellPrice: number = summary?.currentSellPrice ?? avgSellPrice;
  const minSellPrice =
    beTargetMargin < 100 ? beBuyPrice / (1 - beTargetMargin / 100) : 0;
  const gap = currentSellPrice - minSellPrice;

  return (
    <>
      {/* Section 1 — KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mx-4 sm:mx-8 mt-4">
        <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
            Avg Buy Price
          </div>
          <div className="text-[20px] font-semibold text-[#111827] mt-1">
            ₹{avgBuyPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
            Avg Sell Price
          </div>
          <div className="text-[20px] font-semibold text-[#111827] mt-1">
            ₹{avgSellPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
            Avg Gross Margin
          </div>
          <div
            className={cn(
              "text-[20px] font-semibold mt-1",
              marginPctColor(avgGrossMargin),
            )}
          >
            {avgGrossMargin.toFixed(2)}%
          </div>
        </div>
        <div className="border border-[#e5e7eb] rounded-lg bg-white px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
            Margin Trend
          </div>
          <div className={cn("text-[20px] font-semibold mt-1", mTrendColor)}>
            {mTrendArrow} {mTrendValueStr}
          </div>
          <div className="text-xs text-[#6b7280] mt-0.5">last 3 months</div>
        </div>
      </div>

      {/* Section 2 — Margin Waterfall */}
      {waterfall.length > 0 && (
        <div className="mx-4 sm:mx-8 mt-4 border border-[#e5e7eb] rounded-lg bg-white p-4">
          <div className="text-[13px] font-semibold text-[#111827] mb-4">
            Margin Breakdown
          </div>
          <div className="flex items-center gap-1">
            {waterfall.map((item, index) => (
              <React.Fragment key={item.label}>
                <div className="flex-1 bg-white border border-[#e5e7eb] rounded-lg flex flex-col items-center justify-center py-8 px-2">
                  <span className="text-[10px] font-semibold text-center leading-tight mb-2 uppercase tracking-[0.8px] text-[#6b7280]">
                    {item.label}
                  </span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: getWaterfallTextColor(item.type, item.value, item.label) }}
                  >
                    ₹{item.value.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-[#9ca3af] text-center mt-1">
                    {waterfallSubtext(item.type, item.value)}
                  </span>
                </div>
                {index < waterfall.length - 1 && (
                  <span className="text-[#d1d5db] text-xl flex-shrink-0">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#f3f4f6]">
            <span className="text-[11px] text-[#6b7280]">Legend:</span>
            <span className="flex items-center gap-1 text-[11px] text-[#111827]">
              <span className="w-2 h-2 rounded-sm bg-[#111827] inline-block" /> Base price
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#dc2626]">
              <span className="w-2 h-2 rounded-sm bg-[#dc2626] inline-block" /> Cost / outflow
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#059669]">
              <span className="w-2 h-2 rounded-sm bg-[#059669] inline-block" /> Revenue
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#d97706]">
              <span className="w-2 h-2 rounded-sm bg-[#d97706] inline-block" /> Tax collected
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#059669]">
              <span className="w-2 h-2 rounded-sm bg-[#059669] inline-block" /> Net margin
            </span>
          </div>
        </div>
      )}

      {/* Section 3 — Margin Trend Chart */}
      <div className="mx-4 sm:mx-8 mt-4 border border-[#e5e7eb] rounded-lg bg-white p-4">
        <div className="text-[13px] font-semibold text-[#111827] mb-2">
          Margin Trend
        </div>
        {marginHistory.length > 1 ? (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={marginHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[
                    (dataMin: number) => Math.floor(dataMin - Math.max((dataMin * 0.1), 1)),
                    (dataMax: number) => Math.ceil(dataMax + Math.max((dataMax * 0.1), 1)),
                  ]}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((value: number) => [
                    `${value.toFixed(2)}%`,
                    "Gross Margin",
                  ]) as any}
                />
                <Line
                  type="monotone"
                  dataKey="grossMarginPct"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#0d9488" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-[#6b7280]">
              More months of overlapping buy and sell data needed to show margin
              trend.
            </p>
          </div>
        )}
      </div>

      {/* Section 4 — Break-even Calculator */}
      <div className="mx-4 sm:mx-8 mt-4 mb-8 border border-[#e5e7eb] rounded-lg bg-white p-4">
        <div className="text-[13px] font-semibold text-[#111827] mb-4">
          Break-even Calculator
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
          {/* Left — inputs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[#374151]">
                Current Buy Price (₹)
              </label>
              <input
                type="number"
                className="border border-[#e5e7eb] rounded px-3 py-1.5 text-sm w-32 text-right focus:outline-none focus:ring-1 focus:ring-[#0d9488]"
                value={beBuyPrice}
                onChange={(e) => setBeBuyPrice(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[#374151]">
                Target Margin (%)
              </label>
              <input
                type="number"
                className="border border-[#e5e7eb] rounded px-3 py-1.5 text-sm w-32 text-right focus:outline-none focus:ring-1 focus:ring-[#0d9488]"
                value={beTargetMargin}
                onChange={(e) => setBeTargetMargin(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[#374151]">GST Rate (%)</label>
              <input
                type="number"
                className="border border-[#e5e7eb] rounded px-3 py-1.5 text-sm w-32 text-right focus:outline-none focus:ring-1 focus:ring-[#0d9488]"
                value={beGstRate}
                onChange={(e) => setBeGstRate(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Right — computed results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6b7280]">Min Sell Price</span>
              <span className="text-sm font-semibold text-[#111827]">
                ₹{minSellPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6b7280]">Current Sell Price</span>
              <span className="text-sm font-semibold text-[#111827]">
                ₹{currentSellPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6b7280]">Gap</span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  gap >= 0 ? "text-[#059669]" : "text-[#dc2626]",
                )}
              >
                ₹{Math.abs(gap).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                {gap >= 0 ? "above target" : "below target"}
              </span>
            </div>
          </div>
        </div>

        {/* Insight line */}
        <div className="border-t border-[#e5e7eb] mt-4 pt-3">
          {gap < 0 ? (
            <p className="text-sm text-[#dc2626]">
              ⚠️ At current buy price of ₹{beBuyPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}, you need
              to sell above ₹{minSellPrice.toFixed(2)} to maintain {beTargetMargin}%
              margin. Current sell price of ₹{currentSellPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}{" "}
              falls short by ₹{Math.abs(gap).toFixed(2)}.
            </p>
          ) : (
            <p className="text-sm text-[#059669]">
              ✅ Current sell price of ₹{currentSellPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })} exceeds
              the minimum of ₹{minSellPrice.toFixed(2)} needed for {beTargetMargin}%
              margin. You have ₹{gap.toFixed(2)} of headroom.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Supplier Intelligence Table ────────────────────────────────────────── */

interface SupplierRow {
  supplierName: string;
  units: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  poCount: number;
  avgLeadTimeDays: number | null;
  onTimeRate: number | null;
  priceTrend?: "up" | "down" | "stable";
  priceTrendPct?: number | null;
  recentAvgPrice?: number | null;
  historicAvgPrice?: number | null;
  fulfillmentRate?: number | null;
  lastOrderDate?: string | null;
  totalSpend: number;
}

interface BuyerRow {
  buyerId: string;
  buyerName: string;
  units: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  soCount: number;
  avgLeadTimeDays: number | null;
  onTimeRate: number | null;
  priceTrend?: "up" | "down" | "stable";
  priceTrendPct?: number | null;
  recentAvgPrice?: number | null;
  historicAvgPrice?: number | null;
  fulfillmentRate?: number | null;
  lastOrderDate?: string | null;
  totalRevenue: number;
}

function onTimeRateClass(rate: number | null): string {
  if (rate == null) return "";
  if (rate >= 80) return "text-[#059669]";
  if (rate >= 50) return "text-[#d97706]";
  return "text-[#dc2626]";
}

const thCls =
  "text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] whitespace-nowrap";
const tdCls = "px-4 py-3 text-[13px] text-[#111827] whitespace-nowrap";

function supplierPriceTrendBadge(s: SupplierRow): {
  display: React.ReactNode;
  tooltip: string;
} {
  const trend = s.priceTrend;
  const pct = s.priceTrendPct;

  if (!trend || pct == null || pct === 0) {
    return { display: "—", tooltip: "" };
  }

  const fmtPrice = (v: number | null | undefined) =>
    v != null ? `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

  if (trend === "up") {
    return {
      display: (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#fef2f2] px-2 py-0.5 text-xs font-medium text-[#dc2626] whitespace-nowrap">
          ↑ +{pct}%
        </span>
      ),
      tooltip: `Recent avg ${fmtPrice(s.recentAvgPrice)} vs historic ${fmtPrice(s.historicAvgPrice)}`,
    };
  }

  if (trend === "down") {
    return {
      display: (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#f0fdf4] px-2 py-0.5 text-xs font-medium text-[#059669] whitespace-nowrap">
          ↓ {pct}%
        </span>
      ),
      tooltip: `Recent avg ${fmtPrice(s.recentAvgPrice)} vs historic ${fmtPrice(s.historicAvgPrice)}`,
    };
  }

  // stable
  return {
    display: (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f9fafb] px-2 py-0.5 text-xs font-medium text-[#6b7280] whitespace-nowrap">
        → Stable
      </span>
    ),
    tooltip: "Price has been consistent",
  };
}

function fulfillmentRateClass(rate: number | null): string {
  if (rate == null) return "";
  if (rate >= 95) return "text-[#059669]";
  if (rate >= 80) return "text-[#d97706]";
  return "text-[#dc2626]";
}

function supplierFulfillment(s: SupplierRow): {
  text: string;
  colorClass: string;
  tooltip: string;
} {
  const rate = s.fulfillmentRate;
  if (rate == null) return { text: "—", colorClass: "", tooltip: "" };
  const capped = Math.min(rate, 100);
  return {
    text: `${capped.toFixed(1)}%`,
    colorClass: fulfillmentRateClass(capped),
    tooltip: `${capped.toFixed(1)}% of ordered quantity was actually delivered`,
  };
}

function supplierLastOrder(s: SupplierRow): {
  text: string;
  colorClass: string;
  tooltip: string;
} {
  const dateStr = s.lastOrderDate;
  if (!dateStr) return { text: "—", colorClass: "", tooltip: "" };

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const formatted = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (diffDays <= 30) {
    return { text: formatted, colorClass: "text-[#111827]", tooltip: "Active supplier" };
  }
  if (diffDays <= 90) {
    return { text: formatted, colorClass: "text-[#d97706]", tooltip: "No orders in 30+ days" };
  }
  return {
    text: formatted,
    colorClass: "text-[#dc2626]",
    tooltip: "No orders in 90+ days — supplier may be inactive",
  };
}

function SupplierIntelligenceTable({ suppliers }: { suppliers: SupplierRow[] }) {
  return (
    <div className="mx-4 sm:mx-8 mt-4 border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
        <span className="text-[13px] font-semibold text-[#111827]">
          Supplier Intelligence
        </span>
      </div>
      {suppliers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                <th className={thCls}>Supplier</th>
                <th className={thCls}>Units</th>
                <th className={thCls}>Avg Price</th>
                <th className={thCls}>Price Range</th>
                <th className={thCls}>POs</th>
                <th className={thCls}>Avg Lead Time</th>
                <th className={thCls}>On-Time Rate</th>
                <th className={thCls}>Price Trend</th>
                <th className={thCls}>Fulfillment</th>
                <th className={thCls}>Last Order</th>
                <th className={thCls}>Total Spend</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const trendBadge = supplierPriceTrendBadge(s);
                const fulfillment = supplierFulfillment(s);
                const lastOrder = supplierLastOrder(s);
                return (
                  <tr
                    key={s.supplierName}
                    className="border-b border-[#e5e7eb] last:border-b-0 hover:bg-[#f9fafb]"
                  >
                    <td className={cn(tdCls, "font-medium")}>{s.supplierName}</td>
                    <td className={tdCls}>{s.units}</td>
                    <td className={tdCls}>
                      ₹{s.avgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={tdCls}>
                      ₹{s.minPrice.toLocaleString("en-IN")} – ₹{s.maxPrice.toLocaleString("en-IN")}
                    </td>
                    <td className={tdCls}>{s.poCount}</td>
                    <td className={tdCls}>
                      {s.avgLeadTimeDays != null ? `${s.avgLeadTimeDays} days` : "—"}
                    </td>
                    <td className={cn(tdCls, onTimeRateClass(s.onTimeRate))}>
                      {s.onTimeRate != null ? `${s.onTimeRate}%` : "—"}
                    </td>
                    <td className={tdCls} title={trendBadge.tooltip}>
                      {trendBadge.display}
                    </td>
                    <td className={cn(tdCls, fulfillment.colorClass)} title={fulfillment.tooltip}>
                      {fulfillment.text}
                    </td>
                    <td className={cn(tdCls, lastOrder.colorClass)} title={lastOrder.tooltip}>
                      {lastOrder.text}
                    </td>
                    <td className={tdCls}>
                      ₹{s.totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-24">
          <p className="text-[13px] text-[#6b7280]">No supplier data available</p>
        </div>
      )}
    </div>
  );
}

/* ── Recent POs Table ───────────────────────────────────────────────────── */

interface RecentPO {
  poId: string;
  poNumber: string;
  supplierName: string;
  issueDate: string;
  deliveryDate: string;
  unitPrice: number;
  unitsOrdered: number;
  unitsReceived: number;
  status: string;
  receiptStatus: string;
  productReceiptStatus: string;
  leadTimeDays: number | null;
}

interface RecentSO {
  soId: string;
  soNumber: string;
  buyerName: string;
  issueDate: string;
  deliveryDate: string;
  unitPrice: number;
  unitsSold: number;
  unitsDelivered: number;
  status: string;
  receiptStatus: string;
  productReceiptStatus: string;
  leadTimeDays: number | null;
}

const ORDER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  issued:    { label: "Issued",    className: "bg-blue-50 text-blue-700 border border-blue-200" },
  completed: { label: "Completed", className: "bg-green-50 text-green-700 border border-green-200" },
  draft:     { label: "Draft",     className: "bg-gray-100 text-gray-500 border border-gray-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border border-red-200" },
};

const RECEIPT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:            { label: "Pending",          className: "bg-gray-100 text-gray-500 border border-gray-200" },
  partial:            { label: "Partial",          className: "bg-amber-50 text-amber-700 border border-amber-200" },
  completed:          { label: "Completed",        className: "bg-green-50 text-green-700 border border-green-200" },
  "force closed":     { label: "Force Closed",     className: "bg-red-50 text-red-600 border border-red-200" },
  "excess delivered": { label: "Excess Delivered", className: "bg-blue-50 text-blue-700 border border-blue-200" },
};

function getReceivedColor(received: number, ordered: number): string {
  if (received >= ordered) return "text-[#059669]";
  if (received > 0 && received < ordered) return "text-[#d97706]";
  return "text-[#dc2626]";
}

function formatLeadTime(days: number | null): string {
  if (days == null) return "—";
  if (days === 0) return "Same day";
  return `${days} days`;
}

function formatShortDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function RecentPOsTable({ recentPOs }: { recentPOs: RecentPO[] }) {
  return (
    <div className="mx-4 sm:mx-8 mt-4 mb-8 border border-[#e5e7eb] rounded-lg overflow-hidden bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
        <span className="text-[13px] font-semibold text-[#111827]">
          Recent Purchase Orders
        </span>
      </div>
      {recentPOs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                <th className={thCls}>PO Number</th>
                <th className={thCls}>Supplier</th>
                <th className={thCls}>Issue Date</th>
                <th className={thCls}>Delivery Date</th>
                <th className={thCls}>Unit Price</th>
                <th className={thCls}>Ordered</th>
                <th className={thCls}>Received</th>
                <th className={thCls}>PO Status</th>
                <th className={thCls}>Receipt Status</th>
                <th className={thCls}>Lead Time</th>
              </tr>
            </thead>
            <tbody>
              {recentPOs.map((po) => {
                const orderBadge = ORDER_STATUS_CONFIG[po.status] ?? {
                  label: po.status,
                  className: "bg-gray-100 text-gray-500 border border-gray-200",
                };
                const receiptBadge = RECEIPT_STATUS_CONFIG[po.productReceiptStatus] ?? {
                  label: po.productReceiptStatus,
                  className: "bg-gray-100 text-gray-500 border border-gray-200",
                };
                return (
                  <tr
                    key={po.poId}
                    className="border-b border-[#e5e7eb] last:border-b-0 hover:bg-[#f9fafb]"
                  >
                    <td className={tdCls}>
                      <Link
                        href={`/purchase-orders/${po.poId}`}
                        className="text-[#0d9488] hover:underline"
                      >
                        {po.poNumber}
                      </Link>
                    </td>
                    <td className={tdCls}>{po.supplierName}</td>
                    <td className={tdCls}>{formatShortDate(po.issueDate)}</td>
                    <td className={tdCls}>{formatShortDate(po.deliveryDate)}</td>
                    <td className={tdCls}>
                      ₹{po.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={tdCls}>{po.unitsOrdered}</td>
                    <td className={cn(tdCls, getReceivedColor(po.unitsReceived, po.unitsOrdered))}>{po.unitsReceived}</td>
                    <td className={tdCls}>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                          orderBadge.className,
                        )}
                      >
                        {orderBadge.label}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                          receiptBadge.className,
                        )}
                      >
                        {receiptBadge.label}
                      </span>
                    </td>
                    <td className={tdCls}>{formatLeadTime(po.leadTimeDays)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-24">
          <p className="text-[13px] text-[#6b7280]">No recent purchase orders</p>
        </div>
      )}
    </div>
  );
}
