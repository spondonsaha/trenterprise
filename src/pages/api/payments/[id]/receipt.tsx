import { renderToBuffer } from "@react-pdf/renderer";
import type { NextApiRequest, NextApiResponse } from "next";
import { getApiSessionUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { ReceiptPdf, type ReceiptPdfData } from "@/lib/pdf/receipt-pdf";
import { formatAmount } from "@/lib/money";
import { COMPANY_SLUG, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatDate, sanitizeFileName } from "@/lib/utils";

export const config = {
  api: { responseLimit: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  const user = await getApiSessionUser(req, res);
  if (!user) return res.status(401).send("Unauthorized");

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).send("Payment id is required");

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: { select: { invoiceNumber: true, customerName: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!payment) return res.status(404).send("Payment not found");

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

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(Buffer.from(buffer));
}
