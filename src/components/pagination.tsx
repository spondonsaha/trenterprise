import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page" || value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, item));
      } else {
        params.set(key, value);
      }
    }
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        Showing <span className="font-medium text-slate-700">{start}</span>–
        <span className="font-medium text-slate-700">{end}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="mr-1 text-xs text-slate-500">
          Page {safePage} of {totalPages}
        </span>
        <Link
          href={hrefFor(Math.max(1, safePage - 1))}
          aria-disabled={safePage <= 1}
          className={cn(
            "inline-flex h-10 items-center gap-1 rounded-md border border-border bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50",
            safePage <= 1 && "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Link>
        <Link
          href={hrefFor(Math.min(totalPages, safePage + 1))}
          aria-disabled={safePage >= totalPages}
          className={cn(
            "inline-flex h-10 items-center gap-1 rounded-md border border-border bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50",
            safePage >= totalPages && "pointer-events-none opacity-40",
          )}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
