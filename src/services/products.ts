import apiClient from "@/lib/api-client";

export interface ProductVariant {
  _id: string;
  name: string;
  customAttributes: any[];
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  hsnCode: string;
  categoryId: string;
  subCategoryId: string;
  categoryName: string;
  subCategoryName: string;
  unitOfMeasurement: string;
  gst: number;
  status: "active" | "inactive";
  variants: ProductVariant[];
  createdAt: string;
}

export interface ProductsResponse {
  products: Product[];
  totalCount: number;
}

export const productsService = {
  list: (params: {
    page: number;
    limit: number;
    status: "active" | "inactive";
    name?: string;
    sku?: string;
    categoryId?: string;
    subCategoryId?: string;
  }) => apiClient.get<ProductsResponse>("/products", { params }),
  archive: (id: string) => apiClient.delete(`/products/${id}`),
};
