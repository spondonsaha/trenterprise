"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  FileText,
  PackagePlus,
  Plus,
  Truck,
  UserPlus,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/types/next-auth";

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export function QuickActions({
  user,
  mode = "header",
}: {
  user: SessionUser;
  mode?: "header" | "mobile";
}) {
  const canManageProducts = user.role === "ADMIN" || user.canOverridePrice;

  const actions: QuickAction[] = [
    {
      href: "/invoices/new?mode=quick",
      label: "Quick invoice",
      description: "Customer and total only",
      icon: Zap,
    },
    {
      href: "/invoices/new",
      label: "Itemized invoice",
      description: "Bill products and stock",
      icon: FileText,
    },
    {
      href: "/inventory/stock-in",
      label: "Stock in",
      description: "Add cartons or pieces",
      icon: ArrowDownToLine,
    },
    {
      href: "/customers/new",
      label: "Add customer",
      description: "Create a customer account",
      icon: UserPlus,
    },
  ];

  if (canManageProducts) {
    actions.push({
      href: "/products/new",
      label: "Add product",
      description: "Create a new item",
      icon: PackagePlus,
    });
  }

  if (user.role === "ADMIN") {
    actions.push({
      href: "/suppliers/new",
      label: "Add supplier",
      description: "Create a supplier record",
      icon: Truck,
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {mode === "mobile" ? (
          <button
            type="button"
            className="group flex min-h-[56px] flex-col items-center justify-center px-1 text-[10px] font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Quick actions"
          >
            <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-4 ring-white transition-colors group-hover:bg-primary-hover">
              <Plus className="h-6 w-6" />
            </span>
            <span className="mt-0.5">New</span>
          </button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="gap-1.5 px-3 sm:px-4"
            aria-label="Quick actions"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={mode === "mobile" ? "center" : "end"}
        side={mode === "mobile" ? "top" : "bottom"}
        sideOffset={mode === "mobile" ? 10 : 8}
        className="w-64"
      >
        <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem key={action.href} asChild className="items-start p-0">
              <Link href={action.href} className="flex w-full items-start gap-3 px-2 py-2">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900">{action.label}</span>
                  <span className="block text-xs text-slate-500">{action.description}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
