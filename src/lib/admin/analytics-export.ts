import type { AnalyticsPeriod } from "@/lib/api/analytics";
import { periodLabel } from "./analytics-period";
import type {
  BrowserBreakdown,
  CityBreakdown,
  DashboardStats,
  DeviceBreakdown,
  FunnelStep,
  SignupTrendPoint,
} from "@/lib/types";

/**
 * Flattens the analytics page into CSV rows.
 *
 * The Export button used to be a `<Button>` with no handler at all. Everything
 * on the page is already in memory, so the export is a pure transform of the
 * loaded state rather than another round trip, and it can be unit-tested
 * without a browser.
 */

export type AnalyticsExportRow = {
  section: string;
  label: string;
  value: number | string;
  detail: string;
};

export type AnalyticsSnapshot = {
  period: AnalyticsPeriod;
  stats: DashboardStats;
  trend: SignupTrendPoint[];
  devices: DeviceBreakdown[];
  browsers: BrowserBreakdown[];
  cities: CityBreakdown[];
  funnel: FunnelStep[];
};

export function analyticsExportRows(snapshot: AnalyticsSnapshot): AnalyticsExportRow[] {
  const { period, stats, trend, devices, browsers, cities, funnel } = snapshot;
  const window = periodLabel(period);
  const rows: AnalyticsExportRow[] = [
    { section: "Summary", label: "Reporting period", value: window, detail: "" },
    { section: "Summary", label: "Visitors", value: stats.visitors, detail: window },
    { section: "Summary", label: "Signups in period", value: stats.periodSignups, detail: window },
    {
      section: "Summary",
      label: "Signups in previous period",
      value: stats.previousPeriodSignups,
      detail: "preceding window of equal length",
    },
    { section: "Summary", label: "Total waitlist", value: stats.totalWaitlist, detail: "all time" },
    { section: "Summary", label: "Conversion rate %", value: stats.conversionRate, detail: window },
    { section: "Summary", label: "Verified rate %", value: stats.verifiedRate, detail: window },
    { section: "Summary", label: "CTA clicks", value: stats.ctaClicks, detail: window },
  ];

  for (const point of trend) {
    rows.push({
      section: "Daily signups",
      label: point.date,
      value: point.signups,
      detail: `${point.verified} verified`,
    });
  }
  for (const step of funnel) {
    rows.push({ section: "Funnel", label: step.stage, value: step.value, detail: `${step.pct}%` });
  }
  for (const device of devices) {
    rows.push({
      section: "Devices",
      label: device.name,
      value: device.value,
      detail: "% of signups",
    });
  }
  for (const browser of browsers) {
    rows.push({
      section: "Browsers",
      label: browser.name,
      value: browser.value,
      detail: "% of signups",
    });
  }
  for (const city of cities) {
    rows.push({
      section: "Cities",
      label: city.city,
      value: city.users,
      detail: `${city.growth >= 0 ? "+" : ""}${city.growth}% growth`,
    });
  }

  return rows;
}

/** `mytijaara-analytics-last-30-days-2026-08-05.csv` */
export function analyticsExportFilename(period: AnalyticsPeriod, on: Date = new Date()): string {
  const slug = periodLabel(period).toLowerCase().replace(/\s+/g, "-");
  const date = `${on.getFullYear()}-${pad(on.getMonth() + 1)}-${pad(on.getDate())}`;
  return `mytijaara-analytics-${slug}-${date}.csv`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
