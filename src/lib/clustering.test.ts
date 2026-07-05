import { describe, expect, it } from "vitest";
import { parseVector } from "./clustering";

describe("parseVector", () => {
  it("passes through a real array unchanged", () => {
    expect(parseVector([0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3]);
  });

  it("parses a pgvector text representation", () => {
    expect(parseVector("[0.1,0.2,0.3]")).toEqual([0.1, 0.2, 0.3]);
  });

  it("throws for an unexpected shape", () => {
    expect(() => parseVector(42)).toThrow(/Unexpected vector column shape/);
    expect(() => parseVector(null)).toThrow(/Unexpected vector column shape/);
  });
});
