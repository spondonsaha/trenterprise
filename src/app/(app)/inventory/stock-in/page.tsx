import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StockInForm } from "@/components/inventory/stock-in-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Stock in",
};

export default async function StockInPage() {
  await requirePageUser();

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
        title="Stock in"
        description="Receive a purchase from a supplier and update carton-level stock and product cost."
      >
        <Button variant="outline" asChild>
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" />
            Back to inventory
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
      />
    </>
  );
}
