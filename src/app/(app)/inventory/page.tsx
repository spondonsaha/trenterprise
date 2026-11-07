import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ClipboardList,
  Package,
  Search,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { StockBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { formatStock, stockValue } from "@/lib/stock-math";
import { MOVEMENT_TYPE_LABELS, PAGE_SIZE } from "@/lib/constants";
import { formatDate, formatDateTime, getIntParam, getStringParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Inventory",
};

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto sm:min-w-[160px]";

export default async function InventoryPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;
  const user = await requirePageUser();
  const q = (getStringParam(searchParams, "q") ?? "").trim();
  const requestedStatus = getStringParam(searchParams, "status") ?? "all";
  const status = ["all", "low", "out"].includes(requestedStatus) ? requestedStatus : "all";
  const page = getIntParam(searchParams, "page", 1);

  const where: Prisma.ProductWhereInput = { active: true, isArchived: false };
  if (status === "low") where.stockPieces = { lte: prisma.product.fields.lowStockPieces };
  if (status === "out") where.stockPieces = { lte: 0 };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
    ];
  }

  const [stocked, inventoryValueRows, total, products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, isArchived: false },
      select: { stockPieces: true, lowStockPieces: true },
    }),
    prisma.product.findMany({
      where: { active: true, isArchived: false },
      select: { stockPieces: true, costPrice: true },
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ stockPieces: "asc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: { select: { name: true } } },
    }),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        product: { select: { id: true, name: true, piecesPerCarton: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  const activeSkus = stocked.length;
  const lowCount = stocked.filter(
    (product) => product.stockPieces <= product.lowStockPieces && product.stockPieces > 0,
  ).length;
  const outCount = stocked.filter((product) => product.stockPieces <= 0).length;
  const totalValue = inventoryValueRows.reduce(
    (sum, product) => sum + stockValue(product.stockPieces, product.costPrice.toString()),
    0,
  );

  const hasFilters = Boolean(q) || status !== "all";

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Live carton and piece stock levels, purchasing and stock movement history for TR Enterprise."
      >
        {user.role === "ADMIN" ? (
          <Button variant="outline" asChild>
            <Link href="/suppliers">
              <Truck className="h-4 w-4" />
              Suppliers
            </Link>
          </Button>
        ) : null}
        <Button variant="outline" asChild>
          <Link href="/inventory/adjust">
            <ClipboardList className="h-4 w-4" />
            Adjust
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/inventory/stock-out">
            <ArrowUpFromLine className="h-4 w-4" />
            Stock out
          </Link>
        </Button>
        <Button asChild>
          <Link href="/inventory/stock-in">
            <ArrowDownToLine className="h-4 w-4" />
            Stock in
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Stock value"
          value={formatMoney(totalValue)}
          hint="At cost per piece"
          icon={Boxes}
          tone="blue"
        />
        <StatCard
          title="Active SKUs"
          value={String(activeSkus)}
          hint="Products available for sale"
          icon={Package}
          tone="teal"
        />
        <StatCard
          title="Low stock"
          value={String(lowCount)}
          hint="At or below reorder level"
          icon={Package}
          tone={lowCount > 0 ? "amber" : "green"}
        />
        <StatCard
          title="Out of stock"
          value={String(outCount)}
          hint="Needs immediate restock"
          icon={Package}
          tone={outCount > 0 ? "red" : "green"}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Stock on hand</CardTitle>
            <CardDescription>
              {total} product{total === 1 ? "" : "s"} matching your filters.
            </CardDescription>
          </CardHeader>
          <div className="border-y border-border bg-slate-50/60 px-4 py-3">
            <form method="get" className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search product, SKU or brand..."
                  className="bg-white pl-9"
                />
              </div>
              <select name="status" defaultValue={status} className={selectClass}>
                <option value="all">All stock levels</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="h-11 px-4">
                  <SlidersHorizontal className="h-4 w-4" />
                  Apply
                </Button>
                {hasFilters ? (
                  <Button type="button" variant="ghost" size="sm" className="h-11 px-3" asChild>
                    <Link href="/inventory" aria-label="Clear filters">
                      <X className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </form>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Product</th>
                    <th className="px-5 py-3 font-medium">Stock</th>
                    <th className="px-5 py-3 font-medium">Reorder at</th>
                    <th className="px-5 py-3 font-medium">Value</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                        No products match your filters.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <Link
                            href={`/products/${product.id}`}
                            className="block max-w-[220px] truncate font-medium text-slate-900 hover:text-primary"
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {product.sku} · {product.category?.name ?? "Uncategorised"}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">
                            {formatStock(product.stockPieces, product.piecesPerCarton)}
                          </p>
                          <p className="text-xs text-slate-500">{product.stockPieces} pcs</p>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{product.lowStockPieces} pcs</td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-700">
                          {formatMoney(
                            stockValue(product.stockPieces, product.costPrice.toString()),
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <StockBadge
                            pieces={product.stockPieces}
                            lowStockPieces={product.lowStockPieces}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/inventory/stock-out?productId=${product.id}`}>
                                Stock out
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/inventory/adjust?productId=${product.id}`}>Adjust</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              basePath="/inventory"
              searchParams={searchParams}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent movements</CardTitle>
            <CardDescription>Latest stock ledger entries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {movements.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No stock movements recorded yet.
              </p>
            ) : (
              movements.map((movement) => (
                <div key={movement.id} className="flex items-start gap-3">
                  <Badge
                    variant={
                      movement.quantityPieces > 0
                        ? "success"
                        : movement.type === "ADJUSTMENT"
                          ? "warning"
                          : "danger"
                    }
                    className="mt-0.5 shrink-0"
                  >
                    {MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${movement.product.id}`}
                      className="block truncate text-sm font-medium text-slate-900 hover:text-primary"
                    >
                      {movement.product.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {movement.quantityPieces > 0 ? "+" : "−"}
                      {Math.abs(movement.quantityPieces)} pcs ·{" "}
                      {formatDateTime(movement.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/reports?type=stock-movements">View movement report</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Boxes className="h-3.5 w-3.5" />
        Stock is stored in pieces. Cartons are converted using each product&apos;s pieces per
        carton. Last refreshed {formatDate(new Date())}.
      </p>
    </>
  );
}
