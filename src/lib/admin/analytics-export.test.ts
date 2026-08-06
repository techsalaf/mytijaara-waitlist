import { describe, expect, it } from "vitest";

import {
  analyticsExportFilename,
  analyticsExportRows,
  type AnalyticsSnapshot,
} from "./analytics-export";
import { toCsv } from "@/lib/csv";

const snapshot: AnalyticsSnapshot = {
  period: 30,
  stats: {
    visitors: 1200,
    totalWaitlist: 340,
    todaySignups: 5,
    weeklyGrowth: 12.5,
    monthlyGrowth: 40,
    conversionRate: 3.2,
    ctaClicks: 88,
    emailOpenRate: 41,
    emailClickRate: 9,
    verifiedRate: 62.5,
    periodDays: 30,
    periodSignups: 120,
    previousPeriodSignups: 100,
  },
  trend: [
    { date: "2026-08-04", label: "Aug 4", signups: 7, verified: 3 },
    { date: "2026-08-05", label: "Aug 5", signups: 9, verified: 5 },
  ],
  devices: [{ name: "iOS", value: 55, color: "#000" }],
  browsers: [{ name: "Chrome", value: 70, color: "#111" }],
  cities: [
    { city: "Ibadan", users: 90, growth: 12 },
    { city: "Lagos", users: 80, growth: -4 },
  ],
  funnel: [{ stage: "Signup", value: 120, pct: 100 }],
};

describe("analyticsExportRows", () => {
  it("carries the period-scoped counts, not just the all-time total", () => {
    const rows = analyticsExportRows(snapshot);
    const find = (label: string) => rows.find((r) => r.label === label);

    expect(find("Reporting period")?.value).toBe("Last 30 days");
    expect(find("Signups in period")?.value).toBe(120);
    expect(find("Signups in previous period")?.value).toBe(100);
    expect(find("Total waitlist")?.value).toBe(340);
  });

  it("emits one row per data point across every section", () => {
    const rows = analyticsExportRows(snapshot);
    const count = (section: string) => rows.filter((r) => r.section === section).length;

    expect(count("Summary")).toBe(8);
    expect(count("Daily signups")).toBe(2);
    expect(count("Funnel")).toBe(1);
    expect(count("Devices")).toBe(1);
    expect(count("Browsers")).toBe(1);
    expect(count("Cities")).toBe(2);
  });

  it("signs city growth so a decline is not exported as a rise", () => {
    const rows = analyticsExportRows(snapshot);
    const cities = rows.filter((r) => r.section === "Cities");

    expect(cities[0].detail).toBe("+12% growth");
    expect(cities[1].detail).toBe("-4% growth");
  });

  it("exports a summary even when every breakdown is empty", () => {
    const rows = analyticsExportRows({
      ...snapshot,
      trend: [],
      devices: [],
      browsers: [],
      cities: [],
      funnel: [],
    });

    // The CSV must never be the empty string, which is what `toCsv([])` returns
    // and what would download as a 0-byte file.
    expect(rows).toHaveLength(8);
    expect(toCsv(rows)).not.toBe("");
  });

  it("produces a CSV with a header row and one line per metric", () => {
    const csv = toCsv(analyticsExportRows(snapshot), [
      { key: "section", label: "Section" },
      { key: "label", label: "Metric" },
      { key: "value", label: "Value" },
      { key: "detail", label: "Detail" },
    ]);
    const lines = csv.split("\n");

    expect(lines[0]).toBe("Section,Metric,Value,Detail");
    expect(lines).toHaveLength(analyticsExportRows(snapshot).length + 1);
  });
});

describe("analyticsExportFilename", () => {
  it("names the file after the window and the date", () => {
    expect(analyticsExportFilename(30, new Date(2026, 7, 5))).toBe(
      "mytijaara-analytics-last-30-days-2026-08-05.csv",
    );
    expect(analyticsExportFilename(0, new Date(2026, 11, 31))).toBe(
      "mytijaara-analytics-all-time-2026-12-31.csv",
    );
  });
});
