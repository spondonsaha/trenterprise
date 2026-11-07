import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requirePageAdmin } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Edit supplier",
};

export default async function EditSupplierPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await paramsPromise;
  await requirePageAdmin();
  const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!supplier) notFound();

  return (
    <>
      <PageHeader
        title="Edit supplier"
        description={`Update contact and purchasing details for ${supplier.name}.`}
      >
        <Button variant="outline" asChild>
          <Link href="/suppliers">
            <ArrowLeft className="h-4 w-4" />
            Back to suppliers
          </Link>
        </Button>
      </PageHeader>
      <SupplierForm
        initial={{
          id: supplier.id,
          name: supplier.name,
          contactPerson: supplier.contactPerson ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          notes: supplier.notes ?? "",
          active: supplier.active,
        }}
      />
    </>
  );
}
