<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WaitlistEntryResource;
use App\Models\Referral;
use App\Models\WaitlistEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WaitlistController extends Controller
{
    /** GET /waitlist — admin list with search / status / source filters. */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string'],
            'source' => ['nullable', 'string'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
            'sort' => ['nullable', 'string'],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $query = WaitlistEntry::query()->with('referredBy');

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if (($status = $request->input('status')) && $status !== 'all') {
            $query->where('status', $status);
        }

        if (($source = $request->input('source')) && $source !== 'all') {
            $query->where('source', $source);
        }

        $sort = $request->input('sort', 'created_at');
        $allowedSorts = ['created_at', 'name', 'referrals', 'position', 'status'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }
        $query->orderBy($sort, $request->input('direction', 'desc'));

        $perPage = (int) $request->input('per_page', 25);
        $page = $query->paginate($perPage);

        return response()->json([
            'data' => WaitlistEntryResource::collection($page->items()),
            'meta' => [
                'total' => $page->total(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
            ],
        ]);
    }

    /** GET /waitlist/count — public counter for the landing page. */
    public function count(): JsonResponse
    {
        return response()->json(['data' => ['total' => WaitlistEntry::count()]]);
    }

    /** GET /waitlist/verify/:token — PUBLIC: confirm a signup's email. */
    public function verify(string $token): JsonResponse
    {
        $entry = WaitlistEntry::where('verification_token', $token)->first();

        if (! $entry) {
            throw ValidationException::withMessages([
                'token' => ['This verification link is invalid or has already been used.'],
            ]);
        }

        if (! $entry->verified) {
            $entry->forceFill([
                'verified' => true,
                'verified_at' => now(),
                'verification_token' => null,
            ])->save();

            Referral::where('referred_id', $entry->id)
                ->where('converted', false)
                ->update(['converted' => true, 'converted_at' => now()]);
        }

        return response()->json(['data' => new WaitlistEntryResource($entry->fresh('referredBy'))]);
    }

    /** GET /waitlist/:id — admin single entry by public_id. */
    public function show(string $id): JsonResponse
    {
        $entry = WaitlistEntry::with('referredBy')->where('public_id', $id)->first();

        return response()->json(['data' => $entry ? new WaitlistEntryResource($entry) : null]);
    }

    /** POST /waitlist — PUBLIC signup. Honeypot + dedupe + rate limit + referral. */
    public function store(Request $request): JsonResponse
    {
        // Honeypot: bots fill hidden `website`. Silently accept-looking reject.
        if (filled($request->input('website'))) {
            throw ValidationException::withMessages(['email' => ['Invalid submission.']]);
        }

        $key = 'waitlist-signup:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 10)) {
            throw ValidationException::withMessages([
                'email' => ['Too many signups from this network. Try again later.'],
            ])->status(429);
        }
        RateLimiter::hit($key, 3600);

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32'],
            'city' => ['nullable', 'string', 'max:120'],
            'state' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', Rule::in(['customer', 'vendor', 'rider', 'artisan'])],
            'interest' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:64'],
            'device' => ['nullable', 'string', 'max:32'],
            'tags' => ['nullable', 'array'],
            'referralCode' => ['nullable', 'string', 'max:32'],
            'consent' => ['nullable'],
            'utm_source' => ['nullable', 'string', 'max:120'],
            'utm_medium' => ['nullable', 'string', 'max:120'],
            'utm_campaign' => ['nullable', 'string', 'max:120'],
        ]);

        if (WaitlistEntry::where('email', $data['email'])->exists()) {
            throw ValidationException::withMessages([
                'email' => ['This email is already on the waitlist.'],
            ]);
        }

        $entry = DB::transaction(function () use ($data, $request) {
            $referrer = null;
            if (! empty($data['referralCode'])) {
                $referrer = WaitlistEntry::where('referral_code', $data['referralCode'])->first();
            }

            $position = (int) WaitlistEntry::max('position') + 1;

            $entry = WaitlistEntry::create([
                'public_id' => 'wl_'.str_pad((string) $position, 5, '0', STR_PAD_LEFT),
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'city' => $data['city'] ?? null,
                'state' => $data['state'] ?? null,
                'role' => $data['role'] ?? 'customer',
                'interest' => $data['interest'] ?? null,
                'status' => 'active',
                'verified' => false,
                'verification_token' => Str::random(48),
                'referral_code' => $this->uniqueReferralCode(),
                'referred_by_id' => $referrer?->id,
                'referrals' => 0,
                'position' => $position,
                'source' => $data['source'] ?? ($referrer ? 'referral' : 'organic'),
                'device' => $data['device'] ?? $this->detectDevice($request->userAgent()),
                'browser' => $this->detectBrowser($request->userAgent()),
                'country' => 'Nigeria',
                'utm_source' => $data['utm_source'] ?? null,
                'utm_medium' => $data['utm_medium'] ?? null,
                'utm_campaign' => $data['utm_campaign'] ?? null,
                'ip_hash' => hash('sha256', $request->ip().config('app.key')),
                'tags' => $data['tags'] ?? [],
                'last_active_at' => now(),
            ]);

            if ($referrer) {
                $referrer->increment('referrals');
                Referral::create([
                    'referrer_id' => $referrer->id,
                    'referred_id' => $entry->id,
                    'code' => $referrer->referral_code,
                    'converted' => false,
                    'points' => 10,
                ]);
            }

            return $entry;
        });

        return response()->json(['data' => new WaitlistEntryResource($entry->load('referredBy'))], 201);
    }

    /** PATCH /waitlist/:id — admin partial update. */
    public function update(Request $request, string $id): JsonResponse
    {
        $entry = WaitlistEntry::where('public_id', $id)->firstOrFail();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('waitlist_entries', 'email')->ignore($entry->id)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:32'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'state' => ['sometimes', 'nullable', 'string', 'max:120'],
            'status' => ['sometimes', Rule::in(['active', 'invited', 'onboarded', 'unsubscribed'])],
            'verified' => ['sometimes', 'boolean'],
            'tags' => ['sometimes', 'array'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ]);

        if (array_key_exists('verified', $data) && $data['verified'] && ! $entry->verified) {
            $data['verified_at'] = now();
        }

        $entry->update($data);

        return response()->json(['data' => new WaitlistEntryResource($entry->fresh('referredBy'))]);
    }

    /** POST /waitlist/bulk-delete — soft-delete many, return the removed rows. */
    public function bulkDelete(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['string']]);

        $entries = WaitlistEntry::whereIn('public_id', $data['ids'])->get();
        $removed = WaitlistEntryResource::collection($entries);
        WaitlistEntry::whereIn('public_id', $data['ids'])->delete();

        return response()->json(['data' => ['removed' => $removed]]);
    }

    /** POST /waitlist/restore — restore soft-deleted rows by public_id. */
    public function restore(Request $request): JsonResponse
    {
        $data = $request->validate(['users' => ['required', 'array']]);
        $ids = collect($data['users'])->pluck('id')->filter()->all();

        $restored = WaitlistEntry::onlyTrashed()->whereIn('public_id', $ids)->restore();

        return response()->json(['data' => ['restored' => (int) $restored]]);
    }

    /** GET /waitlist/export — CSV of the current filter set. */
    public function export(Request $request): StreamedResponse
    {
        $filename = 'waitlist-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['id', 'name', 'email', 'phone', 'city', 'state', 'status', 'verified', 'referrals', 'source', 'device', 'joined_at']);
            WaitlistEntry::query()->orderBy('position')->chunk(500, function ($rows) use ($out) {
                foreach ($rows as $r) {
                    fputcsv($out, [$r->public_id, $r->name, $r->email, $r->phone, $r->city, $r->state, $r->status, $r->verified ? 'yes' : 'no', $r->referrals, $r->source, $r->device, optional($r->created_at)->toDateTimeString()]);
                }
            });
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function uniqueReferralCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (WaitlistEntry::where('referral_code', $code)->exists());

        return $code;
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
