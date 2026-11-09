import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StockInForm } from "@/components/inventory/stock-in-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Add stock",
};

export default async function StockInPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  await requirePageUser();
  const searchParams = await searchParamsPromise;

  const [products, suppliers] = await Promise.all([
    prisma.product.findMany({
      where: { isArchived: false, active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        piecesPerCarton: true,
        costPrice: true,
        stockPieces: true,
      },
    }),
    prisma.supplier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Add stock"
        description="Enter the cartons or pieces you received. Stock is updated immediately."
      >
        <Button variant="outline" asChild>
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" />
            Back to stock
          </Link>
        </Button>
      </PageHeader>
      <StockInForm
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          piecesPerCarton: product.piecesPerCarton,
          costPrice: Number(product.costPrice),
          stockPieces: product.stockPieces,
        }))}
        suppliers={suppliers}
        defaultProductId={searchParams.productId}
      />
    </>
  );
}
