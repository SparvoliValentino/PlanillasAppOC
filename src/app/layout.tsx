import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Optica App",
  description: "Sistema de gestion de fichas opticas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn("h-full antialiased", "font-sans", geist.variable)}>
      <body className="bg-background text-foreground min-h-full flex flex-col font-sans">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-8 py-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold tracking-tight">
                Optica App
              </span>
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                v0.1
              </span>
            </div>
            <nav
              aria-label="Navegacion principal"
              className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-300"
            >
              <span className="opacity-60">Fichas</span>
              <span className="opacity-60">Pacientes</span>
              <span className="opacity-60">Reportes</span>
            </nav>
          </div>
        </header>
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1280px] px-8 py-10">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}