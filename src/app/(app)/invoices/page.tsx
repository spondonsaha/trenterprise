import type { Metadata } from "next";
import Link from "next/link";
import { CircleDollarSign, FileText, Plus, Receipt, Search, X, Zap } from "lucide-react";
import { InvoiceStatus, type Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { InvoiceStatusBadge } from "@/components/status-badge";
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
import { PAGE_SIZE } from "@/lib/constants";
import {
  formatDate,
  getIntParam,
  getStringParam,
  parseDateOnly,
} from "@/lib/utils";

export const metadata: Metadata = {
  title: "Invoices",
};

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto sm:min-w-[160px]";

const STATUS_OPTIONS: { value: string; label: string; statuses?: InvoiceStatus[] }[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open (unpaid / partial)", statuses: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
  { value: "draft", label: "Draft", statuses: [InvoiceStatus.DRAFT] },
  { value: "paid", label: "Paid", statuses: [InvoiceStatus.PAID] },
  { value: "cancelled", label: "Cancelled", statuses: [InvoiceStatus.CANCELLED] },
];

export default async function InvoicesPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;
  await requirePageUser();
  const q = (getStringParam(searchParams, "q") ?? "").trim();
  const requested = getStringParam(searchParams, "status") ?? "all";
  const selected = STATUS_OPTIONS.find((option) => option.value === requested) ?? STATUS_OPTIONS[0];
  const from = getStringParam(searchParams, "from") ?? "";
  const to = getStringParam(searchParams, "to") ?? "";
  const page = getIntParam(searchParams, "page", 1);

  const where: Prisma.InvoiceWhereInput = {};
  if (selected.statuses) where.status = { in: selected.statuses };
  if (q) {
    where.OR = [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
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

  const [total, invoices, totals] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { items: true, payments: true } } },
    }),
    prisma.invoice.aggregate({
      where,
      _sum: { total: true, paidAmount: true, dueAmount: true },
    }),
  ]);

  const activeFilters = Boolean(q || selected.value !== "all" || from || to);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Every sale, what was paid, and what is still owed."
      >
        <Button variant="outline" asChild>
          <Link href="/invoices/new?mode=quick">
            <Zap className="h-4 w-4" />
            Quick invoice
          </Link>
        </Button>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" />
            New invoice
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Invoices"
          value={String(total)}
          hint="Matching current filters"
          icon={FileText}
          tone="blue"
        />
        <StatCard
          title="Value"
          value={formatMoney(totals._sum.total ?? 0)}
          hint="Invoice totals"
          icon={Receipt}
          tone="teal"
        />
        <StatCard
          title="Collected"
          value={formatMoney(totals._sum.paidAmount ?? 0)}
          hint="Payments recorded"
          icon={CircleDollarSign}
          tone="slate"
        />
        <StatCard
          title="Outstanding"
          value={formatMoney(totals._sum.dueAmount ?? 0)}
          hint="Remaining balance"
          icon={CircleDollarSign}
          tone="amber"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Invoice register</CardTitle>
          <CardDescription>Newest invoices first.</CardDescription>
        </CardHeader>
        <div className="border-y border-border bg-slate-50/60 px-4 py-3">
          <form method="get" className="flex flex-col gap-2 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search invoice number, customer or phone..."
                className="bg-white pl-9"
              />
            </div>
            <select name="status" defaultValue={selected.value} className={selectClass}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
                  <Link href="/invoices" aria-label="Clear filters">
                    <X className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        {total === 0 ? (
          <EmptyState
            icon={FileText}
            title={activeFilters ? "No invoices match your filters" : "No invoices yet"}
            description={
              activeFilters
                ? "Try a different search, status or date range."
                : "Create your first invoice to start tracking sales and dues."
            }
            action={
              <Button asChild>
                <Link href="/invoices/new">
                  <Plus className="h-4 w-4" />
                  New invoice
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Paid</th>
                    <th className="px-4 py-3 text-right font-medium">Due</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-semibold text-slate-900 hover:text-primary"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {invoice.isQuick
                            ? "Quick invoice"
                            : `${invoice._count.items} item${invoice._count.items === 1 ? "" : "s"}`}
                          {invoice._count.payments > 0
                            ? ` · ${invoice._count.payments} payment${invoice._count.payments === 1 ? "" : "s"}`
                            : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[220px] truncate font-medium text-slate-700">
                          {invoice.customerName}
                        </p>
                        {invoice.customerPhone ? (
                          <p className="text-xs text-slate-500">{invoice.customerPhone}</p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatMoney(invoice.total)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        {formatMoney(invoice.paidAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={Number(invoice.dueAmount) > 0 ? "font-semibold text-amber-700" : "text-slate-400"}>
                          {formatMoney(invoice.dueAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/invoices/${invoice.id}`}>View</Link>
                        </Button>
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
              basePath="/invoices"
              searchParams={searchParams}
            />
          </>
        )}
      </Card>
    </>
  );
}
