import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Button } from "@/components/ui/button";
import { requirePageAdmin } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Add supplier",
};

export default async function NewSupplierPage() {
  await requirePageAdmin();
  return (
    <>
      <PageHeader
        title="Add supplier"
        description="Create a vendor record for purchasing and stock-in."
      >
        <Button variant="outline" asChild>
          <Link href="/suppliers">
            <ArrowLeft className="h-4 w-4" />
            Back to suppliers
          </Link>
        </Button>
      </PageHeader>
      <SupplierForm />
    </>
  );
}
