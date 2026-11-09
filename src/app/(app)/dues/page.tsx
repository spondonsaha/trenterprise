import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Search,
  Users,
  X,
} from "lucide-react";
import { InvoiceStatus } from "@prisma/client";
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
  daysBetween,
  formatDate,
  getIntParam,
  getStringParam,
} from "@/lib/utils";

export const metadata: Metadata = {
  title: "Unpaid bills",
};

const BUCKETS = [
  { value: "all", label: "All due invoices" },
  { value: "current", label: "Not yet due" },
  { value: "1-30", label: "1–30 days overdue" },
  { value: "31-60", label: "31–60 days overdue" },
  { value: "61-90", label: "61–90 days overdue" },
  { value: "90plus", label: "90+ days overdue" },
] as const;

type Bucket = (typeof BUCKETS)[number]["value"];

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto sm:min-w-[180px]";

function bucketFor(days: number): Exclude<Bucket, "all"> {
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90plus";
}

export default async function DuesPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;
  await requirePageUser();
  const q = (getStringParam(searchParams, "q") ?? "").trim();
  const requestedBucket = getStringParam(searchParams, "bucket") ?? "all";
  const bucket = BUCKETS.some((option) => option.value === requestedBucket)
    ? (requestedBucket as Bucket)
    : "all";
  const page = getIntParam(searchParams, "page", 1);

  const openInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
      dueAmount: { gt: 0 },
    },
    orderBy: [{ dueDate: "asc" }, { date: "asc" }],
    select: {
      id: true,
      invoiceNumber: true,
      customerId: true,
      customerName: true,
      customerPhone: true,
      date: true,
      dueDate: true,
      total: true,
      paidAmount: true,
      dueAmount: true,
      status: true,
    },
  });

  const today = new Date();
  const rows = openInvoices.map((invoice) => {
    const referenceDate = invoice.dueDate ?? invoice.date;
    const days = daysBetween(today, referenceDate);
    return { ...invoice, daysOverdue: days, bucket: bucketFor(days) };
  });

  const totalDue = rows.reduce((sum, row) => sum + Number(row.dueAmount), 0);
  const overdueRows = rows.filter((row) => row.daysOverdue > 0);
  const overdueAmount = overdueRows.reduce((sum, row) => sum + Number(row.dueAmount), 0);
  const currentAmount = totalDue - overdueAmount;
  const customerCount = new Set(rows.map((row) => row.customerId ?? row.customerName)).size;

  const needle = q.toLowerCase();
  const filtered = rows.filter((row) => {
    if (bucket !== "all" && row.bucket !== bucket) return false;
    if (!needle) return true;
    return (
      row.customerName.toLowerCase().includes(needle) ||
      row.invoiceNumber.toLowerCase().includes(needle) ||
      (row.customerPhone ?? "").toLowerCase().includes(needle)
    );
  });
  const total = filtered.length;
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Unpaid bills"
        description="Bills that still have a balance, oldest first. Open a bill to record a payment."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total outstanding"
          value={formatMoney(totalDue)}
          hint={`${rows.length} open invoice${rows.length === 1 ? "" : "s"}`}
          icon={CircleDollarSign}
          tone="amber"
        />
        <StatCard
          title="Overdue"
          value={formatMoney(overdueAmount)}
          hint={`${overdueRows.length} past due date`}
          icon={AlertTriangle}
          tone="red"
        />
        <StatCard
          title="Not yet due"
          value={formatMoney(currentAmount)}
          hint="Current receivables"
          icon={CalendarClock}
          tone="blue"
        />
        <StatCard
          title="Customers"
          value={String(customerCount)}
          hint="With an outstanding balance"
          icon={Users}
          tone="teal"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Receivables aging</CardTitle>
          <CardDescription>
            Invoices are bucketed by days past their due date (invoice date if no due date).
          </CardDescription>
        </CardHeader>
        <div className="border-y border-border bg-slate-50/60 px-4 py-3">
          <form method="get" className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search customer, invoice or phone..."
                className="bg-white pl-9"
              />
            </div>
            <select name="bucket" defaultValue={bucket} className={selectClass}>
              {BUCKETS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="h-11 px-4">
                Apply
              </Button>
              {q || bucket !== "all" ? (
                <Button variant="ghost" size="sm" className="h-11 px-3" asChild>
                  <Link href="/dues" aria-label="Clear filters">
                    <X className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        {total === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title={rows.length === 0 ? "No outstanding dues" : "No invoices match your filters"}
            description={
              rows.length === 0
                ? "Every finalized invoice is fully paid."
                : "Try a different search or aging bucket."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Invoice date</th>
                    <th className="px-4 py-3 font-medium">Due date</th>
                    <th className="px-4 py-3 font-medium">Aging</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Paid</th>
                    <th className="px-4 py-3 text-right font-medium">Due</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        {row.customerId ? (
                          <Link
                            href={`/customers/${row.customerId}`}
                            className="font-medium text-slate-900 hover:text-primary"
                          >
                            {row.customerName}
                          </Link>
                        ) : (
                          <p className="font-medium text-slate-900">{row.customerName}</p>
                        )}
                        {row.customerPhone ? (
                          <p className="text-xs text-slate-500">{row.customerPhone}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/invoices/${row.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.invoiceNumber}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(row.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {row.dueDate ? formatDate(row.dueDate) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.daysOverdue > 0 ? (
                          <span className="font-medium text-red-700">
                            {row.daysOverdue} day{row.daysOverdue === 1 ? "" : "s"} overdue
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            {row.daysOverdue === 0
                              ? "Due today"
                              : `Due in ${Math.abs(row.daysOverdue)} day${Math.abs(row.daysOverdue) === 1 ? "" : "s"}`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatMoney(row.total)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700">
                        {formatMoney(row.paidAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-700">
                        {formatMoney(row.dueAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={row.status} />
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
              basePath="/dues"
              searchParams={searchParams}
            />
          </>
        )}
      </Card>
    </>
  );
}
