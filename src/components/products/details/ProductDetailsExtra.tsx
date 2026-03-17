"use client";

import { useRef, useState } from "react";
import { ChevronDown, Loader2, Paperclip, Plus, X } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import type { Product } from "@/services/products";
import type { ProductEditState } from "@/app/(dashboard)/products/[id]/page";

const COLLAPSED_LINES = 2;
const COLLAPSED_TERMS = 2;

interface ProductDetailsExtraProps {
  product: Product;
  isEditing?: boolean;
  editState?: ProductEditState | null;
  onEditStateChange?: (state: ProductEditState | null) => void;
}

export function ProductDetailsExtra({
  product,
  isEditing,
  editState,
  onEditStateChange,
}: ProductDetailsExtraProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const description = product.description?.trim();
  const terms = product.termsOfConditions ?? [];
  const files = product.files ?? [];

  function updateField<K extends keyof ProductEditState>(
    key: K,
    value: ProductEditState[K],
  ) {
    if (!editState || !onEditStateChange) return;
    onEditStateChange({ ...editState, [key]: value });
  }

  function handleTermChange(index: number, value: string) {
    if (!editState) return;
    const updated = [...editState.termsOfConditions];
    updated[index] = value;
    updateField("termsOfConditions", updated);
  }

  function addTerm() {
    if (!editState) return;
    updateField("termsOfConditions", [...editState.termsOfConditions, ""]);
  }

  function removeTerm(index: number) {
    if (!editState) return;
    updateField(
      "termsOfConditions",
      editState.termsOfConditions.filter((_, i) => i !== index),
    );
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editState) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post<{ id: string; name: string }>(
        "/files/upload",
        formData,
      );
      updateField("files", [...editState.files, res.data]);
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeFile(index: number) {
    if (!editState) return;
    updateField(
      "files",
      editState.files.filter((_, i) => i !== index),
    );
  }

  const hasDescription = !!description;
  const hasTerms = terms.length > 0;
  const hasFiles = files.length > 0;
  const hasAnyContent = hasDescription || hasTerms || hasFiles;

  // ── Edit mode ──
  if (isEditing && editState && onEditStateChange) {
    const inputCls =
      "h-8 w-full rounded-[6px] border border-[#e5e7eb] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]";

    return (
      <div className="mx-8 mt-2">
        <div className="rounded-[10px] border border-[#0d9488]/30 bg-white px-4 py-3">
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Description */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] mb-1.5">
                Description
              </div>
              <textarea
                value={editState.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                className="w-full rounded-[6px] border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] text-[#111827] outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488] resize-none"
                placeholder="Product description…"
              />
            </div>

            {/* Right: Terms & Conditions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280]">
                  Terms & Conditions
                </div>
                <button
                  type="button"
                  onClick={addTerm}
                  className="flex items-center gap-1 text-[11px] text-[#0d9488] font-medium hover:text-[#0f766e]"
                >
                  <Plus size={11} />
                  Add
                </button>
              </div>
              {editState.termsOfConditions.length > 0 ? (
                <div className="space-y-1.5">
                  {editState.termsOfConditions.map((term, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#6b7280] w-4 text-right flex-shrink-0">
                        {i + 1}.
                      </span>
                      <input
                        value={term}
                        onChange={(e) => handleTermChange(i, e.target.value)}
                        className={inputCls}
                        placeholder={`Term ${i + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeTerm(i)}
                        className="p-0.5 text-[#9ca3af] hover:text-[#dc2626] flex-shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-[#9ca3af]">No terms added</p>
              )}
            </div>
          </div>

          {/* Files row */}
          <div className="border-t border-[#e5e7eb] mt-3 pt-2.5">
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] flex-shrink-0">
                Files
              </div>
              {editState.files.map((file, idx) => (
                <div
                  key={`${file.id}-${idx}`}
                  className="flex items-center gap-1.5 bg-[#f3f4f6] rounded px-2 py-1"
                >
                  <Paperclip size={11} className="text-[#6b7280]" />
                  <span className="text-[11px] text-[#111827]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-0.5 text-[#9ca3af] hover:text-[#dc2626]"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 text-[11px] text-[#0d9488] font-medium hover:text-[#0f766e] disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Plus size={11} />
                )}
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── View mode ──
  if (!hasAnyContent) return null;

  return (
    <div className="mx-8 mt-2">
      <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 py-2.5">
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Description */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] mb-1">
              Description
            </div>
            {hasDescription ? (
              <div>
                <p
                  className={`text-[13px] text-[#111827] leading-relaxed whitespace-pre-wrap ${
                    !descExpanded ? "line-clamp-2" : ""
                  }`}
                >
                  {description}
                </p>
                {description!.split("\n").length > COLLAPSED_LINES ||
                description!.length > 150 ? (
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="flex items-center gap-0.5 mt-1 text-[11px] text-[#0d9488] font-medium hover:text-[#0f766e]"
                  >
                    {descExpanded ? "Show less" : "See more"}
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${descExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-[13px] text-[#9ca3af]">—</p>
            )}
          </div>

          {/* Right: Terms & Conditions */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] mb-1">
              Terms & Conditions
            </div>
            {hasTerms ? (
              <div>
                <ol className="list-decimal pl-4 space-y-0.5">
                  {(termsExpanded ? terms : terms.slice(0, COLLAPSED_TERMS)).map(
                    (term, i) => (
                      <li
                        key={i}
                        className="text-[13px] text-[#111827] leading-relaxed"
                      >
                        {term}
                      </li>
                    ),
                  )}
                </ol>
                {terms.length > COLLAPSED_TERMS && (
                  <button
                    onClick={() => setTermsExpanded(!termsExpanded)}
                    className="flex items-center gap-0.5 mt-1 text-[11px] text-[#0d9488] font-medium hover:text-[#0f766e]"
                  >
                    {termsExpanded
                      ? "Show less"
                      : `+${terms.length - COLLAPSED_TERMS} more`}
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${termsExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-[#9ca3af]">—</p>
            )}
          </div>
        </div>

        {/* Files row */}
        {hasFiles && (
          <div className="border-t border-[#e5e7eb] mt-2 pt-2">
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#6b7280] flex-shrink-0">
                Files
              </div>
              {files.map((file, idx) => (
                <div
                  key={`${file.id}-${idx}`}
                  className="flex items-center gap-1.5 bg-[#f3f4f6] rounded px-2 py-1"
                >
                  <Paperclip size={11} className="text-[#6b7280]" />
                  <span className="text-[11px] text-[#111827]">{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
