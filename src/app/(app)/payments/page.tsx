import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, CircleSlash, Receipt, Search, X } from "lucide-react";
import { PaymentMethod, type Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { PaymentActions } from "@/components/payments/payment-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { PAGE_SIZE, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatDate, getIntParam, getStringParam, parseDateOnly } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Payments",
};

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto sm:min-w-[160px]";

export default async function PaymentsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;
  const user = await requirePageUser();
  const q = (getStringParam(searchParams, "q") ?? "").trim();
  const methodParam = getStringParam(searchParams, "method") ?? "all";
  const statusParam = getStringParam(searchParams, "status") ?? "all";
  const from = getStringParam(searchParams, "from") ?? "";
  const to = getStringParam(searchParams, "to") ?? "";
  const page = getIntParam(searchParams, "page", 1);

  const where: Prisma.PaymentWhereInput = {};
  if (methodParam !== "all" && methodParam in PAYMENT_METHOD_LABELS) {
    where.method = methodParam as PaymentMethod;
  }
  if (statusParam === "live") where.voidedAt = null;
  if (statusParam === "voided") where.voidedAt = { not: null };
  if (q) {
    where.OR = [
      { receiptNumber: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
      {
        invoice: {
          is: {
            OR: [
              { invoiceNumber: { contains: q, mode: "insensitive" } },
              { customerName: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  if (fromDate || toDate) {
    where.date = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  const [total, payments, totals, voidedCount] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, customerName: true } },
      },
    }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
    prisma.payment.count({ where: { voidedAt: { not: null } } }),
  ]);

  const activeFilters =
    Boolean(q || from || to) || methodParam !== "all" || statusParam !== "all";
  const isAdmin = user.role === "ADMIN";

  return (
    <>
      <PageHeader
        title="Payments"
        description="Receipts received against invoices, with admin-only corrections and voids."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Receipts"
          value={String(total)}
          hint="Matching current filters"
          icon={Receipt}
          tone="blue"
        />
        <StatCard
          title="Amount"
          value={formatMoney(totals._sum.amount ?? 0)}
          hint="Including voided receipts"
          icon={Banknote}
          tone="teal"
        />
        <StatCard
          title="Voided"
          value={String(voidedCount)}
          hint="Kept for audit history"
          icon={CircleSlash}
          tone="amber"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment register</CardTitle>
          <CardDescription>
            Record new payments from an invoice page so the balance updates atomically.
          </CardDescription>
        </CardHeader>
        <div className="border-y border-border bg-slate-50/60 px-4 py-3">
          <form method="get" className="flex flex-col gap-2 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search receipt, invoice, customer or reference..."
                className="bg-white pl-9"
              />
            </div>
            <select name="method" defaultValue={methodParam} className={selectClass}>
              <option value="all">All methods</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={statusParam} className={selectClass}>
              <option value="all">All receipts</option>
              <option value="live">Active only</option>
              <option value="voided">Voided only</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input
                name="from"
                type="date"
                defaultValue={from}
                aria-label="From date"
                className="w-full bg-white"
              />
              <Input
                name="to"
                type="date"
                defaultValue={to}
                aria-label="To date"
                className="w-full bg-white"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="h-11 px-4">
                Apply
              </Button>
              {activeFilters ? (
                <Button variant="ghost" size="sm" className="h-11 px-3" asChild>
                  <Link href="/payments" aria-label="Clear filters">
                    <X className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        {total === 0 ? (
          <EmptyState
            icon={Receipt}
            title={activeFilters ? "No payments match your filters" : "No payments yet"}
            description={
              activeFilters
                ? "Try a different search, method or date range."
                : "Record a payment from an invoice to see receipts here."
            }
            action={
              <Button asChild>
                <Link href="/invoices?status=open">View open invoices</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Receipt</th>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{payment.receiptNumber}</p>
                        {payment.reference ? (
                          <p className="max-w-[160px] truncate text-xs text-slate-500">
                            {payment.reference}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/invoices/${payment.invoice.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {payment.invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[200px] truncate text-slate-700">
                          {payment.invoice.customerName}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(payment.date)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatMoney(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {payment.voidedAt ? (
                          <Badge variant="danger">Voided</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentActions
                          id={payment.id}
                          receiptNumber={payment.receiptNumber}
                          amount={Number(payment.amount)}
                          date={payment.date.toISOString()}
                          method={payment.method}
                          reference={payment.reference}
                          note={payment.note}
                          voided={Boolean(payment.voidedAt)}
                          isAdmin={isAdmin}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              basePath="/payments"
              searchParams={searchParams}
            />
          </>
        )}
      </Card>
    </>
  );
}
