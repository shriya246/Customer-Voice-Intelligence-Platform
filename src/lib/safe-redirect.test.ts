import { describe, expect, it } from "vitest";
import { safeRedirectTarget } from "./safe-redirect";

describe("safeRedirectTarget", () => {
  it("allows a same-app relative path", () => {
    expect(safeRedirectTarget("/settings")).toBe("/settings");
  });

  it("falls back for a protocol-relative URL (open-redirect via //evil.com)", () => {
    expect(safeRedirectTarget("//evil.com")).toBe("/dashboard");
  });

  it("falls back for an absolute external URL", () => {
    expect(safeRedirectTarget("https://evil.com")).toBe("/dashboard");
  });

  it("falls back for null/undefined/empty input", () => {
    expect(safeRedirectTarget(null)).toBe("/dashboard");
    expect(safeRedirectTarget(undefined)).toBe("/dashboard");
    expect(safeRedirectTarget("")).toBe("/dashboard");
  });

  it("takes the first value when given an array (duplicate query params)", () => {
    expect(safeRedirectTarget(["/settings", "/other"])).toBe("/settings");
  });

  it("falls back when the array's first value is unsafe", () => {
    expect(safeRedirectTarget(["//evil.com", "/settings"])).toBe("/dashboard");
  });

  it("honors a custom fallback", () => {
    expect(safeRedirectTarget("//evil.com", "/onboarding")).toBe("/onboarding");
  });
});
