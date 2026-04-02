"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { categoriesService } from "@/services/categories";
import type { CustomAttribute } from "@/services/categories";

// ── Types ────────────────────────────────────────────────────────────────────

interface AttributeRow extends CustomAttribute {
  id: string;
}

function makeEmptyRow(): AttributeRow {
  return {
    id: crypto.randomUUID(),
    label: "",
    unit: "",
    required: false,
    valueType: "text",
    values: "",
  };
}

interface QuickCreateCategoryModalProps {
  open: boolean;
  onClose: () => void;
  mode: "category" | "subcategory";
  parentCategoryId?: string;
  parentCategoryName?: string;
  onCreated: (created: { _id: string; name: string }) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function QuickCreateCategoryModal({
  open,
  onClose,
  mode,
  parentCategoryId,
  parentCategoryName,
  onCreated,
}: QuickCreateCategoryModalProps) {
  const queryClient = useQueryClient();
  const isSubcategory = mode === "subcategory";

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  function reset() {
    setName("");
    setNameError("");
    setAttributes([]);
    setIsSubmitting(false);
    setAttempted(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // ── Attribute helpers ──────────────────────────────────────────────────────

  function updateAttribute(id: string, patch: Partial<AttributeRow>) {
    setAttributes((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function removeAttribute(id: string) {
    setAttributes((prev) => prev.filter((row) => row.id !== id));
  }

  function rowIsEmpty(row: AttributeRow) {
    return !row.label.trim() && !row.unit.trim() && !row.values?.trim();
  }

  function rowHasError(row: AttributeRow) {
    if (rowIsEmpty(row)) return false;
    if (!row.label.trim()) return true;
    if (row.valueType === "dropdown" && !row.values?.trim()) return true;
    return false;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setAttempted(true);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(`${isSubcategory ? "Subcategory" : "Category"} name is required`);
      return;
    }
    setNameError("");

    if (isSubcategory) {
      const hasAttrErrors = attributes.some(rowHasError);
      if (hasAttrErrors) return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let created: { _id: string; name: string };

      if (isSubcategory && parentCategoryId) {
        const filledAttributes = attributes.filter((row) => !rowIsEmpty(row));
        const customAttributes: CustomAttribute[] = filledAttributes.map((row) => ({
          label: row.label.trim(),
          unit: row.unit.trim(),
          required: row.required,
          valueType: row.valueType,
          ...(row.valueType === "dropdown" && { values: row.values?.trim() ?? "" }),
        }));

        const { data } = await categoriesService.createSubCategory({
          name: trimmedName,
          parentId: parentCategoryId,
          ...(customAttributes.length > 0 && { customAttributes }),
        });
        created = { _id: data._id, name: data.name };
        toast.success("Subcategory created");
      } else {
        const { data } = await categoriesService.create({ name: trimmedName });
        created = { _id: data._id, name: data.name };
        toast.success("Category created");
      }

      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      onCreated(created);
      handleClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? `Failed to create ${isSubcategory ? "subcategory" : "category"}`;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent showCloseButton={false} className="max-w-[560px] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <DialogTitle className="text-base font-semibold text-gray-900">
            {isSubcategory
              ? `New Subcategory${parentCategoryName ? ` in ${parentCategoryName}` : ""}`
              : "New Category"}
          </DialogTitle>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {isSubcategory ? "Subcategory" : "Category"} Name{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder={`Enter ${isSubcategory ? "subcategory" : "category"} name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isSubcategory && handleSubmit()}
              autoFocus
              className={`w-full border ${
                attempted && nameError ? "border-[#dc2626]" : "border-gray-300"
              } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
            />
            {attempted && nameError && (
              <p className="text-[12px] text-[#dc2626] mt-1">{nameError}</p>
            )}
          </div>

          {/* Custom Attributes (subcategory only) */}
          {isSubcategory && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-[#fafafa] flex items-center justify-between">
                <span className="text-[13px] font-medium text-gray-700">
                  Custom Attributes{" "}
                  <span className="text-[11px] text-gray-400 font-normal">(optional)</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAttributes((prev) => [...prev, makeEmptyRow()])}
                  className="h-7 text-[12px] text-[#0d9488] border-[#0d9488] hover:bg-[#f0fdfa]"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              {attributes.length === 0 ? (
                <div className="px-4 py-3 text-[12px] text-gray-400 text-center">
                  No attributes — click Add to define variant attributes
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {attributes.map((row) => {
                    const labelMissing = attempted && !rowIsEmpty(row) && !row.label.trim();
                    const dropdownMissing =
                      attempted && row.valueType === "dropdown" && !rowIsEmpty(row) && !row.values?.trim();

                    return (
                      <div key={row.id} className="px-4 py-2.5 flex items-start gap-2">
                        {/* Label */}
                        <input
                          type="text"
                          placeholder="Label *"
                          value={row.label}
                          onChange={(e) => updateAttribute(row.id, { label: e.target.value })}
                          className={`flex-1 min-w-0 border rounded px-2 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-[#0d9488] ${
                            labelMissing ? "border-[#dc2626]" : "border-gray-200"
                          }`}
                        />
                        {/* Unit */}
                        <input
                          type="text"
                          placeholder="Unit"
                          value={row.unit}
                          onChange={(e) => updateAttribute(row.id, { unit: e.target.value })}
                          className="w-16 border border-gray-200 rounded px-2 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-[#0d9488]"
                        />
                        {/* Type */}
                        <select
                          value={row.valueType}
                          onChange={(e) =>
                            updateAttribute(row.id, { valueType: e.target.value as "text" | "dropdown" })
                          }
                          className="w-24 border border-gray-200 rounded px-1.5 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-[#0d9488] bg-white"
                        >
                          <option value="text">Text</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                        {/* Values (dropdown only) */}
                        <input
                          type="text"
                          placeholder={row.valueType === "dropdown" ? "a, b, c" : "—"}
                          value={row.values ?? ""}
                          onChange={(e) => updateAttribute(row.id, { values: e.target.value })}
                          disabled={row.valueType !== "dropdown"}
                          className={`flex-1 min-w-0 border rounded px-2 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-[#0d9488] disabled:opacity-40 disabled:cursor-not-allowed ${
                            dropdownMissing ? "border-[#dc2626]" : "border-gray-200"
                          }`}
                        />
                        {/* Required */}
                        <label className="flex items-center gap-1 text-[11px] text-gray-500 whitespace-nowrap pt-1.5">
                          <input
                            type="checkbox"
                            checked={row.required}
                            onChange={(e) => updateAttribute(row.id, { required: e.target.checked })}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-[#0d9488] focus:ring-[#0d9488]"
                          />
                          Req
                        </label>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => removeAttribute(row.id)}
                          className="pt-1.5 text-gray-300 hover:text-[#dc2626] transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="border-gray-200 text-gray-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#0d9488] hover:bg-[#0f766e] text-white"
          >
            {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {isSubcategory ? "Create Subcategory" : "Create Category"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
