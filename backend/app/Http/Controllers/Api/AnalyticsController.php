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

    /** GET /analytics/overview -> DashboardStats. */
    public function overview(): JsonResponse
    {
        $total = WaitlistEntry::count();
        $verified = WaitlistEntry::where('verified', true)->count();

        $today = WaitlistEntry::whereDate('created_at', today())->count();

        $thisWeek = WaitlistEntry::where('created_at', '>=', now()->subDays(7))->count();
        $lastWeek = WaitlistEntry::whereBetween('created_at', [now()->subDays(14), now()->subDays(7)])->count();
        $thisMonth = WaitlistEntry::where('created_at', '>=', now()->subDays(30))->count();
        $lastMonth = WaitlistEntry::whereBetween('created_at', [now()->subDays(60), now()->subDays(30)])->count();

        $sent = (int) EmailCampaign::sum('sent');
        $opens = (int) EmailCampaign::sum('opens');
        $clicks = (int) EmailCampaign::sum('clicks');

        $visits = AnalyticsEvent::where('type', 'pageview')->count();
        $ctaClicks = AnalyticsEvent::where('type', 'cta_click')->count();

        return response()->json(['data' => [
            'visitors' => $visits,
            'totalWaitlist' => $total,
            'todaySignups' => $today,
            'weeklyGrowth' => $this->growth($thisWeek, $lastWeek),
            'monthlyGrowth' => $this->growth($thisMonth, $lastMonth),
            'conversionRate' => $visits > 0 ? round($total / $visits * 100, 1) : ($total > 0 ? round($verified / $total * 100, 1) : 0),
            'ctaClicks' => $ctaClicks,
            'emailOpenRate' => $sent > 0 ? round($opens / $sent * 100, 1) : 0,
            'emailClickRate' => $sent > 0 ? round($clicks / $sent * 100, 1) : 0,
            'verifiedRate' => $total > 0 ? round($verified / $total * 100, 1) : 0,
        ]]);
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

    /** GET /analytics/traffic-sources -> TrafficSource[]. */
    public function trafficSources(): JsonResponse
    {
        $counts = WaitlistEntry::select('source', DB::raw('COUNT(*) as c'))->groupBy('source')->pluck('c', 'source');
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

    /** GET /analytics/cities -> CityBreakdown[]. */
    public function cities(): JsonResponse
    {
        $recent = WaitlistEntry::where('created_at', '>=', now()->subDays(30))
            ->select('city', DB::raw('COUNT(*) as c'))->groupBy('city')->pluck('c', 'city');
        $prev = WaitlistEntry::whereBetween('created_at', [now()->subDays(60), now()->subDays(30)])
            ->select('city', DB::raw('COUNT(*) as c'))->groupBy('city')->pluck('c', 'city');

        $out = WaitlistEntry::select('city', DB::raw('COUNT(*) as users'))
            ->whereNotNull('city')->groupBy('city')->orderByDesc('users')->limit(10)->get()
            ->map(fn ($r) => [
                'city' => $r->city,
                'users' => (int) $r->users,
                'growth' => $this->growth((int) ($recent[$r->city] ?? 0), (int) ($prev[$r->city] ?? 0)),
            ]);

        return response()->json(['data' => $out]);
    }

    /** GET /analytics/devices -> DeviceBreakdown[]. */
    public function devices(): JsonResponse
    {
        return response()->json(['data' => $this->breakdown('device', self::DEVICE_COLORS)]);
    }

    /** GET /analytics/browsers -> BrowserBreakdown[]. */
    public function browsers(): JsonResponse
    {
        return response()->json(['data' => $this->breakdown('browser', self::BROWSER_COLORS)]);
    }

    /** GET /analytics/funnel -> FunnelStep[]. */
    public function funnel(): JsonResponse
    {
        $total = WaitlistEntry::count();
        $verified = WaitlistEntry::where('verified', true)->count();
        $referred = WaitlistEntry::where('referrals', '>', 0)->count();

        $visits = AnalyticsEvent::where('type', 'pageview')->count();
        $clicks = AnalyticsEvent::where('type', 'cta_click')->count();
        // Fall back to waitlist-derived estimates only when no events exist yet.
        $visits = $visits ?: (int) round($total / 0.081);
        $clicks = $clicks ?: (int) round($total / 0.31);

        $steps = [
            ['stage' => 'Landing Page Visit', 'value' => $visits],
            ['stage' => 'Clicked Join Waitlist', 'value' => $clicks],
            ['stage' => 'Completed Form', 'value' => $total],
            ['stage' => 'Verified Email', 'value' => $verified],
            ['stage' => 'Referred a Friend', 'value' => $referred],
        ];
        $base = max(1, $steps[0]['value']);
        foreach ($steps as &$s) {
            $s['pct'] = round($s['value'] / $base * 100, 1);
        }

        return response()->json(['data' => $steps]);
    }

    /** @param array<string,string> $colors */
    private function breakdown(string $column, array $colors): array
    {
        $counts = WaitlistEntry::select($column, DB::raw('COUNT(*) as c'))
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
