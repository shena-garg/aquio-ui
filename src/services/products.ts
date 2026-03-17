import apiClient from "@/lib/api-client";

export interface ProductCustomAttribute {
  label: string;
  unit: string;
  value: string;
  _id: string;
}

export interface ProductVariant {
  _id: string;
  name: string;
  customAttributes: ProductCustomAttribute[];
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
  status: "active" | "inactive" | "archived";
  description?: string;
  termsOfConditions?: string[];
  variants: ProductVariant[];
  files?: { id: string; name: string }[];
  createdAt: string;
}

export interface ProductsResponse {
  products: Product[];
  totalCount: number;
}

export interface CreateProductPayload {
  name: string;
  unitOfMeasurement: string;
  categoryId: string;
  subCategoryId: string;
  hsnCode: string;
  gst: number;
  description?: string;
  termsOfConditions?: string[];
  files?: { id: string; name: string }[];
  variants: {
    name: string;
    customAttributes: { label: string; unit: string; value?: string }[];
  }[];
}

export const productsService = {
  create: (payload: CreateProductPayload) =>
    apiClient.post<Product>("/products", payload),

  getById: (id: string) =>
    apiClient.get<Product>(`/products/${id}`).then((r) => r.data),

  list: (params: {
    page: number;
    limit: number;
    status: "active" | "inactive";
    name?: string;
    sku?: string;
    categoryId?: string;
    subCategoryId?: string;
  }) => apiClient.get<ProductsResponse>("/products", { params }),

  update: (id: string, payload: CreateProductPayload) =>
    apiClient.patch<Product>(`/products/${id}`, payload),

  archive: (id: string) => apiClient.delete(`/products/${id}`),

  getProcurementAnalytics: async (params: {
    productId: string;
    variantId: string;
    fromDate: string;
    toDate: string;
  }) => {
    const response = await apiClient.get(
      "/purchase-orders/analytics/product-procurement",
      { params },
    );
    return response.data;
  },

  getSalesAnalytics: async (params: {
    productId: string;
    variantId: string;
    fromDate: string;
    toDate: string;
  }) => {
    const response = await apiClient.get(
      "/purchase-orders/analytics/product-sales",
      { params },
    );
    return response.data;
  },

  getMarginAnalytics: async (params: {
    productId: string;
    variantId: string;
    fromDate: string;
    toDate: string;
  }) => {
    const response = await apiClient.get(
      "/purchase-orders/analytics/product-margin",
      { params },
    );
    return response.data;
  },
};
