import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "teal" | "amber" | "rose" | "sky";
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-200",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200",
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200",
};

export function KpiCard({ label, value, hint, icon: Icon, accent = "teal" }: KpiCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md",
          ACCENT_CLASSES[accent],
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-2xl font-semibold leading-tight">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
