"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  FileText,
  Loader2,
  Package,
  PackagePlus,
  Search,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { globalSearch, type SearchResult } from "@/app/actions/search";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const GROUP_LABELS: Record<SearchResult["group"], string> = {
  products: "Products",
  customers: "Customers",
  invoices: "Invoices",
  payments: "Payments",
};

const GROUP_ICONS: Record<SearchResult["group"], LucideIcon> = {
  products: Package,
  customers: Users,
  invoices: FileText,
  payments: Wallet,
};

type Shortcut = {
  href: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

const SHORTCUTS: Shortcut[] = [
  { href: "/invoices/new?mode=quick", title: "New sale", subtitle: "Customer and total only", icon: Zap },
  { href: "/inventory/stock-in", title: "Add stock", subtitle: "Add cartons or pieces", icon: ArrowDownToLine },
  { href: "/products/new", title: "Add product", subtitle: "Product, prices and opening stock", icon: PackagePlus },
  { href: "/dues", title: "Unpaid bills", subtitle: "See what customers still owe", icon: CircleDollarSign },
  { href: "/inventory", title: "Stock", subtitle: "Levels, low stock and movements", icon: Boxes },
];

function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform);
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [modKey, setModKey] = useState("Ctrl");

  useEffect(() => {
    setModKey(isMac() ? "⌘" : "Ctrl");
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      globalSearch(term)
        .then((next) => {
          if (!cancelled) {
            setResults(next);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setLoading(false);
          }
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  useEffect(() => {
    setActive(0);
  }, [query, results.length]);

  const searching = query.trim().length >= 2;
  const groups = useMemo(() => {
    const order: SearchResult["group"][] = ["products", "customers", "invoices", "payments"];
    return order
      .map((group) => ({ group, items: results.filter((result) => result.group === group) }))
      .filter((entry) => entry.items.length > 0);
  }, [results]);

  const flat = useMemo<Array<{ href: string }>>(() => {
    if (!searching) return SHORTCUTS;
    return groups.flatMap((entry) => entry.items);
  }, [searching, groups]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (flat.length === 0 ? 0 : (current + 1) % flat.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (flat.length === 0 ? 0 : (current - 1 + flat.length) % flat.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flat[active];
      if (item) go(item.href);
    }
  }

  let index = -1;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 gap-2 border-border bg-white text-slate-500 hover:text-slate-900"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden rounded border border-border bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 md:inline-flex">
          {modKey} K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search products, customers, invoices, receipts…"
              className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              autoFocus
            />
            {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" /> : null}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!searching ? (
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Quick actions
              </p>
            ) : null}

            {!searching
              ? SHORTCUTS.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const isActive = active === itemIndex;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => go(item.href)}
                      onMouseEnter={() => setActive(itemIndex)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                        isActive ? "bg-slate-100" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
                        <span className="block truncate text-xs text-slate-500">{item.subtitle}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    </button>
                  );
                })
              : null}

            {searching && !loading && flat.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500">
                Nothing found for “{query.trim()}”.
              </p>
            ) : null}

            {searching
              ? groups.map((entry) => (
                  <div key={entry.group} className="pb-1">
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {GROUP_LABELS[entry.group]}
                    </p>
                    {entry.items.map((item) => {
                      index += 1;
                      const itemIndex = index;
                      const Icon = GROUP_ICONS[item.group];
                      const isActive = active === itemIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => go(item.href)}
                          onMouseEnter={() => setActive(itemIndex)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                            isActive ? "bg-slate-100" : "hover:bg-slate-50",
                          )}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900">{item.title}</span>
                            <span className="block truncate text-xs text-slate-500">{item.subtitle}</span>
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                        </button>
                      );
                    })}
                  </div>
                ))
              : null}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
            <span className="hidden sm:inline">↑ ↓ to move · Enter to open · Esc to close</span>
            <span className="sm:hidden">Tap a result to open</span>
            <span className="font-semibold">{modKey} K</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
