import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { ReceiptPdf, type ReceiptPdfData } from "@/lib/pdf/receipt-pdf";
import { formatAmount } from "@/lib/money";
import { COMPANY_SLUG, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatDate, sanitizeFileName } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      invoice: { select: { invoiceNumber: true, customerName: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!payment) return new Response("Payment not found", { status: 404 });

  const settings = await getSettings();

  const data: ReceiptPdfData = {
    receiptNumber: payment.receiptNumber,
    dateLabel: formatDate(payment.date),
    voided: Boolean(payment.voidedAt),
    company: {
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      logoUrl: settings.logoUrl,
      currency: settings.currency,
    },
    customerName: payment.invoice.customerName,
    invoiceNumber: payment.invoice.invoiceNumber,
    amount: formatAmount(payment.amount),
    methodLabel: PAYMENT_METHOD_LABELS[payment.method] ?? payment.method,
    reference: payment.reference,
    receivedBy: payment.createdBy.name,
    note: payment.note,
  };

  const buffer = await renderToBuffer(<ReceiptPdf data={data} />);
  const fileName = `${COMPANY_SLUG}-Receipt-${sanitizeFileName(payment.receiptNumber)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
