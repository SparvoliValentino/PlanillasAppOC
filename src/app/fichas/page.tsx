"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, FileSearch, Inbox, ChevronLeft, ChevronRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/layout/KpiCard";

import type { FichaSummary, Paginated } from "@/features/fichas/domain/ficha.types";
import { formatDate } from "@/features/fichas/ui/format";

const DEFAULT_PAGE_SIZE = 20;

interface ApiListResponse {
  data: Paginated<FichaSummary>;
}

interface ApiErrorResponse {
  error: string;
  message: string;
}

export default function FichasListadoPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<FichaSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/fichas", window.location.origin);
        url.searchParams.set("page", String(page));
        url.searchParams.set("pageSize", String(DEFAULT_PAGE_SIZE));
        if (query.trim() !== "") url.searchParams.set("q", query.trim());
        const response = await fetch(url.toString(), { signal });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
          throw new Error(body?.message ?? `Error ${response.status}`);
        }
        const body = (await response.json()) as ApiListResponse;
        setData(body.data);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Error desconocido";
        setError(message);
        toast.error("No se pudo cargar el listado", { description: message });
      } finally {
        setLoading(false);
      }
    },
    [page, query],
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const kpis = useMemo(() => {
    if (!data) return null;
    const today = new Date().toISOString().slice(0, 10);
    const last7 = (() => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      return cutoff.toISOString().slice(0, 10);
    })();
    const todayCount = data.items.filter((f) => f.fechaEntrada === today).length;
    const recentCount = data.items.filter((f) => f.fechaEntrada >= last7).length;
    return {
      total: data.total,
      onPage: data.items.length,
      recentCount,
      todayCount,
    };
  }, [data]);

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pacientes
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Fichas</h1>
          <p className="text-sm text-muted-foreground">
            Buscá por número de ficha, nombre, teléfono o documento.
          </p>
        </div>
        <Link href="/fichas/nueva" className={buttonVariants({ size: "lg" })}>
          <Plus className="mr-1 size-4" />
          Nueva ficha
        </Link>
      </header>

      {kpis && !loading && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Total de fichas" value={kpis.total} icon={FileSearch} accent="teal" />
          <KpiCard label="En esta página" value={kpis.onPage} icon={Inbox} accent="sky" />
          <KpiCard label="Ingresos últimos 7 días" value={kpis.recentCount} icon={Inbox} accent="amber" />
          <KpiCard label="Cargadas hoy" value={kpis.todayCount} icon={Inbox} accent="rose" />
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <form
          className="flex w-full max-w-md items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            void load();
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, teléfono o documento…"
              aria-label="Buscar fichas"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={loading}>
            Buscar
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {loading && !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">No se pudo cargar el listado: {error}</p>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <Inbox className="size-6" />
            </div>
            <p className="text-sm text-muted-foreground">
              {query.trim() === ""
                ? "Todavía no hay fichas cargadas. Empezá creando la primera."
                : "No encontramos fichas que coincidan con tu búsqueda."}
            </p>
            <Link href="/fichas/nueva" className={buttonVariants({ variant: "outline" })}>
              <Plus className="mr-1 size-4" />
              Crear la primera ficha
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50 dark:bg-zinc-900/40">
                <TableHead className="w-20 font-semibold">N°</TableHead>
                <TableHead className="font-semibold">Nombre</TableHead>
                <TableHead className="font-semibold">Teléfono</TableHead>
                <TableHead className="font-semibold">Fecha de entrada</TableHead>
                <TableHead className="w-28 text-right font-semibold">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((ficha) => (
                <TableRow
                  key={ficha.nroFicha}
                  className="transition-colors hover:bg-teal-50/40 dark:hover:bg-teal-950/20"
                >
                  <TableCell className="font-mono font-medium">{ficha.nroFicha}</TableCell>
                  <TableCell>
                    {ficha.nombre === "" ? (
                      <span className="text-muted-foreground italic">Sin nombre</span>
                    ) : (
                      ficha.nombre
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {ficha.telefono || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(ficha.fechaEntrada) || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/fichas/${ficha.nroFicha}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Abrir
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>
            Mostrando <span className="font-medium text-foreground">{data.items.length}</span> de{" "}
            <span className="font-medium text-foreground">{data.total}</span> fichas
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="mr-1 size-3.5" />
              Anterior
            </Button>
            <span>
              Página <span className="font-medium text-foreground">{page}</span> de{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Siguiente
              <ChevronRight className="ml-1 size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
