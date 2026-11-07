import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { canOverridePrice, requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Add product",
};

export default async function NewProductPage() {
  const user = await requirePageUser();
  if (!canOverridePrice(user)) redirect("/products");

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <PageHeader
        title="Add product"
        description="Create a new catalogue item with carton pricing, piece pricing and a low-stock level."
      >
        <Button variant="outline" asChild>
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
            Back to products
          </Link>
        </Button>
      </PageHeader>
      <ProductForm categories={categories} />
    </>
  );
}
