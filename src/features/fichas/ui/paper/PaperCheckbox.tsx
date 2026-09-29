"use client";

import { cn } from "@/lib/utils";

interface PaperCheckboxProps {
  label: string;
  checked: boolean;
  /** When present the checkbox is interactive. */
  onChange?: (next: boolean) => void;
  className?: string;
}

/**
 * "Paper checkbox" — literal ☐ / ☑ in read mode, native checkbox in edit
 * mode (when `onChange` is provided).
 */
export function PaperCheckbox({ label, checked, onChange, className }: PaperCheckboxProps) {
  const editable = onChange !== undefined;
  if (!editable) {
    return (
      <span className={cn("inline-flex select-none items-baseline gap-1.5 text-sm", className)}>
        <span
          aria-hidden
          className="inline-block w-4 text-center font-mono text-base leading-none text-foreground"
        >
          {checked ? "☑" : "☐"}
        </span>
        <span className="italic text-foreground/80">{label}</span>
      </span>
    );
  }
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer select-none items-baseline gap-1.5 text-sm",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 cursor-pointer accent-foreground"
      />
      <span className="italic text-foreground/80">{label}</span>
    </label>
  );
}
