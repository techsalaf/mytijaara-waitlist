<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailCampaign;
use App\Models\EmailEvent;
use App\Models\Unsubscribe;
use App\Models\WaitlistEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Public open/click tracking + provider webhook + unsubscribe. No auth: these
 * are hit by mail clients and the ESP, not the admin panel.
 */
class EmailTrackingController extends Controller
{
    /** GET /track/open/:campaign — 1x1 transparent gif pixel. */
    public function open(Request $request, string $campaign): Response
    {
        $c = EmailCampaign::where('public_id', $campaign)->first();
        if ($c) {
            EmailEvent::create([
                'campaign_id' => $c->id,
                'email' => (string) $request->query('e', ''),
                'type' => 'open',
                'ip_hash' => hash('sha256', $request->ip().config('app.key')),
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ]);
            $c->increment('opens');
        }

        // 1x1 transparent GIF.
        $gif = base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');

        return response($gif, 200, [
            'Content-Type' => 'image/gif',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }

    /** GET /track/click/:campaign — record a click then redirect to the target url. */
    public function click(Request $request, string $campaign): \Symfony\Component\HttpFoundation\Response
    {
        $url = (string) $request->query('url', config('app.frontend_url', config('app.url')));
        $c = EmailCampaign::where('public_id', $campaign)->first();
        if ($c) {
            EmailEvent::create([
                'campaign_id' => $c->id,
                'email' => (string) $request->query('e', ''),
                'type' => 'click',
                'url' => substr($url, 0, 255),
                'ip_hash' => hash('sha256', $request->ip().config('app.key')),
            ]);
            $c->increment('clicks');
        }

        // Only allow http(s) redirect targets.
        if (! preg_match('#^https?://#i', $url)) {
            $url = config('app.frontend_url', config('app.url'));
        }

        return redirect()->away($url);
    }

    /** POST /webhooks/email — ESP delivery/bounce/complaint webhook. */
    public function webhook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'event' => ['required', 'string'],   // delivered | bounce | complaint | open | click
            'campaign' => ['nullable', 'string'],
        ]);

        $campaign = $data['campaign'] ? EmailCampaign::where('public_id', $data['campaign'])->first() : null;
        $type = strtolower($data['event']);

        EmailEvent::create([
            'campaign_id' => $campaign?->id,
            'email' => $data['email'],
            'type' => $type,
        ]);

        if ($campaign && in_array($type, ['bounce', 'complaint'], true)) {
            $campaign->increment('bounces');
        }

        if (in_array($type, ['complaint', 'bounce'], true)) {
            Unsubscribe::firstOrCreate(['email' => $data['email']], ['reason' => $type]);
            WaitlistEntry::where('email', $data['email'])->update(['status' => 'unsubscribed']);
        }

        return response()->json(['data' => ['received' => true]]);
    }

    /** POST /unsubscribe — PUBLIC one-click unsubscribe from the mail footer link. */
    public function unsubscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        Unsubscribe::firstOrCreate(['email' => $data['email']], ['reason' => $data['reason'] ?? 'user_request']);
        WaitlistEntry::where('email', $data['email'])->update(['status' => 'unsubscribed']);
        EmailEvent::create(['email' => $data['email'], 'type' => 'unsubscribe']);

        return response()->json(['data' => ['unsubscribed' => true]]);
    }
}
