<?php

namespace App\Support;

use App\Mail\ReferralRewardMail;
use App\Models\AdminNotification;
use App\Models\Referral;
use App\Models\User;
use App\Models\WaitlistEntry;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Pays referral rewards.
 *
 * "Send rewards" was a button with no handler. This is the flow behind it, and
 * it is deliberately conservative:
 *
 *  - Only *converted* referrals are payable. A referral converts when the
 *    person referred verifies their email (`WaitlistController::verify`), so an
 *    unverified signup can never trigger a payout.
 *  - `referrals.rewarded_at` is the payout record, and it is checked before
 *    every write, so running the action twice pays once. That is what the
 *    migration meant by "so Send Rewards is idempotent".
 *  - A referrer below `minimumVerifiedForPayout` is skipped with a reason
 *    rather than silently ignored, so the admin sees why nothing happened.
 *  - The mark and the mail are one unit. If the mail fails the mark is rolled
 *    back, so the run can be retried instead of leaving a referrer paid on
 *    paper and never told.
 */
class RewardDispatcher
{
    /**
     * @param  array<int,string>  $publicIds  referrer `waitlist_entries.public_id`s
     * @return array{rewarded:int,skipped:int,failed:int,messages:array<int,string>}
     */
    public static function dispatch(array $publicIds, ?string $note, ?User $actor): array
    {
        $program = ReferralProgram::current();
        $result = ['rewarded' => 0, 'skipped' => 0, 'failed' => 0, 'messages' => []];

        if (! $program['rewardsEnabled']) {
            $result['skipped'] = count($publicIds);
            $result['messages'][] = 'Rewards are switched off in the referral program settings.';

            return $result;
        }

        $minimum = max(0, (int) $program['minimumVerifiedForPayout']);

        foreach (array_values(array_unique($publicIds)) as $publicId) {
            $referrer = WaitlistEntry::where('public_id', $publicId)->first();

            if (! $referrer) {
                $result['failed']++;
                $result['messages'][] = "{$publicId}: no such referrer.";

                continue;
            }

            $pending = Referral::query()
                ->pendingReward()
                ->where('referrer_id', $referrer->id)
                ->get();

            if ($pending->isEmpty()) {
                $result['skipped']++;
                $result['messages'][] = "{$referrer->name}: nothing pending, already rewarded.";

                continue;
            }

            $lifetimeConverted = Referral::where('referrer_id', $referrer->id)
                ->where('converted', true)
                ->count();

            if ($lifetimeConverted < $minimum) {
                $result['skipped']++;
                $result['messages'][] = sprintf(
                    '%s: %d verified referral%s, needs %d.',
                    $referrer->name,
                    $lifetimeConverted,
                    $lifetimeConverted === 1 ? '' : 's',
                    $minimum,
                );

                continue;
            }

            $amount = ReferralProgram::payout($pending->count(), $lifetimeConverted);
            $rewardedAt = now();

            // Guarded by `whereNull('rewarded_at')` so two concurrent runs
            // cannot both claim the same rows.
            $claimed = Referral::whereIn('id', $pending->pluck('id'))
                ->whereNull('rewarded_at')
                ->update([
                    'rewarded_at' => $rewardedAt,
                    'rewarded_by' => $actor?->id,
                    'reward_note' => $note !== null && $note !== '' ? substr($note, 0, 255) : null,
                ]);

            if ($claimed === 0) {
                $result['skipped']++;
                $result['messages'][] = "{$referrer->name}: another run claimed these referrals first.";

                continue;
            }

            try {
                SmtpConfig::apply();
                Mail::to($referrer->email)->send(new ReferralRewardMail(
                    entry: $referrer,
                    referralsRewarded: $claimed,
                    amount: $amount,
                    currency: (string) $program['currency'],
                    note: $note,
                ));
            } catch (\Throwable $e) {
                // Undo the claim so the admin can retry rather than leaving a
                // referrer marked paid with no notification.
                Referral::whereIn('id', $pending->pluck('id'))
                    ->where('rewarded_at', $rewardedAt)
                    ->update(['rewarded_at' => null, 'rewarded_by' => null, 'reward_note' => null]);

                Log::warning('referral reward mail failed', [
                    'referrer' => $referrer->public_id,
                    'error' => $e->getMessage(),
                ]);

                $result['failed']++;
                $result['messages'][] = "{$referrer->name}: reward not sent, mail failed ({$e->getMessage()}).";

                continue;
            }

            $result['rewarded']++;
            $result['messages'][] = sprintf(
                '%s: %s for %d referral%s.',
                $referrer->name,
                ReferralProgram::format($amount, (string) $program['currency']),
                $claimed,
                $claimed === 1 ? '' : 's',
            );

            self::notify($referrer, $claimed, $amount, (string) $program['currency']);
        }

        return $result;
    }

    /**
     * Every referrer with something payable right now, newest conversion first.
     *
     * The admin action needs a default selection; without this the button would
     * either require manual picking or pay everyone including the ineligible.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function pending(int $limit = 200): array
    {
        $minimum = max(0, (int) ReferralProgram::current()['minimumVerifiedForPayout']);

        $rows = Referral::query()
            ->pendingReward()
            ->selectRaw('referrer_id, COUNT(*) as pending_count, MAX(converted_at) as latest')
            ->groupBy('referrer_id')
            ->orderByDesc('latest')
            ->limit($limit)
            ->get();

        $referrers = WaitlistEntry::whereIn('id', $rows->pluck('referrer_id')->filter())
            ->get()
            ->keyBy('id');

        return $rows->map(function ($row) use ($referrers, $minimum) {
            $referrer = $referrers[$row->referrer_id] ?? null;
            if (! $referrer) {
                return null;
            }

            $lifetime = Referral::where('referrer_id', $row->referrer_id)
                ->where('converted', true)
                ->count();

            return [
                'id' => $referrer->public_id,
                'name' => $referrer->name,
                'email' => $referrer->email,
                'pending' => (int) $row->pending_count,
                'lifetimeConverted' => $lifetime,
                'eligible' => $lifetime >= $minimum,
                'payout' => ReferralProgram::payout((int) $row->pending_count, $lifetime),
                'latestConversionAt' => $row->latest ? (string) $row->latest : null,
            ];
        })->filter()->values()->all();
    }

    /** In-app notification so the reward shows up in the admin feed too. */
    private static function notify(WaitlistEntry $referrer, int $count, int $amount, string $currency): void
    {
        try {
            AdminNotification::record(
                type: 'referral',
                title: 'Referral reward sent',
                message: sprintf(
                    '%s was paid %s for %d referral%s.',
                    $referrer->name,
                    ReferralProgram::format($amount, $currency),
                    $count,
                    $count === 1 ? '' : 's',
                ),
                link: '/admin/referrals/'.$referrer->public_id,
                meta: ['referrer' => $referrer->public_id, 'amount' => $amount, 'currency' => $currency],
            );
        } catch (\Throwable) {
            // A notification failure must not fail a reward that was paid.
        }
    }
}
