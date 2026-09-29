"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { isoToDisplay, parseAny } from "./dateInputLogic";

/**
 * Date input that lets the user type only digits and progressively builds
 * a `DD/MM/AAAA` string. Internally converts to ISO `YYYY-MM-DD` so the
 * domain layer keeps the canonical format.
 *
 * Paste-friendly: accepts `DD/MM/AAAA`, `DD-MM-AAAA`, `DD.MM.AA`,
 * `AAAA-MM-DD`, `AAAA/MM/DD`, or raw digits — anything `parseAny` can
 * normalize. Backspace reformats progressively (no orphan slashes).
 */

const MAX_LENGTH = 10;

interface DateInputProps {
  /** ISO `YYYY-MM-DD`. Empty string when no date is set. */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function DateInput({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  ariaLabel,
  className,
  disabled,
}: DateInputProps) {
  const [display, setDisplay] = useState<string>(() => isoToDisplay(value));
  const lastEmittedRef = useRef<string>(value);

  // Sync from prop when the change did not come from us (e.g. ficha
  // loaded from API, or a parent reset triggered by an external action).
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value;
    setDisplay(isoToDisplay(value));
  }, [value]);

  const handleChange = (raw: string) => {
    const { display: nextDisplay, iso } = parseAny(raw);
    setDisplay(nextDisplay);
    if (iso !== lastEmittedRef.current) {
      lastEmittedRef.current = iso;
      onChange(iso);
    }
  };

  return (
    <Input
      type="text"
      value={display}
      onChange={(event) => handleChange(event.target.value)}
      onKeyDown={(event) => {
        // Allow: navigation, deletion, selection, paste. Reject everything
        // that would introduce a non-digit, non-"/" character on typing.
        if (event.key.length === 1 && !/[\d/]/.test(event.key)) {
          event.preventDefault();
        }
      }}
      placeholder={placeholder}
      inputMode="numeric"
      maxLength={MAX_LENGTH}
      autoComplete="off"
      aria-label={ariaLabel ?? "Fecha"}
      disabled={disabled}
      className={cn("font-mono tabular-nums tracking-tight", className)}
    />
  );
}
