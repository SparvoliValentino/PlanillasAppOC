"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Bell, CircleUserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Persistent topbar with global search and quick actions. The search box
 * navigates to `/fichas?q=...` on submit, reusing the listing filter.
 */
export function Topbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed === "" ? "/fichas" : `/fichas?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card/95 px-4 backdrop-blur md:px-8">
      <form
        className="relative flex w-full max-w-xl items-center"
        onSubmit={onSubmit}
        role="search"
      >
        <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar paciente, ficha o documento…"
          aria-label="Búsqueda global"
          className="pl-9"
        />
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notificaciones"
          className="rounded-full"
        >
          <Bell className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cuenta"
          className="rounded-full"
        >
          <CircleUserRound className="size-5" />
        </Button>
        <span className="hidden text-sm text-muted-foreground md:inline">Valentín</span>
      </div>
    </header>
  );
}
