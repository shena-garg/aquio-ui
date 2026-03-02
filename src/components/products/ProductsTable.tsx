"use client";

import { CSSProperties, Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Product } from "@/services/products";
import { productsService } from "@/services/products";

// ── Column widths (px) for sticky offset calculation ──────────────────────────

const ACTIONS_COL_WIDTH = 50;

const COL_WIDTH: Record<string, number> = {
  sku: 130,
  name: 180,
  categoryName: 140,
  subCategoryName: 140,
  gst: 80,
  unitOfMeasurement: 100,
  hsnCode: 120,
  variants: 200,
};

// ── Column definitions ────────────────────────────────────────────────────────

const TH = "px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400";

interface Sticky {
  headCls: string;
  cellCls: string;
  style: CSSProperties;
}

const NO_STICKY: Sticky = { headCls: "", cellCls: "", style: {} };

interface ColDef {
  key: string;
  width: number;
  renderHead: (s: Sticky) => React.ReactNode;
  renderCell: (product: Product, s: Sticky) => React.ReactNode;
}

const COLUMN_DEFS: ColDef[] = [
  {
    key: "sku",
    width: COL_WIDTH.sku,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Product Code</TableHead>
    ),
    renderCell: (product, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {product.sku?.trim() ? product.sku : "—"}
      </TableCell>
    ),
  },
  {
    key: "name",
    width: COL_WIDTH.name,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Product Name</TableHead>
    ),
    renderCell: (product, { cellCls, style }) => (
      <TableCell className={`px-3 ${cellCls}`} style={style}>
        <span className="text-[13px] font-medium text-[#0F1720]">
          {product.name}
        </span>
      </TableCell>
    ),
  },
  {
    key: "categoryName",
    width: COL_WIDTH.categoryName,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Category</TableHead>
    ),
    renderCell: (product, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {product.categoryName || "—"}
      </TableCell>
    ),
  },
  {
    key: "subCategoryName",
    width: COL_WIDTH.subCategoryName,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Subcategory</TableHead>
    ),
    renderCell: (product, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {product.subCategoryName || "—"}
      </TableCell>
    ),
  },
  {
    key: "gst",
    width: COL_WIDTH.gst,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>GST</TableHead>
    ),
    renderCell: (product, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {product.gst}%
      </TableCell>
    ),
  },
  {
    key: "unitOfMeasurement",
    width: COL_WIDTH.unitOfMeasurement,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Unit</TableHead>
    ),
    renderCell: (product, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {product.unitOfMeasurement || "—"}
      </TableCell>
    ),
  },
  {
    key: "hsnCode",
    width: COL_WIDTH.hsnCode,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>HSN Code</TableHead>
    ),
    renderCell: (product, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {product.hsnCode || "—"}
      </TableCell>
    ),
  },
  {
    key: "variants",
    width: COL_WIDTH.variants,
    renderHead: ({ headCls, style }) => (
      <TableHead className={`${TH} ${headCls}`} style={style}>Variants</TableHead>
    ),
    renderCell: (product, { cellCls, style }) => (
      <TableCell className={`px-3 text-[13px] text-gray-600 ${cellCls}`} style={style}>
        {product.variants.length > 0
          ? product.variants.map((v) => v.name).join(", ")
          : "—"}
      </TableCell>
    ),
  },
];

const DEFAULT_ORDER = COLUMN_DEFS.map((c) => c.key);
const DEFAULT_VISIBLE = COLUMN_DEFS.map((c) => c.key);

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <TableRow className="animate-pulse">
      <TableCell className="w-[50px]">
        <div className="h-6 w-6 rounded bg-gray-200" />
      </TableCell>
      {Array.from({ length: colCount }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-3.5 w-24 rounded bg-gray-200" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
  activeTab: "active" | "inactive";
  onRefresh: () => void;
  visibleColumns?: string[];
  columnOrder?: string[];
  frozenCount?: number;
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProductsTable({
  products,
  isLoading,
  activeTab,
  onRefresh,
  visibleColumns = DEFAULT_VISIBLE,
  columnOrder = DEFAULT_ORDER,
  frozenCount = 0,
}: ProductsTableProps) {
  const router = useRouter();
  const [archiveProduct, setArchiveProduct] = useState<Product | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Build the ordered, filtered list of active columns
  const activeCols = columnOrder
    .map((key) => COLUMN_DEFS.find((c) => c.key === key))
    .filter((col): col is ColDef => col != null && visibleColumns.includes(col.key));

  // Compute sticky properties for a given active column index
  function getStickyFor(index: number): Sticky {
    if (index >= frozenCount) return NO_STICKY;
    let left = ACTIONS_COL_WIDTH;
    for (let i = 0; i < index; i++) {
      left += activeCols[i].width;
    }
    return {
      headCls: "sticky z-20 bg-gray-50",
      cellCls: "sticky z-10 bg-white group-hover:bg-gray-50",
      style: { left },
    };
  }

  const totalCols = activeCols.length + 1; // +1 for actions column

  async function handleArchive() {
    if (!archiveProduct) return;
    setIsArchiving(true);
    try {
      await productsService.archive(archiveProduct._id);
      toast.success(`${archiveProduct.name} has been archived`);
      setArchiveProduct(null);
      onRefresh();
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to archive product";
      toast.error(message);
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <>
      <div className="w-full overflow-x-auto bg-white border border-gray-200 rounded-md">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              {/* Actions — always sticky at left: 0 */}
              <TableHead
                className="w-[50px] px-3 sticky z-20 bg-gray-50"
                style={{ left: 0 }}
              />
              {activeCols.map((col, i) => (
                <Fragment key={col.key}>
                  {col.renderHead(getStickyFor(i))}
                </Fragment>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} colCount={activeCols.length} />
              ))
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalCols}
                  className="h-32 text-center text-[13px] text-gray-400"
                >
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product._id}
                  className="group border-b border-gray-100 hover:bg-gray-50"
                >
                  {/* Actions — always sticky at left: 0 */}
                  <TableCell
                    className="w-[50px] px-3 sticky z-10 bg-white group-hover:bg-gray-50"
                    style={{ left: 0 }}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#0F1720]"
                          aria-label="More actions"
                        >
                          <MoreHorizontal className="h-[15px] w-[15px]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        {activeTab === "active" ? (
                          <>
                            <DropdownMenuItem
                              onClick={() => router.push(`/products/${product._id}/edit`)}
                            >
                              Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/products/new?duplicateFrom=${product._id}`)}
                            >
                              Create Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setArchiveProduct(product)}
                              className="text-[#DC2626] focus:text-[#DC2626]"
                            >
                              Archive
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => router.push(`/products/new?duplicateFrom=${product._id}`)}
                          >
                            Create Duplicate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>

                  {activeCols.map((col, i) => (
                    <Fragment key={col.key}>
                      {col.renderCell(product, getStickyFor(i))}
                    </Fragment>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Archive confirmation dialog */}
      <AlertDialog
        open={!!archiveProduct}
        onOpenChange={(open) => {
          if (!open) setArchiveProduct(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive {archiveProduct?.name}? Archiving
              will remove it from product listings but will not permanently delete
              it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-[#DC2626] text-white hover:bg-[#B91C1C]"
            >
              {isArchiving ? "Archiving…" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
