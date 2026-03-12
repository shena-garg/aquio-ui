import apiClient from "@/lib/api-client";

export interface CustomAttribute {
  label: string;
  unit: string;
  required: boolean;
  valueType: "text" | "dropdown";
  values?: string;
}

export interface SubCategory {
  _id: string;
  name: string;
  customAttributes?: CustomAttribute[];
}

export interface Category {
  _id: string;
  name: string;
  status: string;
  subCategories: SubCategory[];
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface CreateSubCategoryPayload {
  name: string;
  parentId: string;
  customAttributes: CustomAttribute[];
}

export interface UpdateSubCategoryPayload {
  name: string;
  customAttributes: CustomAttribute[];
}

export const categoriesService = {
  list: () => apiClient.get<CategoriesResponse>("/categories"),
  getById: (id: string) => apiClient.get<Category>(`/categories/${id}`),
  create: (payload: { name: string }) => apiClient.post("/categories", payload),
  update: (id: string, payload: { name: string }) =>
    apiClient.patch(`/categories/${id}`, payload),
  createSubCategory: (payload: CreateSubCategoryPayload) =>
    apiClient.post("/categories", payload),
  getSubCategoryById: (id: string) =>
    apiClient.get<SubCategory>(`/categories/${id}`),
  updateSubCategory: (id: string, payload: UpdateSubCategoryPayload) =>
    apiClient.patch(`/categories/${id}`, payload),
};
