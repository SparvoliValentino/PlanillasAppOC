"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import type { Ficha } from "@/features/fichas/domain/ficha.types";
import { FichaCard } from "@/features/fichas/ui/FichaCard";
import { FichaForm } from "@/features/fichas/ui/FichaForm";

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
  const numero = Number(params?.numero);
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [draft, setDraft] = useState<Ficha | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!Number.isFinite(numero)) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/fichas/${numero}`, { signal });
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
      const { nroFicha: _omit, ...patch } = draft;
      void _omit;
      const response = await fetch(`/api/fichas/${numero}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
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

  if (!Number.isFinite(numero)) {
    return <p className="text-sm text-destructive">Número de ficha inválido.</p>;
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/fichas" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ChevronLeft className="mr-1 size-4" />
          Volver al listado
        </Link>
        {!editing && ficha && (
          <Button onClick={() => setEditing(true)} size="sm">
            Editar
          </Button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(ficha);
                setEditing(false);
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} size="sm" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        )}
      </div>

      {loading && !ficha ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          {error}
        </div>
      ) : ficha && draft ? (
        <div className="rounded-lg bg-card p-4 shadow-sm md:p-6">
          {editing ? <FichaForm value={draft} onChange={setDraft} /> : <FichaCard ficha={ficha} />}
        </div>
      ) : null}
    </section>
  );
}
