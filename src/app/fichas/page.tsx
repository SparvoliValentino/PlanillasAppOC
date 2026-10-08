"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Inbox,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/http/apiFetch";
import { KpiCard } from "@/components/layout/KpiCard";

import { FICHA_SORT_FIELDS } from "@/features/fichas/domain/ficha.types";
import type {
  FichaSortField,
  ListFichasResult,
  SortDirection,
} from "@/features/fichas/domain/ficha.types";
import { MIN_PHONE_SEARCH_DIGITS } from "@/features/fichas/domain/ficha.schema";
import { formatDate, formatDateTime } from "@/features/fichas/ui/format";

const DEFAULT_PAGE_SIZE = 20;

interface ApiListResponse {
  data: ListFichasResult;
}

interface ApiErrorResponse {
  error: string;
  message: string;
}

const SORT_LABELS: Record<FichaSortField, string> = {
  fechaCarga: "Fecha de carga",
  fechaEntrada: "Fecha de entrada",
  nombre: "Nombre (A–Z)",
  nroFicha: "N° de ficha",
};

interface ListState {
  q: string;
  nombre: string;
  telefono: string;
  /** Show voided fichas too (`incluirAnuladas=true` in the URL). */
  incluirAnuladas: boolean;
  sortBy: FichaSortField;
  /** `null` means "not in the URL": the default for `sortBy` applies. */
  sortDir: SortDirection | null;
  page: number;
}

function defaultDirection(sortBy: FichaSortField): SortDirection {
  return sortBy === "fechaCarga" || sortBy === "fechaEntrada" ? "desc" : "asc";
}

function readState(params: URLSearchParams): ListState {
  const sortByRaw = params.get("sortBy");
  const sortBy = FICHA_SORT_FIELDS.find((f) => f === sortByRaw) ?? "fechaCarga";
  const sortDirRaw = params.get("sortDir");
  const sortDir = sortDirRaw === "asc" || sortDirRaw === "desc" ? sortDirRaw : null;
  const pageRaw = Number(params.get("page"));
  return {
    q: params.get("q") ?? "",
    nombre: params.get("nombre") ?? "",
    telefono: params.get("telefono") ?? "",
    incluirAnuladas: params.get("incluirAnuladas") === "true",
    sortBy,
    sortDir,
    page: Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1,
  };
}

function toSearch(state: ListState): string {
  const params = new URLSearchParams();
  if (state.q.trim() !== "") params.set("q", state.q.trim());
  if (state.nombre.trim() !== "") params.set("nombre", state.nombre.trim());
  if (state.telefono.trim() !== "") params.set("telefono", state.telefono.trim());
  if (state.incluirAnuladas) params.set("incluirAnuladas", "true");
  if (state.sortBy !== "fechaCarga") params.set("sortBy", state.sortBy);
  if (state.sortDir !== null) params.set("sortDir", state.sortDir);
  if (state.page > 1) params.set("page", String(state.page));
  return params.toString();
}

/** Large, centered spinner shown in the table area while fichas load. */
function TableLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-xl bg-card/90 px-10 py-8 text-teal-700 dark:text-teal-300"
    >
      <Loader2 className="size-14 animate-spin" aria-hidden />
      <span className="text-lg font-medium text-foreground">Cargando fichas…</span>
    </div>
  );
}

export default function FichasListadoPage() {
  // `useSearchParams` requires a Suspense boundary for prerendering.
  return (
    <Suspense
      fallback={
        <div className="flex min-h-96 items-center justify-center">
          <TableLoader />
        </div>
      }
    >
      <FichasListado />
    </Suspense>
  );
}

