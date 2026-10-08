import { describe, expect, it } from "vitest";

import { formatDateTime } from "../format";

describe("formatDateTime", () => {
  it("formats an ISO timestamp as DD/MM/AAAA HH:mm (local time)", () => {
    const iso = new Date(2026, 8, 5, 14, 7).toISOString();
    expect(formatDateTime(iso)).toBe("05/09/2026 14:07");
  });

  it("returns an empty string for empty or invalid input", () => {
    expect(formatDateTime("")).toBe("");
    expect(formatDateTime("no-es-fecha")).toBe("");
  });
});
