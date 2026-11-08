import { Building2 } from "lucide-react";
import { COMPANY_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          {COMPANY_NAME}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
