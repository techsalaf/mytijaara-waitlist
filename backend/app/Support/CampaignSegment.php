<?php

namespace App\Support;

use App\Models\Unsubscribe;
use App\Models\WaitlistEntry;
use Illuminate\Database\Eloquent\Builder;

/**
 * Turns a campaign `segment` array into a recipient query.
 *
 * This exists so the "estimated reach" number in the builder and the rows
 * `SendCampaignJob` actually mails come from the same rules. The builder used to
 * print hardcoded counts ("All active users (2,847)"), which meant the figure on
 * screen had no relationship to who would receive the email.
 */
class CampaignSegment
{
    /** The segments the builder offers, as `value => label`. */
    public const PRESETS = [
        'all' => 'Everyone on the waitlist',
        'active' => 'Active members',
        'verified' => 'Verified members',
        'unverified' => 'Unverified members',
        'referrers' => 'Members who referred someone',
    ];

    /** Rules for a preset key, ready to store on `email_campaigns.segment`. */
    public static function rulesFor(string $preset): array
    {
        return match ($preset) {
            'active' => ['status' => 'active'],
            'verified' => ['verified' => true],
            'unverified' => ['unverified' => true],
            'referrers' => ['hasReferrals' => true],
            default => [],
        };
    }

    /**
     * Recipient query for a segment.
     *
     * Mirrors `SendCampaignJob::recipients()` plus the suppression rules, so the
     * count shown is deliverable recipients, not raw matches.
     */
    public static function query(array $segment): Builder
    {
        $query = WaitlistEntry::query()->whereNotNull('email');

        // If specific individual IDs or emails are provided without other segment criteria,
        // or if they are specified alongside:
        $hasIndividualIds = ! empty($segment['ids']) && is_array($segment['ids']);
        $hasIndividualEmails = ! empty($segment['emails']) && is_array($segment['emails']);

        if (! empty($segment['only_individuals'])) {
            // Target ONLY the selected individual recipients
            return $query->where(function ($q) use ($segment, $hasIndividualIds, $hasIndividualEmails) {
                if ($hasIndividualIds) {
                    $q->whereIn('public_id', $segment['ids'])
                      ->orWhereIn('id', $segment['ids']);
                }
                if ($hasIndividualEmails) {
                    $q->orWhereIn('email', $segment['emails']);
                }
            });
        }

        if (! empty($segment['status'])) {
            $query->where('status', $segment['status']);
        }
        if (! empty($segment['verified'])) {
            $query->where('verified', true);
        }
        if (! empty($segment['unverified'])) {
            $query->where(function ($q) {
                $q->where('verified', false)->orWhereNull('verified');
            });
        }
        if (! empty($segment['source'])) {
            $query->where('source', $segment['source']);
        }
        if (! empty($segment['city'])) {
            $query->where('city', $segment['city']);
        }
        if (! empty($segment['hasReferrals'])) {
            $query->where('referrals', '>', 0);
        }
        if ($hasIndividualIds || $hasIndividualEmails) {
            $query->orWhere(function ($q) use ($segment, $hasIndividualIds, $hasIndividualEmails) {
                if ($hasIndividualIds) {
                    $q->whereIn('public_id', $segment['ids'])
                      ->orWhereIn('id', $segment['ids']);
                }
                if ($hasIndividualEmails) {
                    $q->orWhereIn('email', $segment['emails']);
                }
            });
        }

        return $query;
    }

    /**
     * Deliverable recipients for a segment.
     *
     * Unsubscribed addresses are excluded here rather than counted and then
     * silently dropped at send time, because "estimated reach" that overstates
     * by the size of the suppression list is the kind of number nobody can trust.
     */
    public static function reach(array $segment): int
    {
        $suppressed = Unsubscribe::pluck('email')->all();

        $query = self::query($segment)->where('status', '!=', 'unsubscribed');

        if ($suppressed !== []) {
            $query->whereNotIn('email', $suppressed);
        }

        return $query->count();
    }
}
