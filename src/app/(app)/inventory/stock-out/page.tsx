import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StockOutForm } from "@/components/inventory/stock-out-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { getStringParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Stock out",
};

export default async function StockOutPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requirePageUser();
  const requestedProductId = getStringParam(searchParams, "productId") ?? "";

  const [products, settings] = await Promise.all([
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
    getSettings(),
  ]);

  const defaultProductId = products.some((product) => product.id === requestedProductId)
    ? requestedProductId
    : undefined;

  return (
    <>
      <PageHeader
        title="Stock out"
        description="Record damages, samples or manual stock removals without creating a sales invoice."
      >
        <Button variant="outline" asChild>
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" />
            Back to inventory
          </Link>
        </Button>
      </PageHeader>
      <StockOutForm
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          piecesPerCarton: product.piecesPerCarton,
          costPrice: Number(product.costPrice),
          stockPieces: product.stockPieces,
        }))}
        defaultProductId={defaultProductId}
        allowNegative={settings.allowNegativeStock}
      />
    </>
  );
}
