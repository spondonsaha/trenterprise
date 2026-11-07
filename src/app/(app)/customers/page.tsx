import type { Metadata } from "next";
import Link from "next/link";
import { CircleDollarSign, Plus, Search, Users, X } from "lucide-react";
import { InvoiceStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
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
import { formatMoney, D } from "@/lib/money";
import { PAGE_SIZE } from "@/lib/constants";
import { getIntParam, getStringParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Customers",
};

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto sm:min-w-[150px]";

export default async function CustomersPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;
  await requirePageUser();
  const q = (getStringParam(searchParams, "q") ?? "").trim();
  const requestedStatus = getStringParam(searchParams, "status") ?? "all";
  const status = ["all", "active", "inactive"].includes(requestedStatus)
    ? requestedStatus
    : "all";
  const page = getIntParam(searchParams, "page", 1);

  const where: Prisma.CustomerWhereInput = {};
  if (status === "active") where.active = true;
  if (status === "inactive") where.active = false;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { contactPerson: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const openStatuses = [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID];

  const [total, customers, duesByCustomer, activeCount, overallDues] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { invoices: true } } },
    }),
    prisma.invoice.groupBy({
      by: ["customerId"],
      where: {
        customerId: { not: null },
        status: { in: openStatuses },
        dueAmount: { gt: 0 },
      },
      _sum: { dueAmount: true },
    }),
    prisma.customer.count({ where: { active: true } }),
    prisma.invoice.aggregate({
      where: { status: { in: openStatuses }, dueAmount: { gt: 0 } },
      _sum: { dueAmount: true },
    }),
  ]);

  const dueMap = new Map(
    duesByCustomer.map((row) => [row.customerId, row._sum.dueAmount ? D(row._sum.dueAmount).toNumber() : 0]),
  );
  const totalOutstanding = overallDues._sum.dueAmount ? D(overallDues._sum.dueAmount).toNumber() : 0;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Customer directory, contact details and receivable balances for TR Enterprise."
      >
        <Button asChild>
          <Link href="/customers/new">
            <Plus className="h-4 w-4" />
            Add customer
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Customers"
          value={String(activeCount)}
          hint="Active accounts"
          icon={Users}
          tone="blue"
        />
        <StatCard
          title="Outstanding dues"
          value={formatMoney(totalOutstanding)}
          hint="Across all open invoices"
          icon={CircleDollarSign}
          tone="amber"
        />
        <StatCard
          title="Directory size"
          value={String(total)}
          hint="Matching current filters"
          icon={Users}
          tone="teal"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Customer directory</CardTitle>
          <CardDescription>Open a customer to view invoices, payments and ledger.</CardDescription>
        </CardHeader>
        <div className="border-y border-border bg-slate-50/60 px-4 py-3">
          <form method="get" className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search customer, contact, phone or email..."
                className="bg-white pl-9"
              />
            </div>
            <select name="status" defaultValue={status} className={selectClass}>
              <option value="all">All customers</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="h-11 px-4">
                Apply
              </Button>
              {q || status !== "all" ? (
                <Button variant="ghost" size="sm" className="h-11 px-3" asChild>
                  <Link href="/customers" aria-label="Clear filters">
                    <X className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        {total === 0 ? (
          <EmptyState
            icon={Users}
            title={q ? "No customers match your search" : "No customers yet"}
            description={
              q
                ? "Try a different name, contact or phone number."
                : "Add your first customer to prefill invoices and track dues."
            }
            action={
              !q ? (
                <Button asChild>
                  <Link href="/customers/new">
                    <Plus className="h-4 w-4" />
                    Add customer
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Contact</th>
                    <th className="px-5 py-3 font-medium">Invoices</th>
                    <th className="px-5 py-3 font-medium">Outstanding</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => {
                    const invoiceDue = dueMap.get(customer.id) ?? 0;
                    const outstanding = invoiceDue + Number(customer.openingBalance);
                    return (
                      <tr key={customer.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-medium text-slate-900 hover:text-primary"
                          >
                            {customer.name}
                          </Link>
                          {customer.address ? (
                            <p className="max-w-[200px] truncate text-xs text-slate-500">
                              {customer.address}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-slate-700">{customer.contactPerson ?? "—"}</p>
                          <p className="text-xs text-slate-500">
                            {[customer.phone, customer.email].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-slate-700">{customer._count.invoices}</td>
                        <td className="px-5 py-3">
                          <span
                            className={
                              outstanding > 0 ? "font-semibold text-amber-700" : "text-slate-500"
                            }
                          >
                            {formatMoney(outstanding)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {customer.active ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="muted">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/customers/${customer.id}`}>View ledger</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              basePath="/customers"
              searchParams={searchParams}
            />
          </>
        )}
      </Card>
    </>
  );
}
