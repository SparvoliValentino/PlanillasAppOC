"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

import { resetLayout } from "../layout/store";

/**
 * Restores the default column widths. Shown only where the handles exist
 * (`md` and up) and never printed.
 */
export function ResetLayoutButton() {
  return (
    <div className="mb-2 hidden justify-end md:flex print:hidden">
      <Button type="button" variant="ghost" size="sm" onClick={resetLayout}>
        <RotateCcw aria-hidden />
        Restablecer diseño
      </Button>
    </div>
  );
}
