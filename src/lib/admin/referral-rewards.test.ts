import { describe, expect, it } from "vitest";

import {
  eligibleRewards,
  formatMoney,
  referralExportFilename,
  rewardOutcome,
  rewardPlan,
  rewardSummary,
  totalPayout,
} from "./referral-rewards";
import type { PendingReward, RewardResult } from "@/lib/api/referrals";

function row(overrides: Partial<PendingReward> = {}): PendingReward {
  return {
    id: "wl_1",
    name: "Ada",
    email: "ada@example.com",
    pending: 2,
    lifetimeConverted: 5,
    eligible: true,
    payout: 1000,
    latestConversionAt: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

function result(overrides: Partial<RewardResult> = {}): RewardResult {
  return { rewarded: 0, skipped: 0, failed: 0, messages: [], ...overrides };
}

describe("formatMoney", () => {
  it("uses the naira symbol for NGN", () => {
    expect(formatMoney(1500)).toBe("₦1,500");
  });

  it("uses the dollar symbol for USD, case-insensitively", () => {
    expect(formatMoney(2500, "usd")).toBe("$2,500");
  });

  it("falls back to CODE amount for a currency with no known symbol", () => {
    expect(formatMoney(1500, "AED")).toBe("AED 1,500");
  });

  it("rounds fractional amounts", () => {
    expect(formatMoney(999.6, "NGN")).toBe("₦1,000");
  });
});

describe("referralExportFilename", () => {
  it("zero-pads month and day", () => {
    expect(referralExportFilename(new Date(2026, 0, 5))).toBe("mytijaara-referrals-2026-01-05.csv");
  });

  it("handles double-digit month and day", () => {
    expect(referralExportFilename(new Date(2026, 11, 31))).toBe(
      "mytijaara-referrals-2026-12-31.csv",
    );
  });
});

describe("eligibleRewards", () => {
  it("drops rows the backend flagged ineligible", () => {
    const rows = [row({ id: "a" }), row({ id: "b", eligible: false })];
    expect(eligibleRewards(rows).map((r) => r.id)).toEqual(["a"]);
  });

  it("drops rows with nothing pending even when eligible", () => {
    const rows = [row({ id: "a", pending: 0 }), row({ id: "b" })];
    expect(eligibleRewards(rows).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("totalPayout", () => {
  it("sums payouts", () => {
    expect(totalPayout([row({ payout: 500 }), row({ payout: 1500 })])).toBe(2000);
  });

  it("is zero for no rows", () => {
    expect(totalPayout([])).toBe(0);
  });
});

describe("rewardPlan", () => {
  const program = { currency: "NGN" as const, minimumVerifiedForPayout: 3 };

  it("says so when nobody has a pending referral", () => {
    expect(rewardPlan([], program)).toBe("No referrer has an unpaid confirmed referral.");
  });

  it("names the minimum when everyone is held below it", () => {
    const plan = rewardPlan([row({ eligible: false })], program);
    expect(plan).toBe("No referrer has reached the 3-referral minimum yet.");
  });

  it("states the total and count when everyone is eligible", () => {
    const plan = rewardPlan([row({ payout: 500 }), row({ payout: 1500 })], program);
    expect(plan).toBe("Pay ₦2,000 to 2 referrers.");
  });

  it("uses the singular for one referrer", () => {
    expect(rewardPlan([row({ payout: 500 })], program)).toBe("Pay ₦500 to 1 referrer.");
  });

  it("names the held count instead of dropping it silently", () => {
    const plan = rewardPlan([row({ payout: 500 }), row({ eligible: false })], program);
    expect(plan).toBe("Pay ₦500 to 1 referrer. 1 below the 3-referral minimum will be skipped.");
  });
});

describe("rewardSummary", () => {
  it("joins the non-zero buckets", () => {
    expect(rewardSummary(result({ rewarded: 3, skipped: 1 }))).toBe("3 rewarded · 1 skipped");
  });

  it("includes failures", () => {
    expect(rewardSummary(result({ rewarded: 1, skipped: 2, failed: 1 }))).toBe(
      "1 rewarded · 2 skipped · 1 failed",
    );
  });

  it("reads as nothing-happened when every bucket is zero", () => {
    expect(rewardSummary(result())).toBe("Nothing to reward");
  });
});

describe("rewardOutcome", () => {
  it("is success only when someone was paid and nothing failed", () => {
    expect(rewardOutcome(result({ rewarded: 2, skipped: 1 }))).toBe("success");
  });

  it("is partial when paid but some failed", () => {
    expect(rewardOutcome(result({ rewarded: 2, failed: 1 }))).toBe("partial");
  });

  it("is failure when nobody was paid, even with zero failures", () => {
    // A run that paid nobody must never render a success toast.
    expect(rewardOutcome(result({ skipped: 4 }))).toBe("failure");
    expect(rewardOutcome(result({ failed: 2 }))).toBe("failure");
    expect(rewardOutcome(result())).toBe("failure");
  });
});
