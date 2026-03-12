"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoriesService } from "@/services/categories";
import type { CustomAttribute } from "@/services/categories";

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

interface SubCategoryFormProps {
  parentCategoryId: string;
}

export function SubCategoryForm({ parentCategoryId }: SubCategoryFormProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [attributes, setAttributes] = useState<AttributeRow[]>([makeEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [nameError, setNameError] = useState("");

  // ── Attribute helpers ───────────────────────────────────────────────────────

  function updateAttribute(id: string, patch: Partial<AttributeRow>) {
    setAttributes((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function removeAttribute(id: string) {
    setAttributes((prev) => prev.filter((row) => row.id !== id));
  }

  function addAttribute() {
    setAttributes((prev) => [...prev, makeEmptyRow()]);
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  function rowHasError(row: AttributeRow) {
    if (!row.label.trim()) return true;
    if (row.valueType === "dropdown" && !row.values?.trim()) return true;
    return false;
  }

  function rowDropdownMissingValues(row: AttributeRow) {
    return row.valueType === "dropdown" && !row.values?.trim();
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setAttempted(true);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Subcategory name is required");
    } else {
      setNameError("");
    }

    const hasAttrErrors = attributes.some(rowHasError);
    if (!trimmedName || hasAttrErrors) return;

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const customAttributes: CustomAttribute[] = attributes.map((row) => {
        const attr: CustomAttribute = {
          label: row.label.trim(),
          unit: row.unit.trim(),
          required: row.required,
          valueType: row.valueType,
        };
        if (row.valueType === "dropdown") {
          attr.values = row.values?.trim() ?? "";
        }
        return attr;
      });

      await categoriesService.createSubCategory({
        name: trimmedName,
        parentId: parentCategoryId,
        customAttributes,
      });

      toast.success("Subcategory created successfully");
      router.push("/categories");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to create subcategory";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-[55px] flex-shrink-0 items-center border-b border-[#e5e7eb] bg-white px-6">
        <button
          onClick={() => router.push("/categories")}
          className="mr-3 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
          aria-label="Back to categories"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-[18px] font-semibold text-[#111827]">
          Create Subcategory
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-[#f9fafb]">
        <div className="mx-auto max-w-[900px] p-6">
          {/* Subcategory Name */}
          <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-6 py-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Subcategory Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter subcategory name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full border ${
                  attempted && nameError ? "border-[#dc2626]" : "border-gray-300"
                } rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`}
              />
              {attempted && nameError && (
                <p className="text-[12px] text-[#dc2626] mt-1">{nameError}</p>
              )}
            </div>
          </div>

          {/* Custom Attributes */}
          <div className="mt-4 rounded-[10px] border border-[#e5e7eb] bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e5e7eb]">
              <h3 className="text-sm font-medium text-[#111827]">Custom Attributes</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-left text-[13px] font-medium text-[#111827] bg-[#fafafa] divide-x divide-[#e5e7eb]">
                    <th className="h-10 px-3" style={{ width: "24%" }}>Label <span className="text-red-500">*</span></th>
                    <th className="h-10 px-3" style={{ width: "14%" }}>Unit</th>
                    <th className="h-10 px-3" style={{ width: "16%" }}>Type <span className="text-red-500">*</span></th>
                    <th className="h-10 px-3" style={{ width: "30%" }}>Values <span className="text-red-500 text-[11px] font-normal">(required if Dropdown)</span></th>
                    <th className="h-10 px-3 text-center" style={{ width: "9%" }}>Required</th>
                    <th className="h-10 px-2 text-center" style={{ width: "7%" }}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {attributes.map((row) => {
                    const labelMissing = attempted && !row.label.trim();
                    const dropdownValuesMissing =
                      attempted && rowDropdownMissingValues(row);

                    return (
                      <tr
                        key={row.id}
                        className={`border-b hover:bg-[#fafafa] transition-colors divide-x divide-[#e5e7eb] ${
                          dropdownValuesMissing
                            ? "border border-red-400"
                            : "border-[#f3f4f6]"
                        }`}
                      >
                        {/* Label */}
                        <td className="h-10 px-1">
                          <input
                            type="text"
                            placeholder="Attribute label"
                            value={row.label}
                            onChange={(e) =>
                              updateAttribute(row.id, { label: e.target.value })
                            }
                            className={`w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-2 py-1 text-[13px] text-[#111827] ${
                              labelMissing ? "ring-1 ring-[#dc2626]" : ""
                            }`}
                          />
                        </td>

                        {/* Unit */}
                        <td className="h-10 px-1">
                          <input
                            type="text"
                            placeholder="e.g. cm"
                            value={row.unit}
                            onChange={(e) =>
                              updateAttribute(row.id, { unit: e.target.value })
                            }
                            className="w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-2 py-1 text-[13px] text-[#111827]"
                          />
                        </td>

                        {/* Type */}
                        <td className="h-10 px-1">
                          <select
                            value={row.valueType}
                            onChange={(e) =>
                              updateAttribute(row.id, {
                                valueType: e.target.value as "text" | "dropdown",
                              })
                            }
                            className="w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-2 py-1 text-[13px] text-[#111827] cursor-pointer"
                          >
                            <option value="text">Text</option>
                            <option value="dropdown">Dropdown</option>
                          </select>
                        </td>

                        {/* Values */}
                        <td className="h-10 px-1">
                          <input
                            type="text"
                            placeholder="e.g. Long, Short, Sleeveless"
                            value={row.values ?? ""}
                            onChange={(e) =>
                              updateAttribute(row.id, { values: e.target.value })
                            }
                            disabled={row.valueType !== "dropdown"}
                            className={`w-full border-0 outline-none bg-transparent focus:bg-[#f0fdfa] rounded px-2 py-1 text-[13px] text-[#111827] disabled:opacity-40 disabled:cursor-not-allowed ${
                              dropdownValuesMissing ? "ring-1 ring-[#dc2626]" : ""
                            }`}
                          />
                        </td>

                        {/* Required */}
                        <td className="h-10 px-1 text-center">
                          <input
                            type="checkbox"
                            checked={row.required}
                            onChange={(e) =>
                              updateAttribute(row.id, {
                                required: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-gray-300 text-[#0d9488] focus:ring-[#0d9488] cursor-pointer"
                          />
                        </td>

                        {/* Delete */}
                        <td className="h-10 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeAttribute(row.id)}
                            className="p-1 text-[#9ca3af] hover:text-[#dc2626] transition-colors"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Add Attribute row */}
                  <tr>
                    <td colSpan={6} className="px-3 py-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addAttribute}
                        className="h-8 text-[13px] text-[#0d9488] border-[#0d9488] hover:bg-[#f0fdfa]"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Attribute
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/categories")}
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
              Create Subcategory
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
