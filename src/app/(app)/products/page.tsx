import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Package, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { CategoryManager } from "@/components/products/category-manager";
import { ProductsTable, type ProductRow } from "@/components/products/products-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { canOverridePrice, requirePageUser } from "@/lib/permissions";
import { getIntParam, getStringParam } from "@/lib/utils";
import { PAGE_SIZE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Products",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All products" },
];

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto sm:min-w-[170px]";

export default async function ProductsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;
  const user = await requirePageUser();
  const canManage = canOverridePrice(user);
  const isAdmin = user.role === "ADMIN";

  const q = (getStringParam(searchParams, "q") ?? "").trim();
  const categoryId = getStringParam(searchParams, "category") ?? "";
  const requestedStatus = getStringParam(searchParams, "status") ?? "active";
  const status = STATUS_OPTIONS.some((option) => option.value === requestedStatus)
    ? requestedStatus
    : "active";
  const page = getIntParam(searchParams, "page", 1);

  const where: Prisma.ProductWhereInput = {};
  if (status === "archived") {
    where.isArchived = true;
  } else {
    where.isArchived = false;
  }
  if (status === "active" || status === "low" || status === "out") where.active = true;
  if (status === "inactive") where.active = false;
  if (status === "low") where.stockPieces = { lte: prisma.product.fields.lowStockPieces };
  if (status === "out") where.stockPieces = { lte: 0 };
  if (categoryId) where.categoryId = categoryId;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { color: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, products, categories] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: { select: { name: true } } },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
  ]);

  const rows: ProductRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    brand: product.brand,
    color: product.color,
    categoryName: product.category?.name ?? null,
    piecesPerCarton: product.piecesPerCarton,
    cartonPrice: Number(product.cartonPrice),
    piecePrice: Number(product.piecePrice),
    stockPieces: product.stockPieces,
    lowStockPieces: product.lowStockPieces,
    active: product.active,
    isArchived: product.isArchived,
  }));

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    productCount: category._count.products,
  }));

  const hasFilters = Boolean(q) || Boolean(categoryId) || status !== "active";

  return (
    <>
      <PageHeader
        title="Products"
        description="Manage the TR Enterprise catalogue of inks, toners and cartridges with carton and piece pricing."
      >
        {canManage ? <CategoryManager categories={categoryOptions} /> : null}
        {canManage ? (
          <Button asChild>
            <Link href="/products/new">
              <Plus className="h-4 w-4" />
              Add product
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      <Card>
        <CardHeader className="gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Product catalogue</CardTitle>
            <CardDescription>
              {total} product{total === 1 ? "" : "s"} · stock is tracked in pieces
            </CardDescription>
          </div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Stock
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>

        <div className="border-b border-border bg-slate-50/60 px-4 py-3">
          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search name, SKU, brand or colour..."
                className="bg-white pl-9"
              />
            </div>
            <select name="category" defaultValue={categoryId} className={selectClass}>
              <option value="">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={status} className={selectClass}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="h-11 px-4">
                <SlidersHorizontal className="h-4 w-4" />
                Apply
              </Button>
              {hasFilters ? (
                <Button type="button" variant="ghost" size="sm" className="h-11 px-3" asChild>
                  <Link href="/products" aria-label="Clear filters">
                    <X className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        {total === 0 && !hasFilters ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first ink, toner or cartridge product to start invoicing and tracking stock."
            action={
              canManage ? (
                <Button asChild>
                  <Link href="/products/new">
                    <Plus className="h-4 w-4" />
                    Add product
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <ProductsTable rows={rows} canManage={canManage} isAdmin={isAdmin} />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              basePath="/products"
              searchParams={searchParams}
            />
          </>
        )}
      </Card>
    </>
  );
}
