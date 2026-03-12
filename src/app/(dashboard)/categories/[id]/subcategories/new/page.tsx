"use client";

import { use } from "react";
import { SubCategoryForm } from "@/components/categories/SubCategoryForm";

export default function CreateSubCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SubCategoryForm parentCategoryId={id} />;
}
