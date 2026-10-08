import { describe, expect, it } from "vitest";

import { resolveRepositoryConfig } from "../repository";

const base = { APPS_SCRIPT_URL: "https://script.example/exec", APPS_SCRIPT_TOKEN: "tok" };

describe("resolveRepositoryConfig", () => {
  it("builds the sheets config from env", () => {
    expect(resolveRepositoryConfig({ ...base, APPS_SCRIPT_TIMEOUT_MS: "5000" })).toEqual({
      url: "https://script.example/exec",
      token: "tok",
      timeoutMs: 5000,
    });
  });

  it("omits timeoutMs when not set", () => {
    expect(resolveRepositoryConfig(base)).toEqual({ url: "https://script.example/exec", token: "tok" });
  });

  it("accepts FICHA_REPOSITORY=sheets", () => {
    expect(() => resolveRepositoryConfig({ ...base, FICHA_REPOSITORY: "sheets" })).not.toThrow();
  });

  it("fails loudly with no configuration (no local fallback)", () => {
    expect(() => resolveRepositoryConfig({})).toThrow(/APPS_SCRIPT_URL/);
  });

  it("throws naming the missing variable, never its value", () => {
    expect(() => resolveRepositoryConfig({ APPS_SCRIPT_TOKEN: "secret-value" })).toThrow(/APPS_SCRIPT_URL/);
    try {
      resolveRepositoryConfig({ APPS_SCRIPT_URL: "https://u" });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toContain("APPS_SCRIPT_TOKEN");
    }
  });

  it("throws on an invalid timeout", () => {
    expect(() => resolveRepositoryConfig({ ...base, APPS_SCRIPT_TIMEOUT_MS: "abc" })).toThrow(
      /APPS_SCRIPT_TIMEOUT_MS/,
    );
  });

  it("rejects FICHA_REPOSITORY=mock, saying the mock was removed", () => {
    expect(() => resolveRepositoryConfig({ ...base, FICHA_REPOSITORY: "mock" })).toThrow(/mock repository was removed/);
  });
});
