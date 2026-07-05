import { describe, expect, it, vi } from "vitest";
import { logError } from "./log-error";

describe("logError", () => {
  it("emits a single JSON line with scope, message, stack, and context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("test.scope", new Error("boom"), { feedbackItemId: "abc" });

    expect(spy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({
      level: "error",
      scope: "test.scope",
      message: "boom",
      feedbackItemId: "abc",
    });
    expect(typeof parsed.stack).toBe("string");
    expect(typeof parsed.timestamp).toBe("string");

    spy.mockRestore();
  });

  it("stringifies a non-Error thrown value as the message, with no stack", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("test.scope", "just a string");

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.message).toBe("just a string");
    expect(parsed.stack).toBeUndefined();

    spy.mockRestore();
  });
});
