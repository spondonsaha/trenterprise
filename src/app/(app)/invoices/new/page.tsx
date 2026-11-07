import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { canOverridePrice, requirePageUser } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { DEFAULT_DUE_DAYS } from "@/lib/constants";
import { addDays, todayDateInput, toDateInputValue } from "@/lib/utils";

export const metadata: Metadata = {
  title: "New invoice",
};

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams?: { mode?: string };
}) {
  const user = await requirePageUser();
  const [products, customers, settings] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, isArchived: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        brand: true,
        color: true,
        piecesPerCarton: true,
        cartonPrice: true,
        piecePrice: true,
        stockPieces: true,
      },
    }),
    prisma.customer.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        contactPerson: true,
      },
    }),
    getSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="New invoice"
        description="Create an itemized sale or a quick invoice for TR Enterprise."
      >
        <Button variant="outline" asChild>
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
        </Button>
      </PageHeader>
      <InvoiceForm
        products={products.map((product) => ({
          ...product,
          cartonPrice: product.cartonPrice.toString(),
          piecePrice: product.piecePrice.toString(),
        }))}
        customers={customers}
        defaultTaxRate={Number(settings.defaultTaxRate)}
        defaultDate={todayDateInput()}
        defaultDueDate={toDateInputValue(addDays(new Date(), DEFAULT_DUE_DAYS))}
        canOverridePrice={canOverridePrice(user)}
        defaultIsQuick={searchParams?.mode === "quick"}
      />
    </>
  );
}
