"use client";

import { cn } from "@/lib/utils";

import { DateInput } from "../DateInput";
import { formatDate } from "../format";

/**
 * Paper-styled date input. Read mode renders `DD/MM/AAAA` with a paper
 * underline (dashed when empty, solid when filled); edit mode mounts a
 * `DateInput` that only accepts digits and progressively builds the
 * canonical format.
 */
interface PaperDateFieldProps {
  mode: "read" | "edit";
  label: string;
  value: string;
  onChange?: (next: string) => void;
  className?: string;
}

const PAPER_INPUT_CLASSES =
  "h-7 rounded-none border-x-0 border-t-0 border-b border-dashed border-foreground/40 bg-transparent px-1 text-sm shadow-none focus-visible:border-solid focus-visible:border-foreground focus-visible:ring-0";

export function PaperDateField({ mode, label, value, onChange, className }: PaperDateFieldProps) {
  const editable = mode === "edit" && onChange !== undefined;
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className="shrink-0 text-sm italic text-foreground/80">{label}</span>
      <div className="min-w-0 flex-1">
        {editable ? (
          <DateInput
            value={value}
            onChange={onChange}
            ariaLabel={label}
            className={PAPER_INPUT_CLASSES}
          />
        ) : (
          <ReadUnderline value={value} />
        )}
      </div>
    </div>
  );
}

function ReadUnderline({ value }: { value: string }) {
  const formatted = formatDate(value);
  if (formatted === "") {
    return (
      <span
        aria-hidden
        className="block h-6 border-b border-dashed border-foreground/30"
      />
    );
  }
  return (
    <span className="block border-b border-foreground/60 py-0.5 text-sm">{formatted}</span>
  );
}
