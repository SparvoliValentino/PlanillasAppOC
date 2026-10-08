"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, ChevronLeft, Download, Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/http/apiFetch";

import type { Ficha } from "@/features/fichas/domain/ficha.types";
import { FichaCard } from "@/features/fichas/ui/FichaCard";
import { FichaForm } from "@/features/fichas/ui/FichaForm";
import { formatDateTime } from "@/features/fichas/ui/format";

interface ApiFichaResponse {
  data: Ficha;
}

interface ApiErrorResponse {
  error: string;
  message: string;
  details?: { path: string; message: string }[];
}

export default function FichaDetallePage() {
  const params = useParams<{ numero: string }>();
  const router = useRouter();
  const numero = Number(params?.numero);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [draft, setDraft] = useState<Ficha | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmingAnular, setConfirmingAnular] = useState(false);
  const [anulando, setAnulando] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!Number.isFinite(numero)) return;
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(`/api/fichas/${numero}`, { signal });
        if (response.status === 404) {
          setError("La ficha solicitada no existe.");
          setFicha(null);
          return;
        }
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
          throw new Error(body?.message ?? `Error ${response.status}`);
        }
        const body = (await response.json()) as ApiFichaResponse;
        setFicha(body.data);
        setDraft(body.data);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Error desconocido";
        setError(message);
        toast.error("No se pudo cargar la ficha", { description: message });
      } finally {
        setLoading(false);
      }
    },
    [numero],
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const {
        nroFicha: _nro,
        createdAt: _created,
        updatedAt: _updated,
        anuladaAt: _anulada,
        ...patch
      } = draft;
      void _nro;
      void _created;
      void _updated;
      void _anulada;
      const response = await apiFetch(`/api/fichas/${numero}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patch,
          expectedUpdatedAt: ficha?.updatedAt || undefined,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        if (response.status === 409) {
          // Someone else saved first: offer to discard edits and reload.
          toast.error("No se pudieron guardar los cambios", {
            description: body?.message ?? "La ficha fue modificada por otra persona.",
            action: {
              label: "Recargar",
              onClick: () => {
                setEditing(false);
                void load();
              },
            },
          });
          return;
        }
        const description = body?.details
          ? body.details.map((d) => `${d.path}: ${d.message}`).join("\n")
          : body?.message ?? `Error ${response.status}`;
        toast.error("No se pudieron guardar los cambios", { description });
        return;
      }
      const body = (await response.json()) as ApiFichaResponse;
      setFicha(body.data);
      setDraft(body.data);
      setEditing(false);
      toast.success("Ficha actualizada");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast.error("No se pudieron guardar los cambios", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleAnular = async () => {
    setAnulando(true);
    try {
      const response = await apiFetch(`/api/fichas/${numero}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: ficha?.updatedAt || undefined }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        setConfirmingAnular(false);
        if (response.status === 409) {
          // Changed or voided by someone else: offer to reload the current state.
          toast.error("No se pudo anular la ficha", {
            description: body?.message ?? "La ficha fue modificada por otra persona.",
            action: {
              label: "Recargar",
              onClick: () => {
                setEditing(false);
                void load();
              },
            },
          });
          return;
        }
        toast.error("No se pudo anular la ficha", {
          description: body?.message ?? `Error ${response.status}`,
        });
        return;
      }
      toast.success(`Ficha N° ${numero} anulada.`);
      router.push("/fichas");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setConfirmingAnular(false);
      toast.error("No se pudo anular la ficha", { description: message });
    } finally {
      setAnulando(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const response = await apiFetch(`/api/fichas/${numero}/pdf`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        toast.error("No se pudo descargar el PDF", {
          description: body?.message ?? `Error ${response.status}`,
        });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ficha-${numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast.error("No se pudo descargar el PDF", { description: message });
    } finally {
      setDownloading(false);
    }
  };

  const anulada = ficha?.anuladaAt ? formatDateTime(ficha.anuladaAt) : "";
  const isAnulada = Boolean(ficha?.anuladaAt);
  const cargada = ficha ? formatDateTime(ficha.createdAt) : "";
  const modificada = ficha ? formatDateTime(ficha.updatedAt) : "";
  const auditLine = [
    cargada && `Cargada el ${cargada}`,
    modificada && `Última modificación ${modificada}`,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!Number.isFinite(numero)) {
    return <p className="text-base text-destructive">Número de ficha inválido.</p>;
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/fichas" className={buttonVariants({ variant: "ghost" })}>
          <ChevronLeft className="mr-1 size-5" />
          Volver al listado
        </Link>
        {!editing && ficha && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={downloading}
              aria-busy={downloading}
            >
              {downloading ? (
                <Loader2 className="mr-1 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-1" aria-hidden />
              )}
              {downloading ? "Generando…" : "Descargar PDF"}
            </Button>
            {!isAnulada && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmingAnular(true)}
                  disabled={anulando}
                >
                  <Ban className="mr-1" aria-hidden />
                  Anular ficha
                </Button>
                <Button onClick={() => setEditing(true)}>Editar</Button>
              </>
            )}
          </div>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDraft(ficha);
                setEditing(false);
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} aria-busy={saving}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        )}
      </div>

      {isAnulada && (
        <div
          role="status"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-base font-medium text-destructive"
        >
          Ficha anulada el {anulada || ficha?.anuladaAt}
        </div>
      )}

      {auditLine && <p className="text-sm text-muted-foreground">{auditLine}</p>}

      {loading && !ficha ? (
        <div className="space-y-3" aria-busy>
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-center gap-2 py-2 text-base font-medium text-teal-800 dark:text-teal-100"
          >
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Cargando ficha…
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-base text-destructive">
          {error}
        </div>
      ) : ficha && draft ? (
        <div className="rounded-lg bg-card p-4 shadow-sm md:p-6">
          {editing ? <FichaForm value={draft} onChange={setDraft} /> : <FichaCard ficha={ficha} />}
        </div>
      ) : null}

      <Dialog
        open={confirmingAnular}
        onOpenChange={(open) => {
          if (!anulando) setConfirmingAnular(open);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>¿Anular la ficha N° {numero}?</DialogTitle>
            <DialogDescription>
              La ficha deja de aparecer en el listado y no se podrá editar. Se conserva en la
              hoja y su número no se puede reutilizar. Esta acción no se puede deshacer desde la
              app.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmingAnular(false)}
              disabled={anulando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleAnular}
              disabled={anulando}
              aria-busy={anulando}
            >
              {anulando && <Loader2 className="animate-spin" aria-hidden />}
              {anulando ? "Anulando…" : "Anular ficha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
