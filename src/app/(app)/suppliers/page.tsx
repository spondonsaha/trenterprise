import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Search, Truck, X } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
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
import { requirePageAdmin } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { formatDate, getStringParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Suppliers",
};

export default async function SuppliersPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;
  await requirePageAdmin();
  const q = (getStringParam(searchParams, "q") ?? "").trim();

  const where: Prisma.SupplierWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { contactPerson: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [suppliers, purchases] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { purchases: true } } },
    }),
    prisma.purchase.findMany({
      orderBy: { purchaseDate: "desc" },
      take: 10,
      include: {
        supplier: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Manage the vendors that supply TR Enterprise's ink, toner and cartridge stock."
      >
        <Button asChild>
          <Link href="/suppliers/new">
            <Plus className="h-4 w-4" />
            Add supplier
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Supplier directory</CardTitle>
            <CardDescription>
              {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <div className="border-y border-border bg-slate-50/60 px-4 py-3">
            <form method="get" className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search supplier, contact, phone or email..."
                  className="bg-white pl-9"
                />
              </div>
              <Button type="submit" size="sm" className="h-11 px-4">
                Search
              </Button>
              {q ? (
                <Button variant="ghost" size="sm" className="h-11 px-3" asChild>
                  <Link href="/suppliers" aria-label="Clear search">
                    <X className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </form>
          </div>
          {suppliers.length === 0 ? (
            <EmptyState
              icon={Truck}
              title={q ? "No suppliers match your search" : "No suppliers yet"}
              description={
                q
                  ? "Try a different name, contact or phone number."
                  : "Add a supplier so purchases can be attributed to a vendor."
              }
              action={
                !q ? (
                  <Button asChild>
                    <Link href="/suppliers/new">
                      <Plus className="h-4 w-4" />
                      Add supplier
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Supplier</th>
                    <th className="px-5 py-3 font-medium">Contact</th>
                    <th className="px-5 py-3 font-medium">Purchases</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{supplier.name}</p>
                        {supplier.address ? (
                          <p className="max-w-[220px] truncate text-xs text-slate-500">
                            {supplier.address}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-slate-700">{supplier.contactPerson ?? "—"}</p>
                        <p className="text-xs text-slate-500">
                          {[supplier.phone, supplier.email].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{supplier._count.purchases}</td>
                      <td className="px-5 py-3">
                        {supplier.active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="muted">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/suppliers/${supplier.id}/edit`}>
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent purchases</CardTitle>
            <CardDescription>Latest stock-in receipts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {purchases.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No purchases recorded yet.
              </p>
            ) : (
              purchases.map((purchase) => (
                <div key={purchase.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {purchase.purchaseNumber}
                    </p>
                    <span className="text-sm font-medium text-slate-900">
                      {formatMoney(purchase.totalCost)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {purchase.supplier?.name ?? "Direct purchase"} ·{" "}
                    {formatDate(purchase.purchaseDate)} · {purchase._count.items} item
                    {purchase._count.items === 1 ? "" : "s"}
                  </p>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/inventory/stock-in">Record stock in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
