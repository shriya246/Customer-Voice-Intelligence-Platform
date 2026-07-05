import { describe, expect, it } from "vitest";
import { slugify, slugWithSuffix } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates non-alphanumeric runs", () => {
    expect(slugify("Acme Corp!")).toBe("acme-corp");
  });

  it("trims leading/trailing hyphens produced by leading/trailing punctuation", () => {
    expect(slugify("  --Weird Name--  ")).toBe("weird-name");
  });

  it("collapses multiple separators into one hyphen", () => {
    expect(slugify("a___b   c")).toBe("a-b-c");
  });

  it("truncates to 60 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBe(60);
  });
});

describe("slugWithSuffix", () => {
  it("appends a random suffix to the given base", () => {
    const result = slugWithSuffix("acme");
    expect(result.startsWith("acme-")).toBe(true);
    expect(result.length).toBeGreaterThan("acme-".length);
  });

  it("produces different suffixes across calls", () => {
    const a = slugWithSuffix("acme");
    const b = slugWithSuffix("acme");
    expect(a).not.toBe(b);
  });
});
