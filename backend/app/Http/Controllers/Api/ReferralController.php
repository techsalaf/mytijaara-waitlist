<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WaitlistEntryResource;
use App\Models\ReferralVisit;
use App\Models\WaitlistEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    /** GET /referrals/analytics — visits, conversions, top codes. */
    public function analytics(): JsonResponse
    {
        $totalVisits = ReferralVisit::count();
        $converted = ReferralVisit::where('converted', true)->count();
        $totalReferred = WaitlistEntry::whereNotNull('referred_by_id')->count();
        $referrers = WaitlistEntry::where('referrals', '>', 0)->count();
        $start = today()->subDays(29);
        $visitsByDay = ReferralVisit::where('created_at', '>=', $start)->selectRaw('DATE(created_at) as date, COUNT(*) as visits')->groupBy('date')->pluck('visits', 'date');
        $conversionsByDay = ReferralVisit::where('created_at', '>=', $start)->where('converted', true)->selectRaw('DATE(created_at) as date, COUNT(*) as conversions')->groupBy('date')->pluck('conversions', 'date');
        $signupsByDay = WaitlistEntry::whereNotNull('referred_by_id')->where('created_at', '>=', $start)->selectRaw('DATE(created_at) as date, COUNT(*) as signups')->groupBy('date')->pluck('signups', 'date');

        $trend = collect(range(0, 29))->map(function (int $offset) use ($start, $visitsByDay, $conversionsByDay, $signupsByDay) {
            $date = $start->copy()->addDays($offset);
            $key = $date->toDateString();
            return ['date' => $key, 'label' => $date->format('M j'), 'visits' => (int) ($visitsByDay[$key] ?? 0), 'conversions' => (int) ($conversionsByDay[$key] ?? 0), 'signups' => (int) ($signupsByDay[$key] ?? 0)];
        })->values();
        $sources = ReferralVisit::select('utm_source', DB::raw('COUNT(*) as value'))->whereNotNull('utm_source')->groupBy('utm_source')->orderByDesc('value')->get()->map(fn ($row) => ['name' => ucfirst($row->utm_source), 'value' => (int) $row->value]);

        return response()->json(['data' => [
            'totalVisits' => $totalVisits,
            'conversions' => $converted,
            'conversionRate' => $totalVisits > 0 ? round($converted / $totalVisits * 100, 1) : 0,
            'totalReferred' => $totalReferred,
            'activeReferrers' => $referrers,
            'trend' => $trend,
            'sources' => $sources,
        ]]);
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
