<?php

namespace App\Support;

use App\Models\Setting;

/**
 * The referral reward structure, stored in the `referrals` settings group.
 *
 * `/admin/referrals` used to print "₦500 credit", "₦250 credit", "3 verified"
 * and "10 refs = ₦5,000" as literal JSX with an "Edit program" button that did
 * nothing, so the page described a program no code enforced. These values now
 * come from one settings row, and `RewardDispatcher` reads the same row when it
 * pays out, so the card and the payout can never disagree.
 */
class ReferralProgram
{
    public const GROUP = 'referrals';

    /**
     * @return array{rewardsEnabled:bool,currency:string,referrerReward:int,referredReward:int,minimumVerifiedForPayout:int,bonusMilestoneRefs:int,bonusMilestoneReward:int,rewardNote:string}
     */
    public static function current(): array
    {
        $row = Setting::where('group', self::GROUP)->first();
        $data = is_array($row?->data) ? $row->data : [];

        return array_merge(self::defaults(), $data);
    }

    /** @return array<string,mixed> */
    public static function defaults(): array
    {
        return [
            'rewardsEnabled' => true,
            'currency' => 'NGN',
            'referrerReward' => 500,
            'referredReward' => 250,
            'minimumVerifiedForPayout' => 3,
            'bonusMilestoneRefs' => 10,
            'bonusMilestoneReward' => 5000,
            'rewardNote' => '',
        ];
    }

    /**
     * Payout for one referrer, given how many of their referrals are being
     * settled in this run.
     *
     * The milestone bonus is paid once, when the run takes a referrer's lifetime
     * converted count to the milestone or past it. Paying it per-referral would
     * multiply the bonus by the batch size.
     */
    public static function payout(int $referralsSettled, int $lifetimeConverted): int
    {
        $program = self::current();
        $amount = $referralsSettled * (int) $program['referrerReward'];

        $milestone = (int) $program['bonusMilestoneRefs'];
        $before = $lifetimeConverted - $referralsSettled;
        if ($milestone > 0 && $before < $milestone && $lifetimeConverted >= $milestone) {
            $amount += (int) $program['bonusMilestoneReward'];
        }

        return $amount;
    }

    /** `₦1,500` / `NGN 1,500` for a currency with no symbol we know. */
    public static function format(int $amount, ?string $currency = null): string
    {
        $currency = $currency ?? (string) self::current()['currency'];
        $symbols = ['NGN' => '₦', 'USD' => '$', 'GBP' => '£', 'EUR' => '€'];
        $symbol = $symbols[strtoupper($currency)] ?? null;
        $formatted = number_format($amount);

        return $symbol ? $symbol.$formatted : strtoupper($currency).' '.$formatted;
    }
}
