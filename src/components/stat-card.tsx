import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  blue: "bg-primary/10 text-primary",
  teal: "bg-accent/10 text-accent",
  green: "bg-success/10 text-success",
  amber: "bg-warning/10 text-warning",
  red: "bg-danger/10 text-danger",
  slate: "bg-muted text-muted-foreground",
};

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "blue",
  className,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-5 shadow-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
          <p className="num mt-2 text-2xl font-semibold leading-tight tracking-tight text-foreground">
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
