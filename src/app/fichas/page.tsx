export default function FichasPage() {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Fichas</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Listado de fichas de pacientes.
          </p>
        </div>
      </header>

      <div className="rounded-lg border border-dashed border-zinc-300 bg-white/50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-950/50">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Listado de fichas - proximamente.
        </p>
      </div>
    </section>
  );
}