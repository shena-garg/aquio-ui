import type { Product } from "@/services/products";

interface ProductDetailsInfoCardProps {
  product: Product;
}

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

export function ProductDetailsInfoCard({ product }: ProductDetailsInfoCardProps) {
  return (
    <div className="mx-8 mt-3">
      <div className="rounded-[10px] border border-[#e5e7eb] bg-white px-4 pt-[10px] pb-2">
        {/* Row 1 */}
        <div className="grid grid-cols-3 gap-4">
          <Cell label="Product Code / SKU" value={product.sku} />
          <Cell label="Category" value={product.categoryName} />
          <Cell label="Subcategory" value={product.subCategoryName} />
        </div>
        {/* Row 2 */}
        <div className="grid grid-cols-3 gap-4 border-t border-[#e5e7eb] pt-2 mt-2">
          <Cell label="HSN Code" value={product.hsnCode} />
          <Cell label="GST" value={`${product.gst}%`} />
          <Cell label="Unit of Measurement" value={product.unitOfMeasurement} />
        </div>
      </div>
    </div>
  );
}
