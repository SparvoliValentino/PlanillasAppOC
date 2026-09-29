"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Glasses, Home, LineChart, Settings, Users } from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Items without a route yet (e.g. Reportes) render as disabled. */
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/fichas", label: "Fichas", icon: Users },
  { href: "/reportes", label: "Reportes", icon: LineChart, disabled: true },
  { href: "/configuracion", label: "Configuración", icon: Settings, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-teal-600 text-white">
          <Glasses className="size-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Optica App</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Gestión de fichas
          </span>
        </div>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const className = cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            active
              ? "bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
              : "text-muted-foreground hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800",
            item.disabled && "pointer-events-none opacity-50",
          );
          const content = (
            <>
              <Icon
                className={cn(
                  "size-4",
                  active ? "text-teal-600 dark:text-teal-300" : "text-muted-foreground",
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.disabled && (
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Pronto
                </span>
              )}
            </>
          );
          return item.disabled ? (
            <span key={item.href} className={className} aria-disabled>
              {content}
            </span>
          ) : (
            <Link key={item.href} href={item.href} className={className} aria-current={active ? "page" : undefined}>
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
        v0.1 · Mock local
      </div>
    </aside>
  );
}
