"use client";

import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";

interface PaperFieldProps {
  label: string;
  value: string;
  /** When present the field is in edit mode; otherwise it renders as read. */
  onChange?: (next: string) => void;
  placeholder?: string;
  mono?: boolean;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
  ariaLabel?: string;
  className?: string;
}

/**
 * "Paper field" — a label followed by an underline, like the lines on the
 * physical optica card. Edit mode activates when `onChange` is provided.
 */
export function PaperField({
  label,
  value,
  onChange,
  placeholder,
  mono,
  inputMode,
  ariaLabel,
  className,
}: PaperFieldProps) {
  const editing = onChange !== undefined;
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      {label !== "" && (
        <span className="shrink-0 text-sm italic text-foreground/80">{label}</span>
      )}
      <div className="min-w-0 flex-1">
        {editing ? (
          <EditUnderline
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            inputMode={inputMode}
            ariaLabel={ariaLabel ?? label}
          />
        ) : (
          <ReadUnderline value={value} mono={mono} />
        )}
      </div>
    </div>
  );
}

function ReadUnderline({ value, mono }: { value: string; mono?: boolean }) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return (
      <span
        aria-hidden
        className="block h-6 border-b border-dashed border-foreground/30"
      />
    );
  }
  return (
    <span
      className={cn(
        "block border-b border-foreground/60 py-0.5 text-sm",
        mono && "font-mono tracking-tight",
      )}
    >
      {trimmed}
    </span>
  );
}

function EditUnderline({
  value,
  onChange,
  placeholder,
  inputMode,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
  ariaLabel: string;
}) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder ?? " "}
      inputMode={inputMode}
      aria-label={ariaLabel}
      className={cn(
        "h-7 rounded-none border-x-0 border-t-0 border-b border-dashed border-foreground/40 bg-transparent px-1 text-sm shadow-none",
        "focus-visible:border-solid focus-visible:border-foreground focus-visible:ring-0",
      )}
    />
  );
}

/**
 * Static label cell (no underline). Useful for the right-aligned "N°:" prefix.
 */
export function PaperLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-sm italic text-foreground/80", className)}>{children}</span>
  );
}
