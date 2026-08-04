<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvent;
use App\Models\EmailCampaign;
use App\Models\WaitlistEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    private const SOURCE_COLORS = [
        'organic' => ['name' => 'Organic Search', 'color' => '#0D7A46'],
        'google' => ['name' => 'Organic Search', 'color' => '#0D7A46'],
        'referral' => ['name' => 'Referral', 'color' => '#D4A017'],
        'instagram' => ['name' => 'Instagram', 'color' => '#166534'],
        'twitter' => ['name' => 'Twitter/X', 'color' => '#1DA1F2'],
        'tiktok' => ['name' => 'TikTok', 'color' => '#000000'],
        'facebook' => ['name' => 'Facebook', 'color' => '#1877F2'],
        'direct' => ['name' => 'Direct', 'color' => '#64748b'],
    ];

    private const DEVICE_COLORS = ['Android' => '#0D7A46', 'iOS' => '#166534', 'Web' => '#D4A017'];

    private const BROWSER_COLORS = ['Chrome' => '#F4B400', 'Safari' => '#0D7A46', 'Firefox' => '#FF7139', 'Edge' => '#0078D7', 'Other' => '#64748b'];

    /**
     * Window length in days for a period-scoped request. `days=0` (or `all`)
     * means "no window": every metric counts the whole table.
     */
    private function windowDays(Request $request): int
    {
        $raw = $request->input('days', 30);
        if ($raw === 'all' || $raw === '0') {
            return 0;
        }

        return min(365, max(0, (int) $raw));
    }

    /**
     * GET /analytics/overview?days=30 -> DashboardStats.
     *
     * Every number is a live count. `days` scopes the window; the growth
     * figures compare that window against the one immediately before it, so
     * the dashboard's period selector changes the whole card row.
     */
    public function overview(Request $request): JsonResponse
    {
        $days = $this->windowDays($request);
        $since = $days > 0 ? now()->subDays($days) : null;
        $prevStart = $days > 0 ? now()->subDays($days * 2) : null;

        $scoped = fn () => $since
            ? WaitlistEntry::where('created_at', '>=', $since)
            : WaitlistEntry::query();

        $total = $scoped()->count();
        $verified = $scoped()->where('verified', true)->count();
        $today = WaitlistEntry::whereDate('created_at', today())->count();

        $thisWeek = WaitlistEntry::where('created_at', '>=', now()->subDays(7))->count();
        $lastWeek = WaitlistEntry::whereBetween('created_at', [now()->subDays(14), now()->subDays(7)])->count();

        // Month-over-month always compares 30-day blocks so the label stays true.
        $thisMonth = WaitlistEntry::where('created_at', '>=', now()->subDays(30))->count();
        $lastMonth = WaitlistEntry::whereBetween('created_at', [now()->subDays(60), now()->subDays(30)])->count();

        $campaigns = $since
            ? EmailCampaign::where('created_at', '>=', $since)
            : EmailCampaign::query();
        $sent = (int) $campaigns->clone()->sum('sent');
        $opens = (int) $campaigns->clone()->sum('opens');
        $clicks = (int) $campaigns->clone()->sum('clicks');

        $visits = $this->eventCount('pageview', $since);
        $ctaClicks = $this->eventCount('cta_click', $since);

        return response()->json(['data' => [
            'visitors' => $visits,
            'totalWaitlist' => $total,
            'todaySignups' => $today,
            'weeklyGrowth' => $this->growth($thisWeek, $lastWeek),
            'monthlyGrowth' => $this->growth($thisMonth, $lastMonth),
            // Without pageview events there is no denominator, so report 0
            // rather than inventing a conversion rate from signups.
            'conversionRate' => $visits > 0 ? round($total / $visits * 100, 1) : 0,
            'ctaClicks' => $ctaClicks,
            'emailOpenRate' => $sent > 0 ? round($opens / $sent * 100, 1) : 0,
            'emailClickRate' => $sent > 0 ? round($clicks / $sent * 100, 1) : 0,
            'verifiedRate' => $total > 0 ? round($verified / $total * 100, 1) : 0,
            'periodDays' => $days,
            'periodSignups' => $total,
            'previousPeriodSignups' => $prevStart
                ? WaitlistEntry::whereBetween('created_at', [$prevStart, $since])->count()
                : 0,
        ]]);
    }

    /** Count events of one type, optionally inside a window. */
    private function eventCount(string $type, ?Carbon $since): int
    {
        $q = AnalyticsEvent::where('type', $type);
        if ($since) {
            $q->where('created_at', '>=', $since);
        }

        return $q->count();
    }

    /** GET /analytics/trends?days=30 -> SignupTrendPoint[]. */
    public function trends(Request $request): JsonResponse
    {
        $days = min(90, max(7, (int) $request->input('days', 30)));
        $start = today()->subDays($days - 1);

        $rows = WaitlistEntry::query()
            ->where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as d, COUNT(*) as signups, SUM(verified = 1) as verified')
            ->groupBy('d')
            ->pluck('signups', 'd');
        $verifiedRows = WaitlistEntry::query()
            ->where('created_at', '>=', $start)
            ->where('verified', true)
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd');

        $out = [];
        for ($i = 0; $i < $days; $i++) {
            $date = $start->copy()->addDays($i);
            $key = $date->toDateString();
            $out[] = [
                'date' => $key,
                'label' => $date->format('M j'),
                'signups' => (int) ($rows[$key] ?? 0),
                'verified' => (int) ($verifiedRows[$key] ?? 0),
            ];
        }

        return response()->json(['data' => $out]);
    }

    /** GET /analytics/traffic-sources?days=30 -> TrafficSource[]. */
    public function trafficSources(Request $request): JsonResponse
    {
        $days = $this->windowDays($request);
        $q = WaitlistEntry::query();
        if ($days > 0) {
            $q->where('created_at', '>=', now()->subDays($days));
        }
        $counts = $q->select('source', DB::raw('COUNT(*) as c'))->groupBy('source')->pluck('c', 'source');
        $total = max(1, $counts->sum());

        $agg = [];
        foreach ($counts as $source => $c) {
            $meta = self::SOURCE_COLORS[$source] ?? ['name' => ucfirst((string) $source), 'color' => '#64748b'];
            $name = $meta['name'];
            $agg[$name] ??= ['name' => $name, 'value' => 0, 'color' => $meta['color']];
            $agg[$name]['value'] += $c;
        }
        $out = array_values($agg);
        foreach ($out as &$row) {
            $row['value'] = round($row['value'] / $total * 100, 1);
        }
        usort($out, fn ($a, $b) => $b['value'] <=> $a['value']);

        return response()->json(['data' => $out]);
    }

    /**
     * GET /analytics/cities?days=30 -> CityBreakdown[].
     *
     * `users` is scoped to the window; `growth` always compares the window
     * against the equally long one before it.
     */
    public function cities(Request $request): JsonResponse
    {
        $days = $this->windowDays($request) ?: 30;

        $recent = WaitlistEntry::where('created_at', '>=', now()->subDays($days))
            ->select('city', DB::raw('COUNT(*) as c'))->groupBy('city')->pluck('c', 'city');
        $prev = WaitlistEntry::whereBetween('created_at', [now()->subDays($days * 2), now()->subDays($days)])
            ->select('city', DB::raw('COUNT(*) as c'))->groupBy('city')->pluck('c', 'city');

        $q = WaitlistEntry::query();
        if ($this->windowDays($request) > 0) {
            $q->where('created_at', '>=', now()->subDays($days));
        }

        $out = $q->select('city', DB::raw('COUNT(*) as users'))
            ->whereNotNull('city')->groupBy('city')->orderByDesc('users')->limit(10)->get()
            ->map(fn ($r) => [
                'city' => $r->city,
                'users' => (int) $r->users,
                'growth' => $this->growth((int) ($recent[$r->city] ?? 0), (int) ($prev[$r->city] ?? 0)),
            ]);

        return response()->json(['data' => $out]);
    }

    /** GET /analytics/devices?days=30 -> DeviceBreakdown[]. */
    public function devices(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->breakdown('device', self::DEVICE_COLORS, $this->windowDays($request)),
        ]);
    }

    /** GET /analytics/browsers?days=30 -> BrowserBreakdown[]. */
    public function browsers(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->breakdown('browser', self::BROWSER_COLORS, $this->windowDays($request)),
        ]);
    }

    /**
     * GET /analytics/funnel?days=30 -> FunnelStep[].
     *
     * Every step is a real count. When no pageview/CTA events exist the first
     * two steps report 0 instead of a ratio-derived guess, and `pct` is then
     * based on completed forms so the chart still reads correctly.
     */
    public function funnel(Request $request): JsonResponse
    {
        $days = $this->windowDays($request);
        $since = $days > 0 ? now()->subDays($days) : null;

        $entries = fn () => $since
            ? WaitlistEntry::where('created_at', '>=', $since)
            : WaitlistEntry::query();

        $total = $entries()->count();
        $verified = $entries()->where('verified', true)->count();
        $referred = $entries()->where('referrals', '>', 0)->count();

        $visits = $this->eventCount('pageview', $since);
        $clicks = $this->eventCount('cta_click', $since);

        $steps = [
            ['stage' => 'Landing Page Visit', 'value' => $visits],
            ['stage' => 'Clicked Join Waitlist', 'value' => $clicks],
            ['stage' => 'Completed Form', 'value' => $total],
            ['stage' => 'Verified Email', 'value' => $verified],
            ['stage' => 'Referred a Friend', 'value' => $referred],
        ];
        // Use the largest step as the 100% baseline so a missing pageview
        // stream cannot make every later stage read as infinite percent.
        $base = max(1, max(array_column($steps, 'value')));
        foreach ($steps as &$s) {
            $s['pct'] = round($s['value'] / $base * 100, 1);
        }

        return response()->json(['data' => $steps]);
    }

    /** @param array<string,string> $colors */
    private function breakdown(string $column, array $colors, int $days = 0): array
    {
        $q = WaitlistEntry::query();
        if ($days > 0) {
            $q->where('created_at', '>=', now()->subDays($days));
        }
        $counts = $q->select($column, DB::raw('COUNT(*) as c'))
            ->whereNotNull($column)->groupBy($column)->pluck('c', $column);
        $total = max(1, $counts->sum());

        $out = [];
        foreach ($counts as $name => $c) {
            $out[] = ['name' => (string) $name, 'value' => round($c / $total * 100, 1), 'color' => $colors[$name] ?? '#64748b'];
        }
        usort($out, fn ($a, $b) => $b['value'] <=> $a['value']);

        return $out;
    }

    private function growth(int $current, int $previous): float
    {
        if ($previous === 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round(($current - $previous) / $previous * 100, 1);
    }
}
