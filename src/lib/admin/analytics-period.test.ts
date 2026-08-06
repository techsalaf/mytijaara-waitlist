import { describe, expect, it } from "vitest";

import {
  ANALYTICS_PERIODS,
  parsePeriod,
  periodCaption,
  periodGrowth,
  periodLabel,
  periodPhrase,
  trendDays,
} from "./analytics-period";

describe("ANALYTICS_PERIODS", () => {
  it("exposes every window the backend accepts, all-time last", () => {
    expect(ANALYTICS_PERIODS).toEqual([7, 30, 90, 0]);
  });
});

describe("periodLabel", () => {
  it("labels day windows", () => {
    expect(periodLabel(7)).toBe("Last 7 days");
    expect(periodLabel(30)).toBe("Last 30 days");
    expect(periodLabel(90)).toBe("Last 90 days");
  });

  it("labels the all-time window without a day count", () => {
    expect(periodLabel(0)).toBe("All time");
  });
});

describe("periodPhrase", () => {
  it("reads as a mid-sentence phrase", () => {
    expect(periodPhrase(7)).toBe("the last 7 days");
    expect(periodPhrase(0)).toBe("all time");
  });
});

describe("periodCaption", () => {
  it("joins a prefix to the window phrase", () => {
    expect(periodCaption("Daily signups vs verified users", 90)).toBe(
      "Daily signups vs verified users, the last 90 days",
    );
    expect(periodCaption("Top waitlist cities", 0)).toBe("Top waitlist cities, all time");
  });
});

describe("parsePeriod", () => {
  it("parses the string values Radix Select hands back", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("30")).toBe(30);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("0")).toBe(0);
  });

  // The regression this guards: `Number("nonsense")` is NaN and an earlier
  // `|| 0` style parse would have widened the window to all time.
  it("falls back rather than widening the window on junk input", () => {
    expect(parsePeriod("nonsense", 7)).toBe(7);
    expect(parsePeriod("", 30)).toBe(30);
    expect(parsePeriod("45", 90)).toBe(90);
    expect(parsePeriod("-7", 30)).toBe(30);
  });

  it("defaults to 30 days when no fallback is supplied", () => {
    expect(parsePeriod("nonsense")).toBe(30);
  });
});

describe("trendDays", () => {
  it("passes through windows the trends endpoint accepts", () => {
    expect(trendDays(7)).toBe(7);
    expect(trendDays(30)).toBe(30);
    expect(trendDays(90)).toBe(90);
  });

  // `/analytics/trends` clamps to 7..90 server-side, so all-time must ask for 90
  // or the caption would promise a series the chart never shows.
  it("clamps all time to the 90-day maximum", () => {
    expect(trendDays(0)).toBe(90);
  });
});

describe("periodGrowth", () => {
  it("computes signed growth to one decimal", () => {
    expect(periodGrowth(120, 100)).toBe(20);
    expect(periodGrowth(80, 100)).toBe(-20);
    expect(periodGrowth(107, 93)).toBe(15.1);
  });

  // The replaced code hardcoded `delta={0.4}` and `delta={12.8}`.
  it("reports no growth when nothing changed", () => {
    expect(periodGrowth(50, 50)).toBe(0);
  });

  it("does not divide by zero on an empty previous window", () => {
    expect(periodGrowth(9, 0)).toBe(100);
    expect(periodGrowth(0, 0)).toBe(0);
  });

  it("reports a full collapse as -100%", () => {
    expect(periodGrowth(0, 40)).toBe(-100);
  });
});
