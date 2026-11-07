import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, ShieldCheck, UserCog, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
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
import { requirePageAdmin } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Users",
};

export default async function UsersPage() {
  await requirePageAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      canOverridePrice: true,
      createdAt: true,
    },
  });

  const active = users.filter((user) => user.active).length;
  const admins = users.filter((user) => user.role === "ADMIN" && user.active).length;
  const priceOverrides = users.filter((user) => user.canOverridePrice).length;

  return (
    <>
      <PageHeader
        title="Users"
        description="Staff accounts, roles and price override permissions."
      >
        <Button asChild>
          <Link href="/users/new">
            <Plus className="h-4 w-4" />
            Add user
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Accounts" value={String(users.length)} hint="Total users" icon={Users} tone="blue" />
        <StatCard title="Active" value={String(active)} hint="Can sign in" icon={UserCog} tone="teal" />
        <StatCard
          title="Admins"
          value={String(admins)}
          hint={`${priceOverrides} user${priceOverrides === 1 ? "" : "s"} may override prices`}
          icon={ShieldCheck}
          tone="amber"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>User accounts</CardTitle>
          <CardDescription>
            Inactive accounts keep their history but cannot sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-y border-border bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Price override</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={user.role === "ADMIN" ? "teal" : "muted"}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      {user.canOverridePrice ? (
                        <Badge variant="outline">Allowed</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Not allowed</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      {user.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="muted">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/users/${user.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
