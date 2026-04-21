"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { categoriesService, type Category } from "@/services/categories";
import { organizationSettingsService, type OrganizationSettings } from "@/services/organization-settings";
import { productsService } from "@/services/products";
import { QuickCreateCategoryModal } from "@/components/categories/QuickCreateCategoryModal";

// ── UOM list ──────────────────────────────────────────────────────────────────

const UOM_LIST = [
  "Piece", "Unit", "Each", "Nos", "Pack", "Box", "Carton", "Case", "Dozen", "Bag", "Set",
  "Kilogram", "Gram", "Metric Ton", "Ton",
  "Liter", "Milliliter",
  "Meter", "Centimeter", "Kilometer",
  "Square Meter", "Cubic Meter",
  "Roll", "Bundle", "Bottle", "Drum", "Can", "Reel", "Sheet", "Coil",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface FieldErrors {
  name?: string;
  categoryId?: string;
  subCategoryId?: string;
  unitOfMeasurement?: string;
  sku?: string;
  hsnCode?: string;
  gst?: string;
}

interface QuickCreateProductModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (created: { _id: string; name: string }) => void;
  initialName?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuickCreateProductModal({ open, onClose, onCreated, initialName }: QuickCreateProductModalProps) {
  const queryClient = useQueryClient();

  // Bootstrap data
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setBootstrapLoading(true);
    Promise.all([
      categoriesService.list().then((r) => r.data),
      organizationSettingsService.getMyOwn().then((r) => r.data),
    ])
      .then(([catData, settingsData]) => {
        setCategories(catData.categories ?? []);
        setSettings(settingsData);
      })
      .catch(() => toast.error("Failed to load form data"))
      .finally(() => setBootstrapLoading(false));
  }, [open]);

  // Form state
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [unitOfMeasurement, setUnitOfMeasurement] = useState("");
  const [sku, setSku] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [gst, setGst] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<
    { mode: "category" } | { mode: "subcategory"; parentId: string; parentName: string } | null
  >(null);

  const selectedCategory = categories.find((c) => c._id === categoryId);
  const subCategories = selectedCategory?.subCategories ?? [];
  const autoSku = settings?.generateSKUAutomatically ?? false;

  // Pre-fill name when opened from product search
  useEffect(() => {
    if (open && initialName) setName(initialName);
  }, [open, initialName]);

  function reset() {
    setName(""); setCategoryId(""); setSubCategoryId(""); setUnitOfMeasurement("");
    setSku(""); setHsnCode(""); setGst(""); setErrors({}); setIsSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    setSubCategoryId("");
  }

  async function handleSubmit() {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "Product name is required";
    if (!categoryId) errs.categoryId = "Category is required";
    if (!subCategoryId) errs.subCategoryId = "Subcategory is required";
    if (!unitOfMeasurement) errs.unitOfMeasurement = "Unit of measurement is required";
    if (!autoSku && !sku.trim()) errs.sku = "SKU is required";
    if (!hsnCode.trim()) errs.hsnCode = "HSN code is required";
    if (!gst) errs.gst = "GST rate is required";

    setErrors(errs);
    if (Object.keys(errs).length > 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data: created } = await productsService.create({
        name: name.trim(),
        categoryId,
        subCategoryId,
        unitOfMeasurement,
        hsnCode: hsnCode.trim(),
        gst: parseFloat(gst),
        ...(autoSku ? {} : { sku: sku.trim() }),
        variants: [{ name: "Default", customAttributes: [] }],
      } as Parameters<typeof productsService.create>[0]);

      toast.success("Product created successfully");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      onCreated({ _id: created._id, name: created.name });
      handleClose();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create product";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = (error?: string) =>
    `w-full border ${error ? "border-[#dc2626]" : "border-gray-300"} rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488]`;

  const selectClass = (error?: string) =>
    `w-full border ${error ? "border-[#dc2626]" : "border-gray-300"} rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0d9488] focus:border-[#0d9488] bg-white`;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent showCloseButton={false} className="max-w-[520px] p-0 gap-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <DialogTitle className="text-base font-semibold text-gray-900">New Product</DialogTitle>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          {bootstrapLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#0d9488]" />
            </div>
          ) : (
            <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input type="text" placeholder="e.g. Steel Pipes" value={name} autoFocus
                  onChange={(e) => setName(e.target.value)} className={inputClass(errors.name)} />
                {errors.name && <p className="text-[12px] text-[#dc2626] mt-1">{errors.name}</p>}
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCategoryModalMode({ mode: "category" })}
                    className="text-[12px] text-[#0d9488] hover:underline"
                  >
                    + New Category
                  </button>
                </div>
                <select value={categoryId} onChange={(e) => handleCategoryChange(e.target.value)} className={selectClass(errors.categoryId)}>
                  <option value="">Select category</option>
                  {categories.filter((c) => !c.parentId).map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-[12px] text-[#dc2626] mt-1">{errors.categoryId}</p>}
              </div>

              {/* Subcategory */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Subcategory <span className="text-red-500">*</span>
                  </label>
                  {categoryId && (
                    <button
                      type="button"
                      onClick={() => setCategoryModalMode({ mode: "subcategory", parentId: categoryId, parentName: selectedCategory?.name ?? "" })}
                      className="text-[12px] text-[#0d9488] hover:underline"
                    >
                      + New Subcategory
                    </button>
                  )}
                </div>
                <select value={subCategoryId} onChange={(e) => setSubCategoryId(e.target.value)}
                  disabled={!categoryId} className={selectClass(errors.subCategoryId)}>
                  <option value="">{categoryId ? "Select subcategory" : "Select a category first"}</option>
                  {subCategories.map((sc) => (
                    <option key={sc._id} value={sc._id}>{sc.name}</option>
                  ))}
                </select>
                {errors.subCategoryId && <p className="text-[12px] text-[#dc2626] mt-1">{errors.subCategoryId}</p>}
              </div>

              {/* Unit of Measurement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Unit of Measurement <span className="text-red-500">*</span>
                </label>
                <select value={unitOfMeasurement} onChange={(e) => setUnitOfMeasurement(e.target.value)} className={selectClass(errors.unitOfMeasurement)}>
                  <option value="">Select unit</option>
                  {UOM_LIST.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                {errors.unitOfMeasurement && <p className="text-[12px] text-[#dc2626] mt-1">{errors.unitOfMeasurement}</p>}
              </div>

              {/* SKU + HSN side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    SKU {autoSku ? <span className="text-[11px] text-gray-400 font-normal">(auto)</span> : <span className="text-red-500">*</span>}
                  </label>
                  <input type="text" placeholder={autoSku ? "Auto-generated" : "e.g. STL-001"} value={sku}
                    disabled={autoSku} onChange={(e) => setSku(e.target.value)}
                    className={`${inputClass(errors.sku)} ${autoSku ? "opacity-50 cursor-not-allowed" : ""}`} />
                  {errors.sku && <p className="text-[12px] text-[#dc2626] mt-1">{errors.sku}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    HSN Code <span className="text-red-500">*</span>
                  </label>
                  <input type="text" placeholder="e.g. 7217" value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)} className={inputClass(errors.hsnCode)} />
                  {errors.hsnCode && <p className="text-[12px] text-[#dc2626] mt-1">{errors.hsnCode}</p>}
                </div>
              </div>

              {/* GST */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  GST Rate <span className="text-red-500">*</span>
                </label>
                {settings?.applicableGst && settings.applicableGst.length > 0 ? (
                  <select value={gst} onChange={(e) => setGst(e.target.value)} className={selectClass(errors.gst)}>
                    <option value="">Select GST rate</option>
                    {settings.applicableGst.map((rate) => (
                      <option key={rate} value={String(rate)}>{rate}%</option>
                    ))}
                  </select>
                ) : (
                  <input type="number" placeholder="e.g. 18" min="0" max="100" value={gst}
                    onChange={(e) => setGst(e.target.value)} className={inputClass(errors.gst)} />
                )}
                {errors.gst && <p className="text-[12px] text-[#dc2626] mt-1">{errors.gst}</p>}
              </div>

              <p className="text-[11px] text-gray-400">
                A &quot;Default&quot; variant will be created automatically. You can add more variants from the product page.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="border-gray-200 text-gray-600">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || bootstrapLoading} className="bg-[#0d9488] hover:bg-[#0f766e] text-white">
              {isSubmitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Create Product
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick create category/subcategory from within product modal */}
      <QuickCreateCategoryModal
        open={!!categoryModalMode}
        onClose={() => setCategoryModalMode(null)}
        mode={categoryModalMode?.mode ?? "category"}
        parentCategoryId={categoryModalMode?.mode === "subcategory" ? categoryModalMode.parentId : undefined}
        parentCategoryName={categoryModalMode?.mode === "subcategory" ? categoryModalMode.parentName : undefined}
        onCreated={(created) => {
          setCategoryModalMode(null);
          if (categoryModalMode?.mode === "subcategory") {
            setSubCategoryId(created._id);
            setCategories((prev) => prev.map((c) =>
              c._id === categoryId
                ? { ...c, subCategories: [...(c.subCategories ?? []), { _id: created._id, name: created.name, customAttributes: [] }] }
                : c
            ));
          } else {
            setCategoryId(created._id);
            setSubCategoryId("");
            setCategories((prev) => [...prev, { _id: created._id, name: created.name, parentId: null, subCategories: [] } as Category]);
          }
        }}
      />
    </>
  );
}
