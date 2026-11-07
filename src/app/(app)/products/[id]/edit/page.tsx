import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { canOverridePrice, requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Edit product",
};

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const user = await requirePageUser();
  if (!canOverridePrice(user)) redirect(`/products/${params.id}`);

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!product) notFound();

  return (
    <>
      <PageHeader
        title="Edit product"
        description={`Update catalogue details and pricing for ${product.name}.`}
      >
        <Button variant="outline" asChild>
          <Link href={`/products/${product.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to product
          </Link>
        </Button>
      </PageHeader>
      <ProductForm
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          categoryId: product.categoryId ?? "",
          brand: product.brand,
          color: product.color,
          description: product.description ?? "",
          active: product.active,
          piecesPerCarton: product.piecesPerCarton,
          cartonPrice: Number(product.cartonPrice),
          piecePrice: Number(product.piecePrice),
          costPrice: Number(product.costPrice),
          lowStockPieces: product.lowStockPieces,
        }}
      />
    </>
  );
}