function FichasListado() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  // The URL is the source of truth for the applied filters, sort and page.
  const applied = useMemo(() => readState(new URLSearchParams(searchKey)), [searchKey]);
  const effectiveDir = applied.sortDir ?? defaultDirection(applied.sortBy);

  // Draft values of the text inputs; re-synced whenever the URL changes
  // (e.g. a Topbar search while already on /fichas, or back/forward).
  const [draft, setDraft] = useState({ q: applied.q, nombre: applied.nombre, telefono: applied.telefono });
  const [syncedKey, setSyncedKey] = useState(searchKey);
  if (syncedKey !== searchKey) {
    setSyncedKey(searchKey);
    setDraft({ q: applied.q, nombre: applied.nombre, telefono: applied.telefono });
  }
  const [telefonoError, setTelefonoError] = useState<string | null>(null);

  const [data, setData] = useState<ListFichasResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useCallback(
    (next: ListState) => {
      const search = toSearch(next);
      router.replace(search === "" ? "/fichas" : `/fichas?${search}`);
    },
    [router],
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/fichas", window.location.origin);
        url.searchParams.set("page", String(applied.page));
        url.searchParams.set("pageSize", String(DEFAULT_PAGE_SIZE));
        if (applied.q.trim() !== "") url.searchParams.set("q", applied.q.trim());
        if (applied.nombre.trim() !== "") url.searchParams.set("nombre", applied.nombre.trim());
        if (applied.telefono.trim() !== "") url.searchParams.set("telefono", applied.telefono.trim());
        if (applied.incluirAnuladas) url.searchParams.set("incluirAnuladas", "true");
        url.searchParams.set("sortBy", applied.sortBy);
        url.searchParams.set("sortDir", effectiveDir);
        const response = await apiFetch(url.toString(), { signal });
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
    [applied, effectiveDir],
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const totalPages = data?.totalPages ?? 1;
  const hasFilters = applied.q !== "" || applied.nombre !== "" || applied.telefono !== "";

  function submitFilters(event: React.FormEvent) {
    event.preventDefault();
    const digits = draft.telefono.replace(/\D/g, "");
    if (draft.telefono.trim() !== "" && digits.length < MIN_PHONE_SEARCH_DIGITS) {
      setTelefonoError(`Ingresá al menos ${MIN_PHONE_SEARCH_DIGITS} dígitos.`);
      return;
    }
    setTelefonoError(null);
    navigate({ ...applied, ...draft, page: 1 });
  }

  function clearFilters() {
    setTelefonoError(null);
    setDraft({ q: "", nombre: "", telefono: "" });
    navigate({ ...applied, q: "", nombre: "", telefono: "", page: 1 });
  }

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
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Pacientes
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Fichas</h1>
          <p className="text-base text-muted-foreground">
            Buscá, filtrá y ordená por número de ficha, nombre, teléfono o fechas.
          </p>
        </div>
        <Link href="/fichas/nueva" className={buttonVariants({ size: "lg" })}>
          <Plus className="mr-1 size-5" />
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

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <form className="flex w-full flex-col gap-3" onSubmit={submitFilters}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draft.q}
                onChange={(event) => setDraft((d) => ({ ...d, q: event.target.value }))}
                placeholder="Buscar por N°, nombre, teléfono o documento…"
                aria-label="Buscar fichas"
                className="h-11 pl-11 text-base md:text-base"
              />
            </div>
            <Input
              value={draft.nombre}
              onChange={(event) => setDraft((d) => ({ ...d, nombre: event.target.value }))}
              placeholder="Nombre"
              aria-label="Filtrar por nombre"
              className="h-11 text-base md:text-base"
            />
            <div className="flex flex-col gap-1">
              <Input
                value={draft.telefono}
                onChange={(event) => setDraft((d) => ({ ...d, telefono: event.target.value }))}
                placeholder="Teléfono"
                aria-label="Filtrar por teléfono"
                inputMode="tel"
                aria-invalid={telefonoError !== null}
                className="h-11 text-base md:text-base"
              />
              {telefonoError && <p className="text-sm text-destructive">{telefonoError}</p>}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
                {loading ? "Buscando…" : "Buscar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                disabled={loading || (!hasFilters && draft.q === "" && draft.nombre === "" && draft.telefono === "")}
              >
                Limpiar filtros
              </Button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-base text-muted-foreground">
              <input
                type="checkbox"
                checked={applied.incluirAnuladas}
                onChange={(event) =>
                  navigate({ ...applied, incluirAnuladas: event.target.checked, page: 1 })
                }
                className="size-5 accent-teal-700"
              />
              Mostrar anuladas
            </label>
            <div className="flex items-center gap-2">
              <label htmlFor="ordenar-por" className="text-base text-muted-foreground">
                Ordenar por
              </label>
              <select
                id="ordenar-por"
                value={applied.sortBy}
                onChange={(event) =>
                  navigate({
                    ...applied,
                    sortBy: event.target.value as FichaSortField,
                    sortDir: null,
                    page: 1,
                  })
                }
                className="h-11 rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {FICHA_SORT_FIELDS.map((field) => (
                  <option key={field} value={field}>
                    {SORT_LABELS[field]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  navigate({
                    ...applied,
                    sortDir: effectiveDir === "asc" ? "desc" : "asc",
                    page: 1,
                  })
                }
                aria-label={
                  effectiveDir === "asc"
                    ? "Orden ascendente. Cambiar a descendente"
                    : "Orden descendente. Cambiar a ascendente"
                }
                title={effectiveDir === "asc" ? "Ascendente" : "Descendente"}
              >
                {effectiveDir === "asc" ? (
                  <ArrowUpNarrowWide className="size-5" />
                ) : (
                  <ArrowDownNarrowWide className="size-5" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <div
        className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        aria-busy={loading}
      >
        {loading && data && (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/60 pt-24 backdrop-blur-[1px]">
            <TableLoader />
          </div>
        )}
        {loading && !data ? (
          <div className="flex min-h-96 items-center justify-center">
            <TableLoader />
          </div>
        ) : error ? (
          <p className="p-6 text-base text-destructive">No se pudo cargar el listado: {error}</p>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <Inbox className="size-7" />
            </div>
            <p className="text-base text-muted-foreground">
              {hasFilters
                ? "No encontramos fichas que coincidan con los filtros aplicados."
                : "Todavía no hay fichas cargadas. Empezá creando la primera."}
            </p>
            <Link href="/fichas/nueva" className={buttonVariants({ variant: "outline" })}>
              <Plus className="mr-1 size-5" />
              Crear la primera ficha
            </Link>
          </div>
        ) : (
          <div className={loading ? "pointer-events-none opacity-40" : undefined}>
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50 dark:bg-zinc-900/40">
                <TableHead className="w-20 font-semibold">N°</TableHead>
                <TableHead className="font-semibold">Nombre</TableHead>
                <TableHead className="font-semibold">Teléfono</TableHead>
                <TableHead className="font-semibold">Fecha de entrada</TableHead>
                <TableHead className="font-semibold">Fecha de carga</TableHead>
                <TableHead className="w-32 text-right font-semibold">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((ficha) => (
                <TableRow
                  key={ficha.nroFicha}
                  className={
                    ficha.anuladaAt
                      ? "bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/60"
                      : "transition-colors hover:bg-teal-50/40 dark:hover:bg-teal-950/20"
                  }
                >
                  <TableCell className="font-mono font-medium">{ficha.nroFicha}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {ficha.nombre === "" ? (
                        <span className="text-muted-foreground italic">Sin nombre</span>
                      ) : (
                        <span className={ficha.anuladaAt ? "line-through" : undefined}>
                          {ficha.nombre}
                        </span>
                      )}
                      {ficha.anuladaAt && (
                        <Badge
                          variant="destructive"
                          title={`Anulada el ${formatDateTime(ficha.anuladaAt)}`}
                        >
                          Anulada
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {ficha.telefono || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(ficha.fechaEntrada) || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(ficha.fechaCarga) || "—"}
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
          </div>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-base text-muted-foreground">
          <p>
            Mostrando <span className="font-medium text-foreground">{data.items.length}</span> de{" "}
            <span className="font-medium text-foreground">{data.total}</span> fichas
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ ...applied, page: Math.max(1, applied.page - 1) })}
              disabled={applied.page <= 1 || loading}
            >
              <ChevronLeft className="mr-1 size-4" />
              Anterior
            </Button>
            <span>
              Página <span className="font-medium text-foreground">{applied.page}</span> de{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ ...applied, page: Math.min(totalPages, applied.page + 1) })}
              disabled={applied.page >= totalPages || loading}
            >
              Siguiente
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
