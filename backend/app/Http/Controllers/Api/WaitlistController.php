<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WaitlistEntryResource;
use App\Mail\WaitlistWelcomeMail;
use App\Models\AdminNotification;
use App\Models\Referral;
use App\Models\WaitlistEntry;
use App\Support\SmtpConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WaitlistController extends Controller
{
    /** GET /waitlist — admin list. All filters are applied server-side. */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string'],
            'source' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', 'string', 'max:32'],
            'verified' => ['nullable', Rule::in(['verified', 'unverified'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
            'sort' => ['nullable', 'string'],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $query = $this->filtered($request)->with('referredBy');

        $sort = $request->input('sort', 'created_at');
        $allowedSorts = ['created_at', 'name', 'email', 'city', 'referrals', 'position', 'status'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }
        $query->orderBy($sort, $request->input('direction', 'desc') === 'asc' ? 'asc' : 'desc');

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

    /**
     * Shared filter builder for `index` and `export`, so a CSV download always
     * contains exactly the rows the admin is looking at.
     */
    private function filtered(Request $request): \Illuminate\Database\Eloquent\Builder
    {
        $query = WaitlistEntry::query();

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('public_id', 'like', "%{$search}%")
                    ->orWhere('referral_code', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%");
            });
        }

        foreach (['status', 'source', 'city', 'role'] as $field) {
            $value = $request->input($field);
            if ($value && $value !== 'all') {
                $query->where($field, $value);
            }
        }

        if ($verified = $request->input('verified')) {
            if ($verified === 'verified') {
                $query->where('verified', true);
            } elseif ($verified === 'unverified') {
                $query->where('verified', false);
            }
        }

        if ($from = $request->input('from')) {
            $query->where('created_at', '>=', \Illuminate\Support\Carbon::parse($from)->startOfDay());
        }
        if ($to = $request->input('to')) {
            $query->where('created_at', '<=', \Illuminate\Support\Carbon::parse($to)->endOfDay());
        }

        return $query;
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

            $converted = Referral::where('referred_id', $entry->id)
                ->where('converted', false)
                ->get();

            foreach ($converted as $referral) {
                $referral->update(['converted' => true, 'converted_at' => now()]);
            }

            if ($converted->isNotEmpty()) {
                try {
                    AdminNotification::record(
                        type: 'referral',
                        title: 'Referral converted',
                        message: "{$entry->name} verified their email, crediting their referrer.",
                        link: '/admin/referrals',
                        meta: ['entry' => $entry->public_id],
                    );
                } catch (\Throwable $e) {
                    Log::warning('referral notification failed', ['error' => $e->getMessage()]);
                }
            }
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
            'source' => ['nullable', 'string', 'max:64'],
            'device' => ['nullable', 'string', 'max:32'],
            'tags' => ['nullable', 'array'],
            'referralCode' => ['nullable', 'string', 'max:32'],
            'consent' => ['nullable'],
            'utm_source' => ['nullable', 'string', 'max:120'],
            'utm_medium' => ['nullable', 'string', 'max:120'],
            'utm_campaign' => ['nullable', 'string', 'max:120'],
        ]);

        // Soft-deleted rows still hold their email on the unique index, so check
        // trashed rows too: otherwise the insert dies on a duplicate key with a
        // 500 instead of this 422.
        if (WaitlistEntry::withTrashed()->where('email', $data['email'])->exists()) {
            throw ValidationException::withMessages([
                'email' => ['This email is already on the waitlist.'],
            ]);
        }

        $entry = DB::transaction(function () use ($data, $request) {
            $referrer = null;
            if (! empty($data['referralCode'])) {
                $referrer = WaitlistEntry::withTrashed()
                    ->where('referral_code', $data['referralCode'])
                    ->first();
            }

            // `withTrashed()` matters: the default scope hides soft-deleted rows,
            // so a deleted tail would hand back a position already taken and
            // `public_id` would collide with its unique index.
            $position = (int) WaitlistEntry::withTrashed()->max('position') + 1;

            $entry = WaitlistEntry::create([
                'public_id' => $this->uniquePublicId($position),
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'city' => $data['city'] ?? null,
                'state' => $data['state'] ?? null,
                'role' => $data['role'] ?? 'customer',
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

        // Side effects run outside the transaction so a mail or notification
        // failure can never roll back a real signup.
        $this->afterSignup($entry);

        return response()->json(['data' => new WaitlistEntryResource($entry->load('referredBy'))], 201);
    }

    /**
     * Confirmation mail + admin notification. Mail is dispatched to the queue so
     * a slow SMTP server doesn't block the signup response. Notification is
     * synchronous but best-effort (failure is logged, not thrown).
     */
    private function afterSignup(WaitlistEntry $entry): void
    {
        \App\Jobs\SendWaitlistWelcomeJob::dispatch($entry->id);

        try {
            AdminNotification::record(
                type: 'signup',
                title: 'New waitlist signup',
                message: "{$entry->name} joined from ".($entry->city ?: 'an unknown city').'.',
                link: '/admin/waitlist',
                meta: ['entry' => $entry->public_id, 'email' => $entry->email],
            );
        } catch (\Throwable $e) {
            Log::warning('waitlist signup notification failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * `wl_NNNNN` from the position, stepping past any id already taken. Guards
     * the unique index when positions are sparse or historically duplicated.
     */
    private function uniquePublicId(int $position): string
    {
        $candidate = $position;
        for ($i = 0; $i < 1000; $i++) {
            $id = 'wl_'.str_pad((string) $candidate, 5, '0', STR_PAD_LEFT);
            if (! WaitlistEntry::withTrashed()->where('public_id', $id)->exists()) {
                return $id;
            }
            $candidate++;
        }

        return 'wl_'.strtoupper(Str::random(10));
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

    /** POST /waitlist/bulk-update — status / verified / tags across many rows. */
    public function bulkUpdate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['string'],
            'status' => ['sometimes', Rule::in(['active', 'invited', 'onboarded', 'unsubscribed'])],
            'verified' => ['sometimes', 'boolean'],
            'tags' => ['sometimes', 'array'],
        ]);

        $patch = array_intersect_key($data, array_flip(['status', 'verified', 'tags']));
        if ($patch === []) {
            throw ValidationException::withMessages([
                'status' => ['Nothing to update. Provide status, verified, or tags.'],
            ]);
        }

        if (($patch['verified'] ?? false) === true) {
            $patch['verified_at'] = now();
        }

        $updated = 0;
        WaitlistEntry::whereIn('public_id', $data['ids'])->chunkById(200, function ($rows) use ($patch, &$updated) {
            foreach ($rows as $row) {
                $row->update($patch);
                $updated++;
            }
        });

        return response()->json(['data' => ['updated' => $updated]]);
    }

    /** POST /waitlist/:id/email — resend the welcome mail for one entry. */
    public function resendEmail(string $id): JsonResponse
    {
        $entry = WaitlistEntry::where('public_id', $id)->firstOrFail();

        try {
            SmtpConfig::apply();
            Mail::to($entry->email)->send(new WaitlistWelcomeMail($entry));
        } catch (\Throwable $e) {
            Log::warning('waitlist resend mail failed', [
                'entry' => $entry->public_id,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Mail could not be sent. Check SMTP settings.'], 422);
        }

        return response()->json(['data' => ['sent' => true]]);
    }

    /** GET /waitlist/export — CSV of exactly the current filter set. */
    public function export(Request $request): StreamedResponse
    {
        $filename = 'waitlist-'.now()->format('Y-m-d').'.csv';
        $query = $this->filtered($request)->orderBy('position');

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'id', 'name', 'email', 'phone', 'city', 'state', 'role', 'status',
                'verified', 'referral_code', 'referrals', 'position', 'source',
                'device', 'browser', 'utm_source', 'utm_medium', 'utm_campaign', 'joined_at',
            ]);
            $query->chunk(500, function ($rows) use ($out) {
                foreach ($rows as $r) {
                    fputcsv($out, [
                        $r->public_id, $r->name, $r->email, $r->phone, $r->city, $r->state,
                        $r->role, $r->status, $r->verified ? 'yes' : 'no', $r->referral_code,
                        $r->referrals, $r->position, $r->source, $r->device, $r->browser,
                        $r->utm_source, $r->utm_medium, $r->utm_campaign,
                        optional($r->created_at)->toDateTimeString(),
                    ]);
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
