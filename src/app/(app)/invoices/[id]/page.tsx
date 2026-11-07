import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  Download,
  Mail,
  MapPin,
  Phone,
  Receipt,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { PaymentActions } from "@/components/payments/payment-actions";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Invoice",
};

export default async function InvoiceDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const params = await paramsPromise;
  const user = await requirePageUser();
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { id: "asc" }, include: { product: { select: { sku: true } } } },
      payments: {
        orderBy: { date: "desc" },
        include: {
          createdBy: { select: { name: true } },
          voidedBy: { select: { name: true } },
        },
      },
      customer: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      cancelledBy: { select: { name: true } },
    },
  });
  if (!invoice) notFound();

  const hasLivePayments = invoice.payments.some((payment) => !payment.voidedAt);
  const dueAmount = Number(invoice.dueAmount);
  const discountLabel =
    invoice.discountType === "PERCENT"
      ? `${Number(invoice.discountValue).toFixed(2)}%`
      : formatMoney(invoice.discountValue);

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`Invoice for ${invoice.customerName} · ${formatDate(invoice.date)}`}
      >
        <Button variant="outline" asChild>
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <InvoiceActions
          id={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          status={invoice.status}
          dueAmount={dueAmount}
          hasLivePayments={hasLivePayments}
          isAdmin={user.role === "ADMIN"}
        />
      </PageHeader>

      {invoice.status === "CANCELLED" ? (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">This invoice is cancelled.</p>
            <p className="text-red-700">
              Cancelled {formatDateTime(invoice.cancelledAt)}
              {invoice.cancelledBy ? ` by ${invoice.cancelledBy.name}` : ""}. Stock was returned
              where applicable.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Line items</CardTitle>
                <CardDescription>
                  {invoice.isQuick
                    ? "Quick invoice with a manually agreed total."
                    : `${invoice.items.length} line item${invoice.items.length === 1 ? "" : "s"}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {invoice.isQuick ? <Badge variant="muted">Quick</Badge> : null}
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </CardHeader>
            <CardContent>
              {invoice.isQuick ? (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{invoice.customerName}</p>
                    <p className="text-xs text-slate-500">No itemized lines</p>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatMoney(invoice.total)}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-3 font-medium">Item</th>
                        <th className="py-2 pr-3 text-right font-medium">Qty</th>
                        <th className="py-2 pr-3 text-right font-medium">Unit price</th>
                        <th className="py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoice.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="py-3 pr-3">
                            <p className="font-medium text-slate-900">
                              {item.description || item.product?.sku || `Line ${index + 1}`}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.product?.sku ? `${item.product.sku} · ` : ""}
                              {item.quantity} {item.unit === "CARTON" ? "carton" : "piece"}
                              {item.quantity === 1 ? "" : "s"}
                              {item.unit === "CARTON"
                                ? ` · ${item.quantityPieces} pcs (${item.piecesPerCarton}/ctn)`
                                : ` · ${item.quantityPieces} pcs`}
                            </p>
                          </td>
                          <td className="py-3 pr-3 text-right text-slate-700">{item.quantity}</td>
                          <td className="py-3 pr-3 text-right text-slate-700">
                            {formatMoney(item.unitPrice)}
                          </td>
                          <td className="py-3 text-right font-medium text-slate-900">
                            {formatMoney(item.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 ml-auto w-full max-w-xs space-y-2 border-t border-border pt-4 text-sm">
                <TotalRow label="Subtotal" value={formatMoney(invoice.subtotal)} />
                {Number(invoice.discountAmount) > 0 ? (
                  <TotalRow
                    label={`Discount${invoice.discountType === "PERCENT" ? ` (${discountLabel})` : ""}`}
                    value={`− ${formatMoney(invoice.discountAmount)}`}
                  />
                ) : null}
                {Number(invoice.taxRate) > 0 ? (
                  <TotalRow
                    label={`Tax (${Number(invoice.taxRate).toFixed(2)}%)`}
                    value={formatMoney(invoice.taxAmount)}
                  />
                ) : null}
                {Number(invoice.shipping) > 0 ? (
                  <TotalRow label="Shipping" value={formatMoney(invoice.shipping)} />
                ) : null}
                <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{formatMoney(invoice.total)}</span>
                </div>
                <TotalRow label="Paid" value={formatMoney(invoice.paidAmount)} />
                <div className="flex items-center justify-between text-base font-semibold text-amber-700">
                  <span>Balance due</span>
                  <span>{formatMoney(invoice.dueAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <CardDescription>
                Receipts recorded against this invoice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-slate-500">
                  No payments recorded for this invoice.
                </p>
              ) : (
                <div className="space-y-2">
                  {invoice.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                          {payment.receiptNumber}
                          {payment.voidedAt ? <Badge variant="danger">Voided</Badge> : null}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(payment.date)} · {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                          {payment.reference ? ` · ${payment.reference}` : ""} · by{" "}
                          {payment.createdBy.name}
                        </p>
                        {payment.voidedAt ? (
                          <p className="mt-0.5 text-xs text-red-600">
                            Voided {formatDateTime(payment.voidedAt)}
                            {payment.voidedBy ? ` by ${payment.voidedBy.name}` : ""}
                            {payment.voidReason ? ` — ${payment.voidReason}` : ""}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatMoney(payment.amount)}
                        </span>
                        <PaymentActions
                          id={payment.id}
                          receiptNumber={payment.receiptNumber}
                          amount={Number(payment.amount)}
                          date={payment.date.toISOString()}
                          method={payment.method}
                          reference={payment.reference}
                          note={payment.note}
                          voided={Boolean(payment.voidedAt)}
                          isAdmin={user.role === "ADMIN"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {invoice.notes || invoice.terms ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes &amp; terms</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Notes</p>
                  <p className="mt-1 whitespace-pre-line text-slate-600">
                    {invoice.notes || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Terms</p>
                  <p className="mt-1 whitespace-pre-line text-slate-600">
                    {invoice.terms || "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
              <CardDescription>
                {invoice.customer ? (
                  <Link href={`/customers/${invoice.customer.id}`} className="hover:text-primary">
                    View customer ledger
                  </Link>
                ) : (
                  "Walk-in / no linked customer"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={Building2} label="Name" value={invoice.customerName} />
              <InfoRow icon={Phone} label="Phone" value={invoice.customerPhone ?? "—"} />
              <InfoRow icon={Mail} label="Email" value={invoice.customerEmail ?? "—"} />
              <InfoRow icon={MapPin} label="Address" value={invoice.customerAddress ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={Receipt} label="Invoice number" value={invoice.invoiceNumber} />
              <InfoRow icon={CalendarDays} label="Invoice date" value={formatDate(invoice.date)} />
              <InfoRow
                icon={CalendarDays}
                label="Due date"
                value={invoice.dueDate ? formatDate(invoice.dueDate) : "No due date"}
              />
              <InfoRow icon={User} label="Created by" value={invoice.createdBy.name} />
              <p className="border-t border-border pt-2 text-xs text-slate-400">
                Created {formatDateTime(invoice.createdAt)}
                {invoice.updatedAt.getTime() !== invoice.createdAt.getTime()
                  ? ` · updated ${formatDateTime(invoice.updatedAt)}`
                  : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{formatMoney(dueAmount)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {invoice.status === "PAID"
                  ? "This invoice is fully paid."
                  : invoice.status === "CANCELLED"
                    ? "Cancelled invoices have no balance."
                    : invoice.status === "DRAFT"
                      ? "Finalize the invoice before accepting payments."
                      : "Use Record payment to add a receipt."}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                    <Download className="h-3.5 w-3.5" />
                    Download invoice PDF
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className="break-words text-slate-700">{value}</p>
      </div>
    </div>
  );
}
