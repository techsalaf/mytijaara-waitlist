<?php

namespace App\Support;

use App\Models\EmailCampaign;
use App\Models\WaitlistEntry;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;

/**
 * Builds the weekly digest: the numbers, then the email body.
 *
 * The dashboard's "Weekly digest" button used to POST a campaign with
 * `html: ""`, so it produced a draft that would have delivered an empty message
 * and reported nothing back to the operator. Everything here is a live query
 * against `waitlist_entries` and `referrals`; nothing is passed in from the
 * client except the window length.
 */
class WeeklyDigest
{
    /** Clamp so a hand-edited request cannot ask for a 10-year window. */
    public const MIN_DAYS = 1;

    public const MAX_DAYS = 90;

    /**
     * Every figure the digest prints, for the `$days` window ending now.
     *
     * `previousSignups` covers the equally long window immediately before, which
     * is what makes `growth` a real comparison rather than a fixed number.
     *
     * @return array<string,mixed>
     */
    public static function metrics(int $days = 7): array
    {
        $days = max(self::MIN_DAYS, min(self::MAX_DAYS, $days));
        $since = now()->subDays($days);
        $prevStart = now()->subDays($days * 2);

        $signups = WaitlistEntry::where('created_at', '>=', $since)->count();
        $previous = WaitlistEntry::whereBetween('created_at', [$prevStart, $since])->count();
        $verified = WaitlistEntry::where('created_at', '>=', $since)->where('verified', true)->count();

        return [
            'days' => $days,
            'from' => $since->toDateString(),
            'to' => now()->toDateString(),
            'signups' => $signups,
            'previousSignups' => $previous,
            'growth' => self::growth($signups, $previous),
            'verified' => $verified,
            'verifiedRate' => $signups > 0 ? round($verified / $signups * 100, 1) : 0.0,
            'total' => WaitlistEntry::count(),
            'referredSignups' => WaitlistEntry::where('created_at', '>=', $since)
                ->whereNotNull('referred_by_id')->count(),
            'topCities' => self::topCities($since),
            'topReferrers' => self::topReferrers($since),
        ];
    }

    /**
     * Render the digest as a standalone HTML document.
     *
     * Stored on the campaign row, so `CampaignMail` sends exactly this string
     * and the admin preview shows exactly what a recipient receives.
     */
    public static function html(array $metrics): string
    {
        return View::make('mail.weekly-digest', ['m' => $metrics])->render();
    }

    /** Campaign name/subject for a window, stable enough to be idempotent-ish. */
    public static function subject(array $metrics): string
    {
        return "MyTijaara weekly digest — {$metrics['signups']} new signups ({$metrics['from']} to {$metrics['to']})";
    }

    /**
     * Create the digest as a draft campaign. Draft, not sent: the operator still
     * chooses the audience and presses send in the Email module.
     */
    public static function draft(array $metrics, ?int $userId = null): EmailCampaign
    {
        return EmailCampaign::create([
            'public_id' => EmailCampaign::nextPublicId(),
            'name' => "Weekly Digest — {$metrics['to']}",
            'subject' => self::subject($metrics),
            'html' => self::html($metrics),
            'status' => 'draft',
            'created_by' => $userId,
        ]);
    }

    /** @return array<int,array<string,mixed>> */
    private static function topCities(Carbon $since): array
    {
        return WaitlistEntry::where('created_at', '>=', $since)
            ->whereNotNull('city')
            ->select('city', DB::raw('COUNT(*) as signups'))
            ->groupBy('city')
            ->orderByDesc('signups')
            ->limit(5)
            ->get()
            ->map(fn ($row) => ['city' => (string) $row->city, 'signups' => (int) $row->signups])
            ->all();
    }

    /**
     * Referrers ranked by conversions inside the window, not by their lifetime
     * `referrals` counter, so the digest reports the week rather than history.
     *
     * @return array<int,array<string,mixed>>
     */
    private static function topReferrers(Carbon $since): array
    {
        return WaitlistEntry::query()
            ->whereHas('referralsMade', fn ($q) => $q->where('created_at', '>=', $since))
            ->withCount(['referralsMade as period_referrals' => fn ($q) => $q->where('created_at', '>=', $since)])
            ->orderByDesc('period_referrals')
            ->limit(5)
            ->get()
            ->map(fn ($entry) => [
                'name' => (string) $entry->name,
                'email' => (string) $entry->email,
                'referrals' => (int) $entry->period_referrals,
            ])
            ->all();
    }

    private static function growth(int $current, int $previous): float
    {
        if ($previous === 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round(($current - $previous) / $previous * 100, 1);
    }
}
