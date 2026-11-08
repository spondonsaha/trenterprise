import { renderToBuffer } from "@react-pdf/renderer";
import type { NextApiRequest, NextApiResponse } from "next";
import { getApiSessionUser } from "@/lib/api-auth";
import { withPdfErrorHandling } from "@/lib/pdf-api";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { InvoicePdf, type InvoicePdfData } from "@/lib/pdf/invoice-pdf";
import { formatAmount } from "@/lib/money";
import { COMPANY_SLUG, INVOICE_STATUS_LABELS } from "@/lib/constants";
import { formatDate, sanitizeFileName } from "@/lib/utils";

export const config = {
  api: { responseLimit: false },
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  const user = await getApiSessionUser(req, res);
  if (!user) return res.status(401).send("Unauthorized");

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).send("Invoice id is required");

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!invoice) return res.status(404).send("Invoice not found");

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

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(Buffer.from(buffer));
}

export default withPdfErrorHandling(handler);
