import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { canOverridePrice, requirePageUser } from "@/lib/permissions";
import { computeInvoiceTotals } from "@/lib/invoice-calc";
import { toDateInputValue } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Edit invoice",
};

export default async function EditInvoicePage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await paramsPromise;
  const user = await requirePageUser();
  const [invoice, products, customers] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: params.id },
      include: { items: { orderBy: { id: "asc" } } },
    }),
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
  ]);
  if (!invoice) notFound();

  const computed = computeInvoiceTotals({
    items: invoice.items.map((item) => ({
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      piecesPerCarton: item.piecesPerCarton,
    })),
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    taxRate: invoice.taxRate,
    shipping: invoice.shipping,
    manualTotal: null,
  });
  const hasOverride = !invoice.isQuick && Number(invoice.total) !== Number(computed.calculatedTotal);

  return (
    <>
      <PageHeader
        title={`Edit ${invoice.invoiceNumber}`}
        description={
          invoice.status === "DRAFT"
            ? "This draft has no stock effect until finalized."
            : "Saving will reverse the previous stock effect and apply the new lines."
        }
      >
        <Button variant="outline" asChild>
          <Link href={`/invoices/${invoice.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to invoice
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
        defaultTaxRate={Number(invoice.taxRate)}
        defaultDate={toDateInputValue(invoice.date)}
        defaultDueDate={toDateInputValue(invoice.dueDate)}
        canOverridePrice={canOverridePrice(user)}
        initialStatus={invoice.status}
        initial={{
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          isQuick: invoice.isQuick,
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone ?? "",
          customerEmail: invoice.customerEmail ?? "",
          customerAddress: invoice.customerAddress ?? "",
          date: toDateInputValue(invoice.date),
          dueDate: toDateInputValue(invoice.dueDate),
          paymentStatus: "UNPAID",
          amountPaid: 0,
          items: invoice.items.map((item) => ({
            productId: item.productId ?? "",
            description: item.description,
            unit: item.unit === "CARTON" ? "CARTON" : "PIECE",
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            piecesPerCarton: item.piecesPerCarton,
          })),
          discountType: invoice.discountType === "PERCENT" ? "PERCENT" : "AMOUNT",
          discountValue: Number(invoice.discountValue),
          taxRate: Number(invoice.taxRate),
          shipping: Number(invoice.shipping),
          manualTotal: invoice.isQuick
            ? Number(invoice.total)
            : hasOverride
              ? Number(invoice.total)
              : null,
          notes: invoice.notes ?? "",
          terms: invoice.terms ?? "",
        }}
      />
    </>
  );
}
