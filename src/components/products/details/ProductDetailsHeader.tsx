"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Product } from "@/services/products";
import { productsService } from "@/services/products";

const statusBadgeStyles: Record<string, string> = {
  active: "bg-[#d1fae5] text-[#065f46]",
  inactive: "bg-[#f3f4f6] text-[#374151]",
  archived: "bg-[#fee2e2] text-[#b91c1c]",
};

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface ProductDetailsHeaderProps {
  product: Product;
}

export function ProductDetailsHeader({ product }: ProductDetailsHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isArchiving, setIsArchiving] = useState(false);

  async function handleArchive() {
    setIsArchiving(true);
    try {
      await productsService.archive(product._id);
      toast.success(`${product.name} has been archived`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push("/products");
    } catch {
      toast.error("Failed to archive product");
    } finally {
      setIsArchiving(false);
    }
  }

  const leftContent = (
    <span
      className={`inline-flex items-center rounded-[6px] px-2 h-6 text-[12px] font-medium ${statusBadgeStyles[product.status] ?? ""}`}
    >
      {capitalize(product.status)}
    </span>
  );

  const rightContent = (
    <div className="flex items-center gap-2">
      {product.status === "active" && (
        <Button
          variant="outline"
          className="h-9 px-3.5 rounded-[6px] text-[13px] font-medium"
          onClick={() => router.push(`/products/${product._id}/edit`)}
        >
          Edit
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-9 w-9 rounded-[6px] p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => router.push(`/products/new?duplicateFrom=${product._id}`)}
          >
            Create Duplicate
          </DropdownMenuItem>
          {product.status === "active" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleArchive}
                disabled={isArchiving}
                className="text-[#DC2626] focus:text-[#DC2626]"
              >
                {isArchiving ? "Archiving…" : "Archive"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <PageHeader
      title={product.name}
      left={leftContent}
      right={rightContent}
    />
  );
}
