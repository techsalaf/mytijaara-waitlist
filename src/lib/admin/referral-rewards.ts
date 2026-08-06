import type { PendingReward, ReferralProgram, RewardResult } from "@/lib/api/referrals";

/**
 * Pure helpers behind the referrals page.
 *
 * The Export and "Send rewards" buttons had no handlers at all, and the reward
 * card printed `₦124k` as a literal. Everything here is same-input-same-output,
 * so it is a tested module rather than logic inline in JSX.
 */

const SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

/** `₦1,500`, or `AED 1,500` for a currency with no symbol we know. */
export function formatMoney(amount: number, currency = "NGN"): string {
  const code = currency.toUpperCase();
  const symbol = SYMBOLS[code];
  const formatted = new Intl.NumberFormat("en-NG").format(Math.round(amount));
  return symbol ? `${symbol}${formatted}` : `${code} ${formatted}`;
}

/** `mytijaara-referrals-2026-08-05.csv` */
export function referralExportFilename(on: Date = new Date()): string {
  const date = `${on.getFullYear()}-${pad(on.getMonth() + 1)}-${pad(on.getDate())}`;
  return `mytijaara-referrals-${date}.csv`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Only the referrers the backend will actually pay. */
export function eligibleRewards(rows: PendingReward[]): PendingReward[] {
  return rows.filter((row) => row.eligible && row.pending > 0);
}

/** Total the selected rows would pay out. */
export function totalPayout(rows: PendingReward[]): number {
  return rows.reduce((sum, row) => sum + row.payout, 0);
}

/**
 * One-line description of what a run will do, for the confirm dialog.
 *
 * The ineligible rows are named rather than dropped silently, because "nothing
 * happened" with no reason is the failure the user called out.
 */
export function rewardPlan(
  rows: PendingReward[],
  program: Pick<ReferralProgram, "currency" | "minimumVerifiedForPayout">,
): string {
  const eligible = eligibleRewards(rows);
  const held = rows.length - eligible.length;

  if (eligible.length === 0) {
    if (rows.length === 0) return "No referrer has an unpaid confirmed referral.";
    return `No referrer has reached the ${program.minimumVerifiedForPayout}-referral minimum yet.`;
  }

  const money = formatMoney(totalPayout(eligible), program.currency);
  const head = `Pay ${money} to ${eligible.length} referrer${eligible.length === 1 ? "" : "s"}`;
  return held > 0
    ? `${head}. ${held} below the ${program.minimumVerifiedForPayout}-referral minimum will be skipped.`
    : `${head}.`;
}

/**
 * Toast text for a completed run.
 *
 * Reports every bucket the backend returned, so a run that paid nobody reads as
 * a failure instead of a success with a zero in it.
 */
export function rewardSummary(result: RewardResult): string {
  const parts: string[] = [];
  if (result.rewarded > 0) parts.push(`${result.rewarded} rewarded`);
  if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
  if (result.failed > 0) parts.push(`${result.failed} failed`);
  return parts.length > 0 ? parts.join(" · ") : "Nothing to reward";
}

/** A run is a success only if it actually paid someone and nothing broke. */
export function rewardOutcome(result: RewardResult): "success" | "partial" | "failure" {
  if (result.rewarded > 0 && result.failed === 0) return "success";
  if (result.rewarded > 0) return "partial";
  return "failure";
}
