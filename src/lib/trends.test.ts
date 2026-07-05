import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sumInWeekRange, type WeeklyPoint } from "./trends";

const NOW = new Date("2026-07-05T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * DAY_MS).toISOString();
}

describe("sumInWeekRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sums only weeks whose start falls in the requested range", () => {
    // "recent" = last 2 weeks (0-14 days ago), "prior" = the 2 weeks before that (14-28 days ago)
    const weeks: WeeklyPoint[] = [
      { weekStart: daysAgo(3), count: 5 }, // recent
      { weekStart: daysAgo(10), count: 3 }, // recent
      { weekStart: daysAgo(20), count: 7 }, // prior
      { weekStart: daysAgo(25), count: 2 }, // prior
    ];
    expect(sumInWeekRange(weeks, 0, 2)).toBe(8);
    expect(sumInWeekRange(weeks, 2, 4)).toBe(9);
  });

  it("does not misattribute counts when the array is sparse (gaps with zero-item weeks omitted)", () => {
    // Regression test for the real bug: get_theme_trend's GROUP BY omits
    // weeks with zero items entirely, so a naive "last N array elements"
    // read would pull from the wrong calendar weeks once there's a gap.
    // Here there's no data at all for the weeks in between.
    const weeks: WeeklyPoint[] = [
      { weekStart: daysAgo(3), count: 4 }, // recent
      { weekStart: daysAgo(22), count: 10 }, // prior
    ];
    expect(sumInWeekRange(weeks, 0, 2)).toBe(4);
    expect(sumInWeekRange(weeks, 2, 4)).toBe(10);
  });

  it("returns 0 for a range with no matching weeks", () => {
    const weeks: WeeklyPoint[] = [{ weekStart: daysAgo(3), count: 5 }];
    expect(sumInWeekRange(weeks, 4, 6)).toBe(0);
  });
});
