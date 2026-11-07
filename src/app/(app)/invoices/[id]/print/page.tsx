import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/invoices/print-button";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { formatAmount } from "@/lib/money";
import { COMPANY_NAME } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Print invoice",
};

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  await requirePageUser();
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        items: { orderBy: { id: "asc" }, include: { product: { select: { sku: true } } } },
      },
    }),
    getSettings(),
  ]);
  if (!invoice) notFound();

  const currency = settings.currency;
  const money = (value: number | string) => `${currency} ${formatAmount(value)}`;

  return (
    <>
      <div className="no-print mb-5 flex items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href={`/invoices/${invoice.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to invoice
          </Link>
        </Button>
        <PrintButton />
      </div>

      <div className="print-area mx-auto max-w-4xl rounded-xl border border-border bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0B1B2B] text-sm font-bold text-white">
                TR
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight text-slate-900">{COMPANY_NAME}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Printer supplies · Ink · Toner · Cartridges
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-0.5 text-xs text-slate-500">
              {settings.address ? <p>{settings.address}</p> : null}
              <p>
                {[settings.phone, settings.email].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-2xl font-bold uppercase tracking-wide text-slate-900">Invoice</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{invoice.invoiceNumber}</p>
            <p className="mt-2 text-xs text-slate-500">Date: {formatDate(invoice.date)}</p>
            {invoice.dueDate ? (
              <p className="text-xs text-slate-500">Due: {formatDate(invoice.dueDate)}</p>
            ) : null}
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {invoice.status.replace("_", " ")}
            </p>
          </div>
        </div>

        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Bill to
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{invoice.customerName}</p>
            <div className="mt-1 space-y-0.5 text-xs text-slate-500">
              {invoice.customerPhone ? <p>{invoice.customerPhone}</p> : null}
              {invoice.customerEmail ? <p>{invoice.customerEmail}</p> : null}
              {invoice.customerAddress ? <p>{invoice.customerAddress}</p> : null}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Payment summary
            </p>
            <p className="mt-1 text-sm text-slate-600">Total: {money(invoice.total.toString())}</p>
            <p className="text-sm text-slate-600">Paid: {money(invoice.paidAmount.toString())}</p>
            <p className="text-sm font-semibold text-slate-900">
              Balance due: {money(invoice.dueAmount.toString())}
            </p>
          </div>
        </div>

        {invoice.isQuick ? (
          <div className="border-y border-slate-200 py-6">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Quick invoice</p>
                <p className="text-xs text-slate-500">Agreed sale total</p>
              </div>
              <p className="text-lg font-semibold text-slate-900">{money(invoice.total.toString())}</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2.5 pr-3 font-semibold">Description</th>
                <th className="py-2.5 pr-3 text-right font-semibold">Qty</th>
                <th className="py-2.5 pr-3 text-right font-semibold">Unit price</th>
                <th className="py-2.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-slate-900">{item.description}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.product?.sku ? `${item.product.sku} · ` : ""}
                      {item.quantity} {item.unit === "CARTON" ? "carton" : "piece"}
                      {item.quantity === 1 ? "" : "s"}
                      {item.unit === "CARTON" ? ` × ${item.piecesPerCarton} pcs` : ""}
                    </p>
                  </td>
                  <td className="py-2.5 pr-3 text-right text-slate-600">{item.quantity}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-600">
                    {money(item.unitPrice.toString())}
                  </td>
                  <td className="py-2.5 text-right font-medium text-slate-900">
                    {money(item.lineTotal.toString())}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{money(invoice.subtotal.toString())}</span>
            </div>
            {Number(invoice.discountAmount) > 0 ? (
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span>− {money(invoice.discountAmount.toString())}</span>
              </div>
            ) : null}
            {Number(invoice.taxRate) > 0 ? (
              <div className="flex justify-between text-slate-600">
                <span>Tax ({Number(invoice.taxRate).toFixed(2)}%)</span>
                <span>{money(invoice.taxAmount.toString())}</span>
              </div>
            ) : null}
            {Number(invoice.shipping) > 0 ? (
              <div className="flex justify-between text-slate-600">
                <span>Shipping</span>
                <span>{money(invoice.shipping.toString())}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-slate-900">
              <span>Total</span>
              <span>{money(invoice.total.toString())}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Paid</span>
              <span>{money(invoice.paidAmount.toString())}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-slate-900">
              <span>Balance due</span>
              <span>{money(invoice.dueAmount.toString())}</span>
            </div>
          </div>
        </div>

        {invoice.notes || invoice.terms ? (
          <div className="mt-8 grid gap-4 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:grid-cols-2">
            {invoice.notes ? (
              <div>
                <p className="font-semibold uppercase tracking-wide text-slate-400">Notes</p>
                <p className="mt-1 whitespace-pre-line">{invoice.notes}</p>
              </div>
            ) : null}
            {invoice.terms ? (
              <div>
                <p className="font-semibold uppercase tracking-wide text-slate-400">Terms</p>
                <p className="mt-1 whitespace-pre-line">{invoice.terms}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          <p>{settings.invoiceFooterNote || `Thank you for choosing ${COMPANY_NAME}.`}</p>
          <p className="mt-1">
            {COMPANY_NAME} · {settings.phone ?? ""} {settings.email ? `· ${settings.email}` : ""}
          </p>
        </div>
      </div>
    </>
  );
}
