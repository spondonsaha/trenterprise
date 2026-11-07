import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { InvoicePdf, type InvoicePdfData } from "@/lib/pdf/invoice-pdf";
import { formatAmount } from "@/lib/money";
import { COMPANY_SLUG, INVOICE_STATUS_LABELS } from "@/lib/constants";
import { formatDate, sanitizeFileName } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!invoice) return new Response("Invoice not found", { status: 404 });

  const settings = await getSettings();

  const data: InvoicePdfData = {
    invoiceNumber: invoice.invoiceNumber,
    dateLabel: formatDate(invoice.date),
    dueDateLabel: invoice.dueDate ? formatDate(invoice.dueDate) : null,
    statusLabel: INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status,
    cancelled: invoice.status === "CANCELLED",
    isQuick: invoice.isQuick,
    company: {
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      logoUrl: settings.logoUrl,
      currency: settings.currency,
      footerNote: settings.invoiceFooterNote,
    },
    customer: {
      name: invoice.customerName,
      phone: invoice.customerPhone,
      email: invoice.customerEmail,
      address: invoice.customerAddress,
    },
    items: invoice.items.map((item) => ({
      description: item.description,
      unitLabel: item.unit === "CARTON" ? "Carton" : "Piece",
      quantity: item.quantity,
      unitPrice: formatAmount(item.unitPrice),
      lineTotal: formatAmount(item.lineTotal),
    })),
    subtotal: formatAmount(invoice.subtotal),
    discountAmount: formatAmount(invoice.discountAmount),
    discountLabel:
      invoice.discountType === "PERCENT"
        ? `Discount (${formatAmount(invoice.discountValue)}%)`
        : "Discount",
    taxAmount: formatAmount(invoice.taxAmount),
    taxLabel: `Tax (${formatAmount(invoice.taxRate)}%)`,
    shipping: formatAmount(invoice.shipping),
    total: formatAmount(invoice.total),
    paidAmount: formatAmount(invoice.paidAmount),
    dueAmount: formatAmount(invoice.dueAmount),
    notes: invoice.notes,
    terms: invoice.terms,
  };

  const buffer = await renderToBuffer(<InvoicePdf data={data} />);
  const fileName = `${COMPANY_SLUG}-Invoice-${sanitizeFileName(invoice.invoiceNumber)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
