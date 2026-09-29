import { describe, expect, it } from "vitest";

import { isoToDisplay, parseAny } from "../dateInputLogic";

describe("parseAny (progressive digits)", () => {
  it("returns empty when input is empty", () => {
    expect(parseAny("")).toEqual({ display: "", iso: "" });
    expect(parseAny("   ")).toEqual({ display: "", iso: "" });
  });

  it("shows partial input as the user types, without producing ISO until 8 digits", () => {
    expect(parseAny("2")).toEqual({ display: "2", iso: "" });
    expect(parseAny("29")).toEqual({ display: "29", iso: "" });
    expect(parseAny("290")).toEqual({ display: "29/0", iso: "" });
    expect(parseAny("2909")).toEqual({ display: "29/09", iso: "" });
    expect(parseAny("29092")).toEqual({ display: "29/09/2", iso: "" });
    expect(parseAny("290926")).toEqual({ display: "29/09/26", iso: "" });
    expect(parseAny("2909202")).toEqual({ display: "29/09/202", iso: "" });
  });

  it("produces ISO once 8 digits form a valid date", () => {
    expect(parseAny("29092026")).toEqual({ display: "29/09/2026", iso: "2026-09-29" });
    expect(parseAny("01012025")).toEqual({ display: "01/01/2025", iso: "2025-01-01" });
  });

  it("keeps the display but emits empty ISO for invalid dates", () => {
    expect(parseAny("31022026")).toEqual({ display: "31/02/2026", iso: "" });
    expect(parseAny("00002026")).toEqual({ display: "00/00/2026", iso: "" });
  });

  it("caps at 8 digits when more are pasted", () => {
    expect(parseAny("290920261234")).toEqual({ display: "29/09/2026", iso: "2026-09-29" });
  });
});

describe("parseAny (pasted with separators)", () => {
  it("accepts DD/MM/AAAA", () => {
    expect(parseAny("29/09/2026")).toEqual({ display: "29/09/2026", iso: "2026-09-29" });
  });

  it("accepts DD-MM-AAAA and DD.MM.AAAA", () => {
    expect(parseAny("29-09-2026")).toEqual({ display: "29/09/2026", iso: "2026-09-29" });
    expect(parseAny("29.09.2026")).toEqual({ display: "29/09/2026", iso: "2026-09-29" });
  });

  it("accepts two-digit years and expands them to 20xx", () => {
    expect(parseAny("29/09/26")).toEqual({ display: "29/09/2026", iso: "2026-09-29" });
  });

  it("accepts ISO YYYY-MM-DD and YYYY/MM/DD", () => {
    expect(parseAny("2026-09-29")).toEqual({ display: "29/09/2026", iso: "2026-09-29" });
    expect(parseAny("2026/09/29")).toEqual({ display: "29/09/2026", iso: "2026-09-29" });
  });

  it("accepts single-digit day/month and pads with zero", () => {
    expect(parseAny("1/1/2026")).toEqual({ display: "01/01/2026", iso: "2026-01-01" });
  });
});

describe("isoToDisplay", () => {
  it("formats an ISO date as DD/MM/AAAA", () => {
    expect(isoToDisplay("2026-09-29")).toBe("29/09/2026");
    expect(isoToDisplay("2026-01-01")).toBe("01/01/2026");
  });

  it("returns empty for empty/invalid ISO", () => {
    expect(isoToDisplay("")).toBe("");
    expect(isoToDisplay("not-a-date")).toBe("");
  });
});
