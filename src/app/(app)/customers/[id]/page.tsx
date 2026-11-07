import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CircleDollarSign,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Receipt,
  User,
} from "lucide-react";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { InvoiceStatusBadge } from "@/components/status-badge";
import { CustomerActiveToggle } from "@/components/customers/customer-active-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/permissions";
import { formatMoney, D } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Customer",
};

const EXCLUDED_STATUSES: InvoiceStatus[] = [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED];

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  MOBILE_BANKING: "Mobile banking",
  CHEQUE: "Cheque",
  CARD: "Card",
  OTHER: "Other",
};

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePageUser();
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      invoices: {
        orderBy: { date: "desc" },
        include: { _count: { select: { payments: true, items: true } } },
      },
      payments: {
        orderBy: { date: "desc" },
        include: { invoice: { select: { id: true, invoiceNumber: true } } },
      },
    },
  });
  if (!customer) notFound();

  const ledgerInvoices = customer.invoices.filter(
    (invoice) => !EXCLUDED_STATUSES.includes(invoice.status),
  );
  const livePayments = customer.payments.filter((payment) => !payment.voidedAt);
  const totalInvoiced = ledgerInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.total),
    0,
  );
  const totalPaid = livePayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const openingBalance = Number(customer.openingBalance);

  type LedgerEntry = {
    id: string;
    date: Date;
    type: "opening" | "invoice" | "payment";
    description: string;
    debit: number;
    credit: number;
    href?: string;
  };

  const entries: LedgerEntry[] = [];
  if (openingBalance !== 0) {
    entries.push({
      id: "opening",
      date: customer.createdAt,
      type: "opening",
      description: "Opening balance",
      debit: openingBalance,
      credit: 0,
    });
  }
  for (const invoice of ledgerInvoices) {
    entries.push({
      id: invoice.id,
      date: invoice.date,
      type: "invoice",
      description: `Invoice ${invoice.invoiceNumber}`,
      debit: Number(invoice.total),
      credit: 0,
      href: `/invoices/${invoice.id}`,
    });
  }
  for (const payment of livePayments) {
    entries.push({
      id: payment.id,
      date: payment.date,
      type: "payment",
      description: `Payment ${payment.receiptNumber}${
        payment.invoice ? ` · ${payment.invoice.invoiceNumber}` : ""
      }`,
      debit: 0,
      credit: Number(payment.amount),
      href: payment.invoice ? `/invoices/${payment.invoice.id}` : undefined,
    });
  }
  entries.sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    if (diff !== 0) return diff;
    const order = { opening: 0, invoice: 1, payment: 2 };
    return order[a.type] - order[b.type];
  });
  let running = 0;
  const ledger = entries.map((entry) => {
    running += entry.debit - entry.credit;
    return { ...entry, balance: running };
  });
  const balance = running;
  const openInvoices = customer.invoices.filter(
    (invoice) =>
      invoice.status === InvoiceStatus.UNPAID || invoice.status === InvoiceStatus.PARTIALLY_PAID,
  );
  const invoiceDue = openInvoices.reduce((sum, invoice) => sum + Number(invoice.dueAmount), 0);

  return (
    <>
      <PageHeader
        title={customer.name}
        description={
          customer.contactPerson
            ? `${customer.contactPerson} · customer since ${formatDate(customer.createdAt)}`
            : `Customer since ${formatDate(customer.createdAt)}`
        }
      >
        <Button variant="outline" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/invoices/new?customerId=${customer.id}`}>
            <Plus className="h-4 w-4" />
            New invoice
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Balance due"
          value={formatMoney(balance)}
          hint={`${openInvoices.length} open invoice${openInvoices.length === 1 ? "" : "s"}`}
          icon={CircleDollarSign}
          tone={balance > 0 ? "amber" : "teal"}
        />
        <StatCard
          title="Total invoiced"
          value={formatMoney(totalInvoiced)}
          hint={`${ledgerInvoices.length} finalized invoices`}
          icon={FileText}
          tone="blue"
        />
        <StatCard
          title="Total paid"
          value={formatMoney(totalPaid)}
          hint={`${livePayments.length} payment${livePayments.length === 1 ? "" : "s"}`}
          icon={Receipt}
          tone="teal"
        />
        <StatCard
          title="Invoice dues"
          value={formatMoney(invoiceDue)}
          hint="Open invoice balance"
          icon={CircleDollarSign}
          tone="slate"
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Customer information</CardTitle>
              <CardDescription>
                {customer.active ? "Active account" : "Inactive account"}
              </CardDescription>
            </div>
            {customer.active ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="muted">Inactive</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <InfoRow icon={User} label="Contact" value={customer.contactPerson ?? "—"} />
            <InfoRow icon={Phone} label="Phone" value={customer.phone ?? "—"} />
            <InfoRow icon={Mail} label="Email" value={customer.email ?? "—"} />
            <InfoRow icon={MapPin} label="Address" value={customer.address ?? "—"} />
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-medium text-slate-900">Opening balance</p>
              <p className="mt-0.5">{formatMoney(openingBalance)}</p>
              {customer.notes ? (
                <p className="mt-2 whitespace-pre-line text-slate-500">{customer.notes}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/customers/${customer.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit details
                </Link>
              </Button>
              {user.role === "ADMIN" ? (
                <CustomerActiveToggle id={customer.id} active={customer.active} />
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Account activity</CardTitle>
            <CardDescription>
              Invoices, payments and running receivable balance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ledger">
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
                <TabsTrigger value="ledger">Ledger ({ledger.length})</TabsTrigger>
                <TabsTrigger value="invoices">Invoices ({customer.invoices.length})</TabsTrigger>
                <TabsTrigger value="payments">Payments ({customer.payments.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="ledger">
                {ledger.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No ledger activity yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-2 pr-3 font-medium">Date</th>
                          <th className="py-2 pr-3 font-medium">Description</th>
                          <th className="py-2 pr-3 text-right font-medium">Debit</th>
                          <th className="py-2 pr-3 text-right font-medium">Credit</th>
                          <th className="py-2 text-right font-medium">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ledger.map((entry) => (
                          <tr key={`${entry.type}-${entry.id}`}>
                            <td className="whitespace-nowrap py-2.5 pr-3 text-slate-500">
                              {formatDate(entry.date)}
                            </td>
                            <td className="py-2.5 pr-3 text-slate-700">
                              {entry.href ? (
                                <Link href={entry.href} className="hover:text-primary">
                                  {entry.description}
                                </Link>
                              ) : (
                                entry.description
                              )}
                            </td>
                            <td className="py-2.5 pr-3 text-right text-slate-700">
                              {entry.debit ? formatMoney(entry.debit) : "—"}
                            </td>
                            <td className="py-2.5 pr-3 text-right text-emerald-700">
                              {entry.credit ? formatMoney(entry.credit) : "—"}
                            </td>
                            <td className="py-2.5 text-right font-medium text-slate-900">
                              {formatMoney(entry.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border">
                          <td colSpan={4} className="py-2.5 text-right text-xs uppercase tracking-wide text-slate-500">
                            Balance due
                          </td>
                          <td className="py-2.5 text-right font-semibold text-slate-900">
                            {formatMoney(balance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="invoices">
                {customer.invoices.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No invoices for this customer yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customer.invoices.map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/invoices/${invoice.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition hover:border-primary/40 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {invoice.invoiceNumber}
                            {invoice.isQuick ? (
                              <span className="ml-2 text-[10px] font-medium uppercase text-slate-400">
                                Quick
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(invoice.date)} · {invoice._count.items} item
                            {invoice._count.items === 1 ? "" : "s"} · paid{" "}
                            {formatMoney(invoice.paidAmount)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-slate-900">
                            {formatMoney(invoice.total)}
                          </span>
                          <InvoiceStatusBadge status={invoice.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments">
                {customer.payments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No payments recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customer.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {payment.receiptNumber}
                            {payment.voidedAt ? (
                              <span className="ml-2">
                                <Badge variant="danger">Voided</Badge>
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(payment.date)} · {METHOD_LABELS[payment.method]}
                            {payment.invoice ? (
                              <>
                                {" · "}
                                <Link
                                  href={`/invoices/${payment.invoice.id}`}
                                  className="hover:text-primary"
                                >
                                  {payment.invoice.invoiceNumber}
                                </Link>
                              </>
                            ) : null}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-slate-900">
                          {formatMoney(payment.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Ledger generated {formatDateTime(new Date())}. Draft and cancelled invoices are excluded.
      </p>
    </>
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
        <p className="truncate text-slate-700">{value}</p>
      </div>
    </div>
  );
}
