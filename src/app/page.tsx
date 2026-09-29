import Link from "next/link";

export default function HomePage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Optica App</h1>
        <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          Sistema interno para digitalizar y gestionar las fichas de pacientes
          de la optica. Esta es la base de la version 1 (mock local).
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/fichas"
          className="group rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
        >
          <h2 className="text-lg font-medium tracking-tight">Fichas</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Listado, busqueda y carga de fichas de pacientes.
          </p>
        </Link>

        <div className="rounded-lg border border-dashed border-zinc-200 bg-white/50 p-6 dark:border-zinc-800 dark:bg-zinc-950/50">
          <h2 className="text-lg font-medium tracking-tight text-zinc-400 dark:text-zinc-600">
            Pacientes
          </h2>
          <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-600">
            Proximamente.
          </p>
        </div>

        <div className="rounded-lg border border-dashed border-zinc-200 bg-white/50 p-6 dark:border-zinc-800 dark:bg-zinc-950/50">
          <h2 className="text-lg font-medium tracking-tight text-zinc-400 dark:text-zinc-600">
            Reportes
          </h2>
          <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-600">
            Proximamente.
          </p>
        </div>
      </div>
    </section>
  );
}