"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  Truck,
  UserCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { GlobalSearch } from "@/components/global-search";
import { QuickActions } from "@/components/quick-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COMPANY_NAME, ROLE_LABELS } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import type { SessionUser } from "@/types/next-auth";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  shortLabel?: string;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortLabel: "Home" }],
  },
  {
    label: "Sell",
    items: [
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/dues", label: "Unpaid Bills", icon: CircleDollarSign, shortLabel: "Unpaid" },
      { href: "/payments", label: "Payments", icon: Wallet },
    ],
  },
  {
    label: "Stock",
    items: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/inventory", label: "Stock", icon: Boxes },
      { href: "/suppliers", label: "Suppliers", icon: Truck, adminOnly: true },
    ],
  },
  {
    label: "People",
    items: [{ href: "/customers", label: "Customers", icon: Users }],
  },
  {
    label: "Insights",
    items: [{ href: "/reports", label: "Reports", icon: BarChart3 }],
  },
  {
    label: "Admin",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
      { href: "/users", label: "Users & Roles", icon: UserCog, adminOnly: true },
      { href: "/audit", label: "Audit Log", icon: ScrollText, adminOnly: true },
    ],
  },
];

const BOTTOM_NAV_LEFT: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/invoices", label: "Sales", icon: ReceiptText },
];

const BOTTOM_NAV_RIGHT: NavItem[] = [
  { href: "/inventory", label: "Stock", icon: Boxes },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
        collapsed && "justify-center",
      )}
      aria-label={`${COMPANY_NAME} dashboard`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-brand-600 text-sm font-black tracking-tight text-white shadow-lg shadow-teal-900/30">
        TR
      </span>
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold leading-tight text-white">
            {COMPANY_NAME}
          </span>
          <span className="block truncate text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
            Ink · Toner · ERP
          </span>
        </span>
      ) : null}
    </Link>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-slate-300 hover:bg-white/5 hover:text-white",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? (
        <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-teal-400" aria-hidden="true" />
      ) : null}
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-teal-300" : "text-slate-400 group-hover:text-slate-200")} />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

function SidebarContent({
  user,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  user: SessionUser;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || user.role === "ADMIN"),
  })).filter((group) => group.items.length > 0);

  function toggleGroup(label: string) {
    setClosedGroups((current) => ({ ...current, [label]: !current[label] }));
  }

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-20 items-center border-b border-white/10 px-5", collapsed && "justify-center px-0")}>
        <Brand collapsed={collapsed} />
      </div>
      <nav className={cn("flex-1 overflow-y-auto scrollbar-thin px-3 py-4", collapsed && "px-2")} aria-label="Main navigation">
        {groups.map((group) => {
          const key = group.label ?? "main";
          const closed = Boolean(closedGroups[key]);
          return (
            <div key={key} className="pb-1">
              {!collapsed && group.label ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 transition-colors hover:text-slate-300"
                  aria-expanded={!closed}
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      closed && "-rotate-90",
                    )}
                  />
                </button>
              ) : null}
              {!closed || collapsed
                ? group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(pathname, item.href)}
                      collapsed={collapsed}
                      onNavigate={onNavigate}
                    />
                  ))
                : null}
            </div>
          );
        })}
      </nav>
      <div className={cn("border-t border-white/10 p-3", collapsed && "px-2")}>
        {!collapsed ? (
          <div className="rounded-lg bg-white/5 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
              {ROLE_LABELS[user.role]} access
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-400">{user.email}</p>
          </div>
        ) : (
          <div className="flex h-9 items-center justify-center rounded-lg bg-white/5 text-[10px] font-bold text-slate-300">
            {user.role === "ADMIN" ? "AD" : "ST"}
          </div>
        )}
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem("tr-sidebar-collapsed") === "true");
    } catch {
      // Ignore storage access failures.
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("tr-sidebar-collapsed", String(next));
      } catch {
        // Ignore storage access failures.
      }
      return next;
    });
  }

  const section = useMemo(() => {
    const all = NAV_GROUPS.flatMap((group) => group.items);
    return all.find((item) => isActive(pathname, item.href))?.label ?? "Dashboard";
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-800 bg-ink shadow-xl transition-[width] duration-200 lg:block",
          collapsed ? "w-20" : "w-72",
        )}
        aria-label="Sidebar"
      >
        <SidebarContent user={user} pathname={pathname} collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          className="absolute -right-3 top-24 flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition-colors hover:text-primary"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative h-full w-72 max-w-[85vw] border-r border-slate-800 bg-ink shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-5 z-10 rounded-md p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              user={user}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            <div className="border-t border-white/10 p-3">
              <Button
                variant="ghost"
                className="w-full justify-start text-slate-200 hover:bg-white/10 hover:text-white"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-20" : "lg:pl-72",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                {COMPANY_NAME}
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">{section}</p>
            </div>
            <GlobalSearch />
            <QuickActions user={user} />
            <Badge variant="outline" className="hidden border-teal-200 bg-teal-50 text-teal-700 sm:inline-flex">
              {ROLE_LABELS[user.role]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-border bg-white p-1 pr-2 text-left shadow-sm outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring sm:pr-3"
                  aria-label="Account menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-primary">
                    {initials(user.name || user.email)}
                  </span>
                  <span className="hidden max-w-36 sm:block">
                    <span className="block truncate text-xs font-semibold text-slate-900">
                      {user.name}
                    </span>
                    <span className="block truncate text-[10px] text-slate-500">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="normal-case tracking-normal">
                  <span className="block text-sm font-semibold text-slate-900">{user.name}</span>
                  <span className="block truncate text-xs font-normal text-slate-500">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>

        <footer className="border-t border-border bg-white px-4 py-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Invoices, receivables and carton-level stock control.
          </p>
        </footer>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Quick navigation"
      >
        <div className="grid grid-cols-5">
          {BOTTOM_NAV_LEFT.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium",
                  active ? "text-primary" : "text-slate-500",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                {item.shortLabel ?? item.label}
              </Link>
            );
          })}
          <QuickActions user={user} mode="mobile" />
          {BOTTOM_NAV_RIGHT.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium",
                  active ? "text-primary" : "text-slate-500",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" />
                {item.shortLabel ?? item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium text-slate-500"
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
