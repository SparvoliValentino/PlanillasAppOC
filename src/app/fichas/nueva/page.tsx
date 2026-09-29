"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

import type { Ficha } from "@/features/fichas/domain/ficha.types";
import { emptyFichaValues } from "@/features/fichas/domain/ficha.types";
import { FichaForm } from "@/features/fichas/ui/FichaForm";

interface ApiFichaResponse {
  data: Ficha;
}

interface ApiErrorResponse {
  error: string;
  message: string;
  details?: { path: string; message: string }[];
}

export default function NuevaFichaPage() {
  const router = useRouter();
  const [ficha, setFicha] = useState<Ficha>(() => ({
    nroFicha: 0,
    ...emptyFichaValues(),
  }));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { nroFicha: _omit, ...payload } = ficha;
      void _omit;
      const response = await fetch("/api/fichas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        const description = body?.details
          ? body.details.map((d) => `${d.path}: ${d.message}`).join("\n")
          : body?.message ?? `Error ${response.status}`;
        toast.error("No se pudo guardar la ficha", { description });
        return;
      }
      const body = (await response.json()) as ApiFichaResponse;
      toast.success("Ficha creada", { description: `Nro ${body.data.nroFicha}` });
      router.push(`/fichas/${body.data.nroFicha}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error("No se pudo guardar la ficha", { description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/fichas")}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ChevronLeft className="mr-1 size-4" />
          Volver al listado
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/fichas")}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} size="sm" disabled={saving}>
            {saving ? "Guardando…" : "Guardar ficha"}
          </Button>
        </div>
      </div>

      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Nueva
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Cargar una ficha nueva</h1>
        <p className="text-sm text-muted-foreground">
          Completá los datos. El número de ficha se asigna al guardar.
        </p>
      </header>

      <div className="rounded-lg bg-card p-4 shadow-sm md:p-6">
        <FichaForm value={ficha} onChange={setFicha} />
      </div>
    </section>
  );
}
