import Link from "next/link";
import { ArrowRight, FileText, LineChart, Settings, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface QuickAccessCard {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const CARDS: QuickAccessCard[] = [
  {
    href: "/fichas",
    title: "Fichas",
    description: "Listado, búsqueda y carga de fichas de pacientes.",
    icon: FileText,
  },
  {
    href: "/fichas/nueva",
    title: "Nueva ficha",
    description: "Cargar un paciente nuevo sin pasar por el listado.",
    icon: Users,
  },
  {
    href: "/reportes",
    title: "Reportes",
    description: "Estadísticas de producción y ventas.",
    icon: LineChart,
    disabled: true,
  },
  {
    href: "/configuracion",
    title: "Configuración",
    description: "Ajustes generales, copias de seguridad y usuarios.",
    icon: Settings,
    disabled: true,
  },
];

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Bienvenido
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Optica App</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Sistema interno para digitalizar y gestionar las fichas de pacientes
          de la óptica. Esta es la base de la versión 1 (mock local).
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          const inner = (
            <>
              <div className="flex size-10 items-center justify-center rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                <Icon className="size-5" />
              </div>
              <h2 className="text-base font-semibold tracking-tight">{card.title}</h2>
              <p
                className={
                  card.disabled
                    ? "text-sm text-muted-foreground/60"
                    : "text-sm text-muted-foreground"
                }
              >
                {card.description}
              </p>
              {!card.disabled && (
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-teal-700 dark:text-teal-300">
                  Ir
                  <ArrowRight className="size-3.5" />
                </span>
              )}
              {card.disabled && (
                <span className="mt-auto inline-flex w-fit items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Próximamente
                </span>
              )}
            </>
          );
          const className =
            "group flex h-full flex-col items-start gap-2 rounded-lg border border-border bg-card p-5 shadow-sm transition-all" +
            (card.disabled
              ? " cursor-not-allowed opacity-60"
              : " hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:hover:border-teal-700");
          return card.disabled ? (
            <div key={card.href} className={className} aria-disabled>
              {inner}
            </div>
          ) : (
            <Link key={card.href} href={card.href} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
