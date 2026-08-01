<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class EventController extends Controller
{
    /** POST /events — PUBLIC page-view / cta-click ingestion from the landing site. */
    public function store(Request $request): JsonResponse
    {
        $key = 'events:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 120)) {
            return response()->json(['data' => ['accepted' => false]], 429);
        }
        RateLimiter::hit($key, 60);

        $data = $request->validate([
            'type' => ['required', 'string', 'max:64'],
            'visitorId' => ['nullable', 'string', 'max:64'],
            'sessionId' => ['nullable', 'string', 'max:64'],
            'path' => ['nullable', 'string', 'max:512'],
            'referrer' => ['nullable', 'string', 'max:512'],
            'source' => ['nullable', 'string', 'max:64'],
            'utm_source' => ['nullable', 'string', 'max:120'],
            'utm_medium' => ['nullable', 'string', 'max:120'],
            'utm_campaign' => ['nullable', 'string', 'max:120'],
            'meta' => ['nullable', 'array'],
        ]);

        AnalyticsEvent::create([
            'type' => $data['type'],
            'visitor_id' => $data['visitorId'] ?? null,
            'session_id' => $data['sessionId'] ?? null,
            'path' => $data['path'] ?? null,
            'referrer' => $data['referrer'] ?? null,
            'source' => $data['source'] ?? null,
            'utm_source' => $data['utm_source'] ?? null,
            'utm_medium' => $data['utm_medium'] ?? null,
            'utm_campaign' => $data['utm_campaign'] ?? null,
            'device' => $this->detectDevice($request->userAgent()),
            'browser' => $this->detectBrowser($request->userAgent()),
            'country' => 'Nigeria',
            'ip_hash' => hash('sha256', $request->ip().config('app.key')),
            'meta' => $data['meta'] ?? null,
        ]);

        return response()->json(['data' => ['accepted' => true]], 201);
    }

    private function detectDevice(?string $ua): string
    {
        $ua = strtolower((string) $ua);
        if (str_contains($ua, 'iphone') || str_contains($ua, 'ipad')) {
            return 'iOS';
        }
        if (str_contains($ua, 'android')) {
            return 'Android';
        }

        return 'Web';
    }

    private function detectBrowser(?string $ua): string
    {
        $ua = strtolower((string) $ua);
        return match (true) {
            str_contains($ua, 'edg') => 'Edge',
            str_contains($ua, 'firefox') => 'Firefox',
            str_contains($ua, 'chrome') => 'Chrome',
            str_contains($ua, 'safari') => 'Safari',
            default => 'Other',
        };
    }
}
