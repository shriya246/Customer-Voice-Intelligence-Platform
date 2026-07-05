import { describe, expect, it } from "vitest";
import { extractEmbedding } from "./embeddings";

describe("extractEmbedding", () => {
  it("returns a flat array of numbers unchanged (already pooled)", () => {
    const input = [0.1, 0.2, 0.3];
    expect(extractEmbedding(input)).toEqual(input);
  });

  it("unwraps a single-element array wrapping the pooled vector", () => {
    const input = [[0.1, 0.2, 0.3]];
    expect(extractEmbedding(input)).toEqual([0.1, 0.2, 0.3]);
  });

  it("mean-pools a multi-element array of per-token vectors", () => {
    const input = [
      [1, 2, 3],
      [3, 4, 5],
    ];
    expect(extractEmbedding(input)).toEqual([2, 3, 4]);
  });

  it("throws for an empty array", () => {
    expect(() => extractEmbedding([])).toThrow(/empty or not an array/);
  });

  it("throws for a non-array response", () => {
    expect(() => extractEmbedding("not an array")).toThrow(/empty or not an array/);
  });

  it("throws for an array of unexpected element type", () => {
    expect(() => extractEmbedding([{ unexpected: true }])).toThrow(/Unexpected embedding response shape/);
  });
});
