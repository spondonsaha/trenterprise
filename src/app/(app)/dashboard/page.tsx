import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  FileText,
  Package,
  Plus,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { InvoiceStatus } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { InvoiceStatusBadge, StockBadge } from "@/components/status-badge";
import { SalesChart, type SalesPoint } from "@/components/dashboard/sales-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { COMPANY_NAME } from "@/lib/constants";
import { formatDate, startOfUtcDay, startOfUtcMonth, addDays } from "@/lib/utils";
import { formatMoney, D } from "@/lib/money";
import { formatStock } from "@/lib/stock-math";
import { prisma } from "@/lib/prisma";
import { requirePageUser } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Dashboard",
};

const SALES_FILTER = {
  status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED] },
};

export default async function DashboardPage() {
  const user = await requirePageUser();
  const now = new Date();
  const monthStart = startOfUtcMonth(now);
  const weekStart = startOfUtcDay(addDays(now, -6));

  const [
    salesMonth,
    invoiceCount,
    dues,
    dueCount,
    paymentsMonth,
    lowStockCount,
    outOfStockCount,
    recentInvoices,
    lowStockProducts,
    weekInvoices,
    topItems,
    unpaidInvoices,
    productTotal,
    customerTotal,
    invoiceTotal,
    stockedCount,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { date: { gte: monthStart }, ...SALES_FILTER },
      _sum: { total: true },
    }),
    prisma.invoice.count({ where: { date: { gte: monthStart }, ...SALES_FILTER } }),
    prisma.invoice.aggregate({
      where: {
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
        dueAmount: { gt: 0 },
      },
      _sum: { dueAmount: true },
    }),
    prisma.invoice.count({
      where: {
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
        dueAmount: { gt: 0 },
      },
    }),
    prisma.payment.aggregate({
      where: { date: { gte: monthStart }, voidedAt: null },
      _sum: { amount: true },
    }),
    prisma.product.count({
      where: {
        active: true,
        isArchived: false,
        stockPieces: { lte: prisma.product.fields.lowStockPieces },
      },
    }),
    prisma.product.count({
      where: { active: true, isArchived: false, stockPieces: { lte: 0 } },
    }),
    prisma.invoice.findMany({
      where: { status: { not: InvoiceStatus.CANCELLED } },
      orderBy: { date: "desc" },
      take: 6,
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        date: true,
        total: true,
        dueAmount: true,
        status: true,
      },
    }),
    prisma.product.findMany({
      where: {
        active: true,
        isArchived: false,
        stockPieces: { lte: prisma.product.fields.lowStockPieces },
      },
      orderBy: { stockPieces: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        sku: true,
        stockPieces: true,
        lowStockPieces: true,
        piecesPerCarton: true,
      },
    }),
    prisma.invoice.findMany({
      where: { date: { gte: weekStart }, ...SALES_FILTER },
      select: { date: true, total: true },
    }),
    prisma.invoiceItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        invoice: { date: { gte: monthStart }, ...SALES_FILTER },
      },
      _sum: { quantityPieces: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] },
        dueAmount: { gt: 0 },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        dueDate: true,
        dueAmount: true,
      },
    }),
    prisma.product.count({ where: { isArchived: false } }),
    prisma.customer.count({ where: { active: true } }),
    prisma.invoice.count(),
    prisma.product.count({ where: { isArchived: false, stockPieces: { gt: 0 } } }),
  ]);

  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const totalsByDay = new Map<string, number>();
  for (const invoice of weekInvoices) {
    const key = invoice.date.toISOString().slice(0, 10);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + D(invoice.total).toNumber());
  }
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
  const dayMonth = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
  const salesData: SalesPoint[] = days.map((day) => {
    const key = day.toISOString().slice(0, 10);
    return {
      label: weekday.format(day),
      date: dayMonth.format(day),
      total: Math.round((totalsByDay.get(key) ?? 0) * 100) / 100,
    };
  });
  const weekTotal = salesData.reduce((sum, point) => sum + point.total, 0);

  const topProductIds = topItems
    .map((item) => item.productId)
    .filter((id): id is string => Boolean(id));
  const topProducts = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true, sku: true, piecesPerCarton: true },
  });
  const topProductMap = new Map(topProducts.map((product) => [product.id, product]));

  const monthSales = salesMonth._sum.total ? D(salesMonth._sum.total).toNumber() : 0;
  const outstanding = dues._sum.dueAmount ? D(dues._sum.dueAmount).toNumber() : 0;
  const collected = paymentsMonth._sum.amount ? D(paymentsMonth._sum.amount).toNumber() : 0;
  const canManage = user.role === "ADMIN" || user.canOverridePrice;

  const setupSteps = [
    {
      label: "Add your first product",
      done: productTotal > 0,
      href: "/products/new",
      action: "Add product",
    },
    {
      label: "Put stock on the shelf",
      done: stockedCount > 0,
      href: "/inventory/stock-in",
      action: "Add stock",
    },
    {
      label: "Add a customer",
      done: customerTotal > 0,
      href: "/customers/new",
      action: "Add customer",
    },
    {
      label: "Create your first sale",
      done: invoiceTotal > 0,
      href: "/invoices/new?mode=quick",
      action: "New sale",
    },
  ];
  const setupDone = setupSteps.filter((step) => step.done).length;
  const showSetup = setupDone < setupSteps.length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user.name.split(" ")[0] || "there"}. Here is how ${COMPANY_NAME} is performing this month.`}
      >
        <Button variant="outline" asChild>
          <Link href="/inventory/stock-in">
            <ArrowDownToLine className="h-4 w-4" />
            Add stock
          </Link>
        </Button>
        <Button asChild>
          <Link href="/invoices/new?mode=quick">
            <Plus className="h-4 w-4" />
            New sale
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            href: "/invoices/new?mode=quick",
            label: "New sale",
            hint: "Customer and total",
            icon: Plus,
          },
          {
            href: "/inventory/stock-in",
            label: "Add stock",
            hint: "Cartons or pieces",
            icon: ArrowDownToLine,
          },
          {
            href: "/dues",
            label: "Collect payment",
            hint: "Unpaid bills",
            icon: CircleDollarSign,
          },
          canManage
            ? {
                href: "/products/new",
                label: "Add product",
                hint: "With opening stock",
                icon: Package,
              }
            : {
                href: "/customers/new",
                label: "Add customer",
                hint: "Create an account",
                icon: Users,
              },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {action.label}
                </span>
                <span className="block truncate text-xs text-slate-500">{action.hint}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {showSetup ? (
        <Card className="mt-5">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Get started</CardTitle>
              <CardDescription>
                {setupDone} of {setupSteps.length} steps done — finish setup to run your first sale.
              </CardDescription>
            </div>
            <Badge variant="outline">
              {setupDone}/{setupSteps.length}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {setupSteps.map((step) => (
              <div
                key={step.label}
                className="flex items-start gap-2 rounded-lg border border-border p-3"
              >
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                )}
                <div className="min-w-0">
                  <p
                    className={
                      step.done
                        ? "text-sm font-medium text-slate-400 line-through"
                        : "text-sm font-medium text-slate-900"
                    }
                  >
                    {step.label}
                  </p>
                  {!step.done ? (
                    <Link
                      href={step.href}
                      className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {step.action}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Sales this month"
          value={formatMoney(monthSales)}
          hint={`${invoiceCount} finalized invoice${invoiceCount === 1 ? "" : "s"}`}
          icon={TrendingUp}
          tone="blue"
        />
        <StatCard
          title="Outstanding dues"
          value={formatMoney(outstanding)}
          hint={`${dueCount} open invoice${dueCount === 1 ? "" : "s"}`}
          icon={CircleDollarSign}
          tone="amber"
        />
        <StatCard
          title="Payments received"
          value={formatMoney(collected)}
          hint="Collected this month"
          icon={Wallet}
          tone="teal"
        />
        <StatCard
          title="Low stock items"
          value={String(lowStockCount)}
          hint={`${outOfStockCount} out of stock`}
          icon={AlertTriangle}
          tone={lowStockCount > 0 ? "red" : "green"}
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Unpaid bills</CardTitle>
              <CardDescription>Oldest bills first — collect what is due.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dues">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {unpaidInvoices.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-medium text-slate-900">All bills are paid</p>
                <p className="mt-1 text-xs text-slate-500">Nothing to collect right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {unpaidInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="truncate text-xs text-slate-500">
                        {invoice.customerName}
                        {invoice.dueDate ? ` · due ${formatDate(invoice.dueDate)}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatMoney(invoice.dueAmount)}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/invoices/${invoice.id}`}>Record payment</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Low stock</CardTitle>
              <CardDescription>Products at or below reorder level.</CardDescription>
            </div>
            <Boxes className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-4">
            {lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600">
                  <Package className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-medium text-slate-900">Stock levels look healthy</p>
                <p className="mt-1 text-xs text-slate-500">No products need reordering right now.</p>
              </div>
            ) : (
              <>
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${product.id}`}
                        className="block truncate text-sm font-medium text-slate-900 hover:text-primary"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {product.sku} · {formatStock(product.stockPieces, product.piecesPerCarton)}{" "}
                        left
                      </p>
                    </div>
                    <StockBadge
                      pieces={product.stockPieces}
                      lowStockPieces={product.lowStockPieces}
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/inventory?status=low">
                    Add stock
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Sales — last 7 days</CardTitle>
              <CardDescription>
                Finalized invoices from {formatDate(weekStart)} to {formatDate(now)}.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">
              {formatMoney(weekTotal)}
            </Badge>
          </CardHeader>
          <CardContent>
            <SalesChart data={salesData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Top products</CardTitle>
              <CardDescription>By revenue this month.</CardDescription>
            </div>
            <Package className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-4">
            {topItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No product sales yet this month.
              </p>
            ) : (
              topItems.map((item, index) => {
                const product = item.productId ? topProductMap.get(item.productId) : undefined;
                return (
                  <div key={item.productId ?? index} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {product?.name ?? "Deleted product"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {product
                          ? `${formatStock(item._sum.quantityPieces ?? 0, product.piecesPerCarton)} sold`
                          : "—"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatMoney(item._sum.lineTotal ?? 0)}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Recent invoices</CardTitle>
              <CardDescription>Latest billing activity across the business.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/invoices">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-y border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Invoice</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        No invoices yet. Create your first invoice to get started.
                      </td>
                    </tr>
                  ) : (
                    recentInvoices.map((invoice) => (
                      <tr key={invoice.id} className="bg-white transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-3">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="font-semibold text-primary hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </td>
                        <td className="max-w-[180px] truncate px-5 py-3 text-slate-700">
                          {invoice.customerName}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                          {formatDate(invoice.date)}
                        </td>
                        <td className="px-5 py-3">
                          <InvoiceStatusBadge status={invoice.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-slate-900">
                          {formatMoney(invoice.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <FileText className="h-3.5 w-3.5" />
        Tip: create itemized invoices to deduct stock automatically, or quick invoices for one-off
        sales.
      </div>
    </>
  );
}
