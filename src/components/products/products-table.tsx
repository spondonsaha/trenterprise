"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Archive,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Percent,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockBadge } from "@/components/status-badge";
import { BulkRateDialog } from "@/components/products/bulk-rate-dialog";
import { RateDialog, type RateProduct } from "@/components/products/rate-dialog";
import { archiveProduct, restoreProduct } from "@/app/actions/products";
import { formatMoney } from "@/lib/money";
import { formatStock } from "@/lib/stock-math";
import { cn } from "@/lib/utils";

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  brand: string;
  color: string;
  categoryName: string | null;
  piecesPerCarton: number;
  cartonPrice: number;
  piecePrice: number;
  stockPieces: number;
  lowStockPieces: number;
  active: boolean;
  isArchived: boolean;
};

export function ProductsTable({
  rows,
  canManage,
  isAdmin,
}: {
  rows: ProductRow[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [rateTarget, setRateTarget] = useState<RateProduct | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProductRow | null>(null);
  const [pending, setPending] = useState(false);

  const idsKey = rows.map((row) => row.id).join(",");
  useEffect(() => {
    setRowSelection({});
  }, [idsKey]);

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );

  async function handleArchive() {
    if (!archiveTarget) return;
    setPending(true);
    try {
      const result = archiveTarget.isArchived
        ? await restoreProduct(archiveTarget.id)
        : await archiveProduct(archiveTarget.id);
      if (result.ok) {
        toast.success(
          archiveTarget.isArchived ? "Product restored." : "Product archived.",
        );
        setArchiveTarget(null);
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(false);
    }
  }

  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      ...(canManage
        ? [
            {
              id: "select",
              header: ({ table }) => (
                <input
                  type="checkbox"
                  aria-label="Select all products on this page"
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring"
                  checked={table.getIsAllPageRowsSelected()}
                  onChange={table.getToggleAllPageRowsSelectedHandler()}
                />
              ),
              cell: ({ row }) => (
                <input
                  type="checkbox"
                  aria-label={`Select ${row.original.name}`}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-ring"
                  checked={row.getIsSelected()}
                  disabled={!row.getCanSelect()}
                  onChange={row.getToggleSelectedHandler()}
                />
              ),
              enableSorting: false,
            } as ColumnDef<ProductRow>,
          ]
        : []),
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/products/${row.original.id}`}
              className="block max-w-[240px] truncate font-medium text-slate-900 hover:text-primary"
            >
              {row.original.name}
            </Link>
            <p className="mt-0.5 text-xs text-slate-500">
              {[row.original.sku, row.original.brand, row.original.color]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "categoryName",
        header: "Category",
        cell: ({ row }) => (
          <span className="text-sm text-slate-600">{row.original.categoryName ?? "—"}</span>
        ),
        meta: { className: "hidden lg:table-cell" },
      },
      {
        accessorKey: "stockPieces",
        header: "Stock",
        cell: ({ row }) => (
          <div className="space-y-1">
            <StockBadge
              pieces={row.original.stockPieces}
              lowStockPieces={row.original.lowStockPieces}
            />
            <p className="text-xs text-slate-500">
              {formatStock(row.original.stockPieces, row.original.piecesPerCarton)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "cartonPrice",
        header: "Carton",
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-medium text-slate-900">
            {formatMoney(row.original.cartonPrice)}
          </span>
        ),
      },
      {
        accessorKey: "piecePrice",
        header: "Piece",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-slate-700">
            {formatMoney(row.original.piecePrice)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isArchived ? (
            <Badge variant="muted">Archived</Badge>
          ) : row.original.active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="warning">Inactive</Badge>
          ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const product = row.original;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={`Actions for ${product.name}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href={`/products/${product.id}`}>
                      <Eye className="h-4 w-4" />
                      View details
                    </Link>
                  </DropdownMenuItem>
                  {canManage && !product.isArchived ? (
                    <DropdownMenuItem asChild>
                      <Link href={`/inventory/stock-in?productId=${product.id}`}>
                        <ArrowDownToLine className="h-4 w-4" />
                        Add stock
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  {canManage ? (
                    <DropdownMenuItem asChild>
                      <Link href={`/products/${product.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        Edit product
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  {canManage ? (
                    <DropdownMenuItem
                      onSelect={() =>
                        setRateTarget({
                          id: product.id,
                          name: product.name,
                          sku: product.sku,
                          cartonPrice: product.cartonPrice,
                          piecePrice: product.piecePrice,
                        })
                      }
                    >
                      <Percent className="h-4 w-4" />
                      Change rates
                    </DropdownMenuItem>
                  ) : null}
                  {isAdmin ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className={product.isArchived ? "" : "text-red-600 focus:text-red-700"}
                        onSelect={() => setArchiveTarget(product)}
                      >
                        {product.isArchived ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                        {product.isArchived ? "Restore product" : "Archive product"}
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [canManage, isAdmin],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    state: { sorting, rowSelection },
    enableRowSelection: canManage,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      {selectedIds.length > 0 ? (
        <div className="flex flex-col gap-2 border-b border-teal-100 bg-teal-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-teal-900">
            {selectedIds.length} product{selectedIds.length === 1 ? "" : "s"} selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
            >
              Clear selection
            </Button>
            <BulkRateDialog
              productIds={selectedIds}
              onApplied={() => setRowSelection({})}
            />
          </div>
        </div>
      ) : null}

      <Table className="min-w-[820px]">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-slate-50/70 hover:bg-slate-50/70">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      (header.column.columnDef.meta as { className?: string } | undefined)
                        ?.className,
                      header.id === "select" && "w-10",
                      header.id === "actions" && "w-12",
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-800"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-12 text-center text-slate-500">
                No products match your filters.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn(row.original.isArchived && "opacity-70")}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      (cell.column.columnDef.meta as { className?: string } | undefined)?.className,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <RateDialog
        product={rateTarget}
        open={Boolean(rateTarget)}
        onOpenChange={(open) => {
          if (!open) setRateTarget(null);
        }}
      />

      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archiveTarget?.isArchived ? "Restore this product?" : "Archive this product?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.isArchived
                ? `${archiveTarget.name} will become available again for new invoices.`
                : `${archiveTarget?.name ?? "This product"} will be hidden from new invoices but keep its history. You can restore it later.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant={archiveTarget?.isArchived ? "default" : "destructive"}
              onClick={handleArchive}
              disabled={pending}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {archiveTarget?.isArchived ? "Restore product" : "Archive product"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
