<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WaitlistEntryResource;
use App\Models\Referral;
use App\Models\ReferralVisit;
use App\Models\WaitlistEntry;
use App\Support\Audit;
use App\Support\ReferralProgram;
use App\Support\RewardDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReferralController extends Controller
{
    /** GET /referrals/leaderboard — top referrers with rank + points. */
    public function leaderboard(Request $request): JsonResponse
    {
        $limit = min(100, max(1, (int) $request->input('limit', 25)));

        $entries = WaitlistEntry::query()
            ->where('referrals', '>', 0)
            ->orderByDesc('referrals')
            ->orderBy('created_at')
            ->limit($limit)
            ->get();

        $rank = 0;
        $data = $entries->map(function ($entry) use (&$rank, $request) {
            $rank++;
            $points = (int) $entry->referralsMade()->sum('points');

            return array_merge((new WaitlistEntryResource($entry))->toArray($request), [
                'rank' => $rank,
                'points' => $points > 0 ? $points : (int) $entry->referrals * 10,
            ]);
        });

        return response()->json(['data' => $data]);
    }

    /** GET /referrals/:id — a single referrer with the people they referred. */
    public function show(string $id): JsonResponse
    {
        $entry = WaitlistEntry::with('referralsMade.referred')->where('public_id', $id)->firstOrFail();

        $referred = $entry->referralsMade->map(fn ($r) => $r->referred
            ? new WaitlistEntryResource($r->referred)
            : null)->filter()->values();

        return response()->json(['data' => [
            'referrer' => new WaitlistEntryResource($entry),
            'referred' => $referred,
            'points' => (int) $entry->referralsMade()->sum('points'),
        ]]);
    }

    /**
     * Window length in days. `days=0` means all time.
     *
     * This used to be a hardcoded `today()->subDays(29)`, so the referral pages
     * always showed 30 days no matter what their caption said.
     */
    private function windowDays(Request $request): int
    {
        $raw = $request->input('days', 30);
        if ($raw === 'all' || $raw === '0' || $raw === 0) {
            return 0;
        }

        return min(365, max(1, (int) $raw));
    }

    /**
     * GET /referrals/analytics?days=30 — visits, conversions, trend, sources.
     *
     * Every count is scoped to the window, including the headline numbers.
     * Previously the cards counted the whole table while the chart showed 30
     * days, so the two disagreed on the same page.
     */
    public function analytics(Request $request): JsonResponse
    {
        $days = $this->windowDays($request);
        $since = $days > 0 ? now()->subDays($days) : null;

        $visitsQuery = fn () => $since
            ? ReferralVisit::where('created_at', '>=', $since)
            : ReferralVisit::query();

        $totalVisits = $visitsQuery()->count();
        $converted = $visitsQuery()->where('converted', true)->count();

        $referredQuery = fn () => $since
            ? WaitlistEntry::whereNotNull('referred_by_id')->where('created_at', '>=', $since)
            : WaitlistEntry::whereNotNull('referred_by_id');

        $totalReferred = $referredQuery()->count();

        // "Active" means active inside the window: someone who referred nobody
        // in the last 7 days is not an active referrer for a 7-day view.
        $activeReferrers = $since
            ? Referral::where('created_at', '>=', $since)->distinct('referrer_id')->count('referrer_id')
            : WaitlistEntry::where('referrals', '>', 0)->count();

        // Trend series length is capped: a day-by-day chart over all time is
        // unbounded, and the frontend asks for at most 90 anyway.
        $trendDays = $days > 0 ? min(90, $days) : 90;
        $start = today()->subDays($trendDays - 1);

        $visitsByDay = ReferralVisit::where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as visits')
            ->groupBy('date')->pluck('visits', 'date');
        $conversionsByDay = ReferralVisit::where('created_at', '>=', $start)
            ->where('converted', true)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as conversions')
            ->groupBy('date')->pluck('conversions', 'date');
        $signupsByDay = WaitlistEntry::whereNotNull('referred_by_id')
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as signups')
            ->groupBy('date')->pluck('signups', 'date');

        $trend = collect(range(0, $trendDays - 1))->map(function (int $offset) use ($start, $visitsByDay, $conversionsByDay, $signupsByDay) {
            $date = $start->copy()->addDays($offset);
            $key = $date->toDateString();

            return [
                'date' => $key,
                'label' => $date->format('M j'),
                'visits' => (int) ($visitsByDay[$key] ?? 0),
                'conversions' => (int) ($conversionsByDay[$key] ?? 0),
                'signups' => (int) ($signupsByDay[$key] ?? 0),
            ];
        })->values();

        $sourcesQuery = ReferralVisit::select('utm_source', DB::raw('COUNT(*) as value'))
            ->whereNotNull('utm_source');
        if ($since) {
            $sourcesQuery->where('created_at', '>=', $since);
        }
        $sources = $sourcesQuery->groupBy('utm_source')->orderByDesc('value')->get()
            ->map(fn ($row) => ['name' => ucfirst($row->utm_source), 'value' => (int) $row->value]);

        return response()->json(['data' => [
            'periodDays' => $days,
            'totalVisits' => $totalVisits,
            'conversions' => $converted,
            'conversionRate' => $totalVisits > 0 ? round($converted / $totalVisits * 100, 1) : 0,
            'totalReferred' => $totalReferred,
            'activeReferrers' => $activeReferrers,
            'trend' => $trend,
            'sources' => $sources,
            'rewards' => $this->rewardTotals($since),
            // Carried here so the overview card can show the real program
            // without also requiring `settings.view`, which an analyst holding
            // only `referrals.view` does not have.
            'program' => ReferralProgram::current(),
        ]]);
    }

    /**
     * Real reward figures for the window.
     *
     * The analytics page printed `value="₦124k" delta={38.4}` as a literal. The
     * amount is derived from the program settings and the rows actually marked
     * rewarded, so an unpaid program reports zero instead of a number.
     *
     * @return array<string,mixed>
     */
    private function rewardTotals(?Carbon $since): array
    {
        $program = ReferralProgram::current();

        $paidQuery = fn () => $since
            ? Referral::whereNotNull('rewarded_at')->where('rewarded_at', '>=', $since)
            : Referral::whereNotNull('rewarded_at');

        $paidReferrals = $paidQuery()->count();
        $paidReferrers = $paidQuery()->distinct('referrer_id')->count('referrer_id');
        $pendingReferrals = Referral::query()->pendingReward()->count();

        $amount = $paidReferrals * (int) $program['referrerReward'];

        return [
            'currency' => (string) $program['currency'],
            'referrerReward' => (int) $program['referrerReward'],
            'paidReferrals' => $paidReferrals,
            'paidReferrers' => $paidReferrers,
            'pendingReferrals' => $pendingReferrals,
            'amountPaid' => $amount,
            'amountPaidLabel' => ReferralProgram::format($amount, (string) $program['currency']),
        ];
    }

    /**
     * GET /referrals/rewards/pending — everyone with something payable.
     *
     * The admin action needs a real selection to act on; this is what "Send
     * rewards" confirms before it writes anything.
     */
    public function pendingRewards(): JsonResponse
    {
        return response()->json([
            'data' => RewardDispatcher::pending(),
            'meta' => ['program' => ReferralProgram::current()],
        ]);
    }

    /**
     * POST /referrals/rewards — pay the given referrers.
     *
     * Returns the real counts. `rewarded + skipped + failed` always equals the
     * number of distinct ids submitted, so the toast can never claim more than
     * happened.
     */
    public function sendRewards(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['string', 'max:64'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $result = RewardDispatcher::dispatch(
            publicIds: $data['ids'],
            note: $data['note'] ?? null,
            actor: $request->user(),
        );

        Audit::record($request, 'referrals.rewarded', 'referrals', [
            'requested' => count(array_unique($data['ids'])),
            'rewarded' => $result['rewarded'],
            'skipped' => $result['skipped'],
            'failed' => $result['failed'],
        ]);

        // 422 when nothing at all was paid and something failed, so the client
        // shows an error rather than a success toast with zeroes in it.
        $status = $result['rewarded'] === 0 && $result['failed'] > 0 ? 422 : 200;

        return response()->json(['data' => $result], $status);
    }

    /**
     * GET /referrals/export — one CSV row per referrer.
     *
     * Streamed and chunked for the same reason as the waitlist export: the file
     * is built by the database, not held in memory.
     */
    public function export(Request $request): StreamedResponse
    {
        $filename = 'mytijaara-referrals-'.now()->format('Y-m-d').'.csv';
        $program = ReferralProgram::current();

        return response()->streamDownload(function () use ($program) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'referrer_id', 'name', 'email', 'city', 'referral_code',
                'referrals', 'converted', 'pending_reward', 'rewarded',
                'points', 'reward_currency', 'reward_earned', 'joined_at', 'last_rewarded_at',
            ]);

            WaitlistEntry::where('referrals', '>', 0)
                ->orderByDesc('referrals')
                ->chunk(500, function ($rows) use ($out, $program) {
                    foreach ($rows as $r) {
                        $converted = Referral::where('referrer_id', $r->id)->where('converted', true)->count();
                        $rewarded = Referral::where('referrer_id', $r->id)->whereNotNull('rewarded_at')->count();
                        $pending = Referral::where('referrer_id', $r->id)->pendingReward()->count();
                        $lastRewarded = Referral::where('referrer_id', $r->id)->max('rewarded_at');

                        fputcsv($out, [
                            $r->public_id, $r->name, $r->email, $r->city, $r->referral_code,
                            (int) $r->referrals, $converted, $pending, $rewarded,
                            (int) Referral::where('referrer_id', $r->id)->sum('points'),
                            $program['currency'],
                            $rewarded * (int) $program['referrerReward'],
                            optional($r->created_at)->toDateTimeString(),
                            $lastRewarded ? (string) $lastRewarded : '',
                        ]);
                    }
                });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /** POST /referrals/visit — PUBLIC: record a referral-link click. */
    public function visit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32'],
            'utm_source' => ['nullable', 'string', 'max:120'],
        ]);

        $referrer = WaitlistEntry::where('referral_code', $data['code'])->first();

        ReferralVisit::create([
            'code' => $data['code'],
            'referrer_id' => $referrer?->id,
            'ip_hash' => hash('sha256', $request->ip().config('app.key')),
            'country' => 'Nigeria',
            'utm_source' => $data['utm_source'] ?? null,
        ]);

        return response()->json(['data' => ['valid' => (bool) $referrer]], 201);
    }
}
