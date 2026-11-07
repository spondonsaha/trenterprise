import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AdjustStockForm } from "@/components/inventory/adjust-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/permissions";
import { getStringParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Adjust stock",
};

export default async function AdjustStockPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;
  await requirePageUser();
  const requestedProductId = getStringParam(searchParams, "productId") ?? "";

  const products = await prisma.product.findMany({
    where: { isArchived: false },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      piecesPerCarton: true,
      costPrice: true,
      stockPieces: true,
    },
  });

  const defaultProductId = products.some((product) => product.id === requestedProductId)
    ? requestedProductId
    : undefined;

  return (
    <>
      <PageHeader
        title="Adjust stock"
        description="Set the system stock to match a physical count. Every adjustment is written to the ledger."
      >
        <Button variant="outline" asChild>
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" />
            Back to inventory
          </Link>
        </Button>
      </PageHeader>
      <AdjustStockForm
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          piecesPerCarton: product.piecesPerCarton,
          costPrice: Number(product.costPrice),
          stockPieces: product.stockPieces,
        }))}
        defaultProductId={defaultProductId}
      />
    </>
  );
}
