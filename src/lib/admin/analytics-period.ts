import type { AnalyticsPeriod } from "@/lib/api/analytics";

/**
 * The analytics period selector, in one place.
 *
 * The dashboard used to hold `days` as a plain number and flip it between 30 and
 * 7 with a toggle button, so the two other windows the backend already accepts
 * (90 days and all-time) were unreachable, and every chart caption said "last 30
 * days" regardless of what was selected. Both the option list and the captions
 * are pure functions of the period, so they live here with tests rather than
 * inline in JSX.
 */

export const ANALYTICS_PERIODS: readonly AnalyticsPeriod[] = [7, 30, 90, 0] as const;

/** Text for the selector trigger, e.g. "Last 7 days" / "All time". */
export function periodLabel(period: AnalyticsPeriod): string {
  return period === 0 ? "All time" : `Last ${period} days`;
}

/** Lowercase form for mid-sentence use in a chart caption. */
export function periodPhrase(period: AnalyticsPeriod): string {
  return period === 0 ? "all time" : `the last ${period} days`;
}

/** Caption for a chart or card scoped to the selected window. */
export function periodCaption(prefix: string, period: AnalyticsPeriod): string {
  return `${prefix}, ${periodPhrase(period)}`;
}

/**
 * Parse a selector value back to a period.
 *
 * Radix Select hands back strings, and an unrecognised one must not silently
 * become `0` (all time) — that would widen the window instead of leaving it
 * alone, which is the more surprising failure. `Number("")` and `Number(" ")`
 * are both `0`, a legal period, so a blank value has to be rejected before the
 * numeric check rather than after it.
 */
export function parsePeriod(raw: string, fallback: AnalyticsPeriod = 30): AnalyticsPeriod {
  if (raw.trim() === "") return fallback;
  const n = Number(raw);
  return (ANALYTICS_PERIODS as readonly number[]).includes(n) ? (n as AnalyticsPeriod) : fallback;
}

/**
 * `/analytics/trends` clamps its window to 7..90 days server-side, because a
 * day-by-day series over all time is unbounded. Asking for the clamped value
 * keeps the chart caption honest about what the chart actually shows.
 */
export function trendDays(period: AnalyticsPeriod): number {
  if (period === 0) return 90;
  return Math.min(90, Math.max(7, period));
}

/**
 * Period-over-period signup growth, as a percentage to one decimal.
 *
 * The dashboard used to hardcode `delta={0.4}` and `delta={12.8}` on two cards.
 * `/analytics/overview` returns both counts, so the pill can be the real
 * comparison for whatever window is selected. A previous window of zero is
 * reported as +100% rather than as a division by zero.
 */
export function periodGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
