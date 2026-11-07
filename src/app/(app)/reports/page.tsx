import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileSpreadsheet, FileText, Filter } from "lucide-react";
import { InvoiceStatus } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SalesChart } from "@/components/dashboard/sales-chart";
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
import {
  REPORT_TYPES,
  generateReport,
  isReportType,
  type ReportResult,
} from "@/lib/reports";
import { cn, formatDate, getStringParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Reports",
};

const selectClass =
  "h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

async function buildSalesChart(range: ReportResult["range"]) {
  const invoices = await prisma.invoice.findMany({
    where: {
      date: { gte: new Date(`${range.from}T00:00:00.000Z`), lt: new Date(`${range.to}T23:59:59.999Z`) },
      status: { notIn: [InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED] },
    },
    select: { date: true, total: true },
  });

  const totals = new Map<string, number>();
  for (const invoice of invoices) {
    const key = invoice.date.toISOString().slice(0, 10);
    totals.set(key, (totals.get(key) ?? 0) + Number(invoice.total));
  }

  const start = new Date(`${range.from}T00:00:00.000Z`);
  const end = new Date(`${range.to}T00:00:00.000Z`);
  const points: { label: string; date: string; total: number }[] = [];
  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = new Date(cursor.getTime() + 86_400_000)) {
    const key = cursor.toISOString().slice(0, 10);
    points.push({
      label: cursor.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      date: key,
      total: totals.get(key) ?? 0,
    });
    if (points.length >= 92) break;
  }
  return points;
}

export default async function ReportsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;
  await requirePageUser();
  const requested = getStringParam(searchParams, "type") ?? "sales";
  const type = isReportType(requested) ? requested : "sales";
  const from = getStringParam(searchParams, "from");
  const to = getStringParam(searchParams, "to");

  const report = await generateReport(type, from, to);
  const chartData = type === "sales" ? await buildSalesChart(report.range) : [];
  const meta = REPORT_TYPES.find((reportType) => reportType.value === type)!;
  const exportQuery = `type=${type}&from=${report.range.from}&to=${report.range.to}`;
  const previewRows = report.rows.slice(0, 50);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales, stock, dues, payments and price history for TR Enterprise."
      >
        <Button variant="outline" asChild>
          <a href={`/api/reports/csv?${exportQuery}`} target="_blank" rel="noreferrer">
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
        <Button asChild>
          <a href={`/api/reports/pdf?${exportQuery}`} target="_blank" rel="noreferrer">
            <Download className="h-4 w-4" />
            Export PDF
          </a>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <div className="space-y-1.5">
              <label htmlFor="report-type" className="text-xs font-medium text-slate-500">
                Report
              </label>
              <select id="report-type" name="type" defaultValue={type} className={selectClass}>
                {REPORT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="report-from" className="text-xs font-medium text-slate-500">
                From
              </label>
              <Input
                id="report-from"
                name="from"
                type="date"
                defaultValue={report.range.from}
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="report-to" className="text-xs font-medium text-slate-500">
                To
              </label>
              <Input
                id="report-to"
                name="to"
                type="date"
                defaultValue={report.range.to}
                className="bg-white"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <Filter className="h-4 w-4" />
                Generate
              </Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-slate-500">{meta.description}</p>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {report.summary.map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-white p-4 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {item.label}
            </p>
            <p className="mt-1.5 truncate text-lg font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      {type === "sales" ? (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Daily sales</CardTitle>
            <CardDescription>
              {report.range.fromLabel} to {report.range.toLabel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart data={chartData} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-5">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{report.title}</CardTitle>
            <CardDescription>{report.subtitle}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/reports/csv?${exportQuery}`} target="_blank" rel="noreferrer">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/reports/pdf?${exportQuery}`} target="_blank" rel="noreferrer">
                <FileText className="h-3.5 w-3.5" />
                PDF
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {report.rows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No data for this report"
              description="Try a different date range or report type."
              action={
                <Button variant="outline" asChild>
                  <Link href={`/reports?type=${type}`}>Reset dates</Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                      {report.columns.map((column) => (
                        <th
                          key={column.key}
                          className={cn(
                            "whitespace-nowrap px-3 py-2.5 font-medium",
                            column.align === "right" && "text-right",
                            column.align === "center" && "text-center",
                          )}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewRows.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50/60">
                        {report.columns.map((column) => (
                          <td
                            key={column.key}
                            className={cn(
                              "px-3 py-2.5 text-slate-700",
                              column.align === "right" && "text-right",
                              column.align === "center" && "text-center",
                            )}
                          >
                            {row[column.key] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Showing {previewRows.length} of {report.rows.length} row
                {report.rows.length === 1 ? "" : "s"}. Export for the full report
                {report.rows.length > previewRows.length ? " — preview is limited to 50 rows" : ""}.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-slate-400">
        Generated {formatDate(new Date())} · amounts exclude drafts and cancelled invoices where
        applicable.
      </p>
    </>
  );
}
