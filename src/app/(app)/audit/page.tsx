import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CalendarDays, ScrollText, Search, X } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
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
import { requirePageAdmin } from "@/lib/permissions";
import { PAGE_SIZE } from "@/lib/constants";
import {
  formatDateTime,
  getIntParam,
  getStringParam,
  parseDateOnly,
  startOfUtcDay,
} from "@/lib/utils";

export const metadata: Metadata = {
  title: "Audit log",
};

function actionLabel(action: string) {
  const words = action.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default async function AuditPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;
  await requirePageAdmin();
  const q = (getStringParam(searchParams, "q") ?? "").trim();
  const from = getStringParam(searchParams, "from") ?? "";
  const to = getStringParam(searchParams, "to") ?? "";
  const page = getIntParam(searchParams, "page", 1);

  const where: Prisma.AuditLogWhereInput = {};
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
      {
        user: {
          is: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: new Date(toDate.getTime() + 86_399_999) } : {}),
    };
  }

  const [total, logs, todayCount, entityTypes] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where: { createdAt: { gte: startOfUtcDay() } } }),
    prisma.auditLog.groupBy({
      by: ["entityType"],
      _count: { _all: true },
    }),
  ]);

  const activeFilters = Boolean(q || from || to);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="A permanent trail of invoices, payments, stock and account changes."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Entries"
          value={String(total)}
          hint="Matching current filters"
          icon={ScrollText}
          tone="blue"
        />
        <StatCard
          title="Today"
          value={String(todayCount)}
          hint="Actions recorded today"
          icon={CalendarDays}
          tone="teal"
        />
        <StatCard
          title="Entity types"
          value={String(entityTypes.length)}
          hint="Areas with recorded activity"
          icon={Activity}
          tone="amber"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Activity trail</CardTitle>
          <CardDescription>Newest entries first. Admins only.</CardDescription>
        </CardHeader>
        <div className="border-y border-border bg-slate-50/60 px-4 py-3">
          <form method="get" className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search action, entity, user..."
                className="bg-white pl-9"
              />
            </div>
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
                  <Link href="/audit" aria-label="Clear filters">
                    <X className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        {total === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={activeFilters ? "No audit entries match your filters" : "No activity yet"}
            description={
              activeFilters
                ? "Try a different search or date range."
                : "Actions will appear here as your team uses the system."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {log.user?.name ?? "System"}
                        </p>
                        {log.user?.email ? (
                          <p className="text-xs text-slate-500">{log.user.email}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{actionLabel(log.action)}</p>
                        <p className="font-mono text-[11px] text-slate-400">{log.action}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{log.entityType}</p>
                        {log.entityId ? (
                          <p className="max-w-[160px] truncate font-mono text-[11px] text-slate-400">
                            {log.entityId}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {log.details ? (
                          <details className="group">
                            <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                              View details
                            </summary>
                            <pre className="mt-2 max-w-[360px] overflow-x-auto rounded-md bg-slate-950 p-2 text-[11px] leading-relaxed text-slate-100">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
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
              basePath="/audit"
              searchParams={searchParams}
            />
          </>
        )}
      </Card>
    </>
  );
}
