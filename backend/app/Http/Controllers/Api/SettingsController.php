<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Setting;
use App\Support\SmtpConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Settings are stored one JSON row per group in `settings`.
 *
 * Two rules make this safe:
 *  1. Every group has an explicit validation map. An unknown key is rejected
 *     rather than merged, so the row cannot accumulate junk.
 *  2. Secrets are redacted on read. A redacted value posted back is dropped in
 *     `stripRedacted()` instead of overwriting the real secret with bullets.
 */
class SettingsController extends Controller
{
    private const GROUPS = ['company', 'branding', 'seo', 'social', 'smtp', 'integrations', 'api_keys', 'system'];

    /** Placeholder the client sees instead of a stored secret. */
    private const REDACTED = '••••••••';

    /** GET /settings/:group */
    public function show(string $group): JsonResponse
    {
        abort_unless(in_array($group, self::GROUPS, true), 404);

        $row = Setting::firstOrCreate(['group' => $group], ['data' => []]);
        $data = $this->withDefaults($group, is_array($row->data) ? $row->data : []);

        return response()->json([
            'data' => $this->redact($group, $data),
            'meta' => ['updated_at' => optional($row->updated_at)->toIso8601String()],
        ]);
    }

    /** PATCH /settings/:group — validated merge into the group. */
    public function update(Request $request, string $group): JsonResponse
    {
        abort_unless(in_array($group, self::GROUPS, true), 404);
        // api_keys is managed only through generate/revoke, never a blind merge.
        abort_if($group === 'api_keys', 422, 'Use /settings/api-keys to manage API keys.');

        $validated = $request->validate($this->rules($group));
        $patch = $this->stripRedacted($this->normalize($validated));

        $row = Setting::firstOrCreate(['group' => $group], ['data' => []]);
        $row->data = array_merge(is_array($row->data) ? $row->data : [], $patch);
        $row->updated_by = $request->user()?->id;
        $row->save();

        $this->audit($request, "settings.{$group}.update", array_keys($patch));

        return response()->json([
            'data' => $this->redact($group, $this->withDefaults($group, $row->data)),
            'meta' => ['updated_at' => optional($row->updated_at)->toIso8601String()],
        ]);
    }

    /**
     * POST /settings/smtp/test — open a real SMTP connection.
     *
     * Accepts an optional inline override so credentials can be tested before
     * saving. A redacted or blank password falls back to the stored one.
     */
    public function testSmtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'encryption' => ['nullable', Rule::in(['tls', 'ssl', 'none'])],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
        ]);

        $override = array_filter(
            $this->stripRedacted($this->normalize($data)),
            fn ($v) => $v !== null && $v !== '',
        );

        $result = SmtpConfig::test($override ?: null);
        $this->audit($request, 'settings.smtp.test', ['ok' => $result['ok']]);

        return response()->json(['data' => $result], $result['ok'] ? 200 : 422);
    }

    /**
     * POST /settings/cache/purge — flush the application cache for real.
     *
     * Reports the driver and the entry count it saw beforehand, so the page can
     * say what was actually cleared instead of a bare success toast. A driver
     * that cannot be counted reports null rather than a made-up number.
     */
    public function purgeCache(Request $request): JsonResponse
    {
        $store = config('cache.default');
        $before = $this->cacheEntryCount();

        try {
            Cache::store($store)->flush();
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'The cache store refused the flush: '.$e->getMessage(),
            ], 422);
        }

        $this->audit($request, 'settings.cache.purge', ['store' => $store, 'entries' => $before]);

        return response()->json([
            'data' => [
                'store' => $store,
                'entriesCleared' => $before,
                'purgedAt' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Rows in the cache table, or null when the driver cannot be counted.
     *
     * Only the database driver keeps an enumerable store here; redis and file
     * would need a scan that is not worth the cost on a settings page.
     */
    private function cacheEntryCount(): ?int
    {
        if (config('cache.default') !== 'database') {
            return null;
        }

        try {
            return (int) DB::table(config('cache.stores.database.table', 'cache'))->count();
        } catch (\Throwable) {
            return null;
        }
    }

    /** GET /settings/api-keys — masked keys, newest first. */
    public function listApiKeys(): JsonResponse
    {
        $keys = $this->storedKeys();
        $out = array_map(fn ($k) => $this->publicKey($k), $keys);
        usort($out, fn ($a, $b) => strcmp((string) $b['createdAt'], (string) $a['createdAt']));

        return response()->json(['data' => $out]);
    }

    /**
     * POST /settings/api-keys — generate a key.
     *
     * The plaintext key is returned exactly once. Only a SHA-256 hash and the
     * last four characters are stored, so a leaked settings row cannot be
     * replayed against the API.
     */
    public function generateApiKey(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'scopes' => ['nullable', 'array'],
            'scopes.*' => ['string', 'max:64'],
        ]);

        $plain = 'mtj_'.Str::random(40);

        $record = [
            'id' => (string) Str::uuid(),
            'name' => $data['name'],
            'hash' => hash('sha256', $plain),
            'last4' => substr($plain, -4),
            'prefix' => 'mtj_',
            'scopes' => $data['scopes'] ?? ['read'],
            'created_at' => now()->toIso8601String(),
            'created_by' => $request->user()?->name,
            'last_used_at' => null,
            'revoked_at' => null,
        ];

        $keys = $this->storedKeys();
        $keys[] = $record;
        $this->saveKeys($keys, $request);

        $this->audit($request, 'settings.api-key.create', ['name' => $data['name']]);

        return response()->json([
            'data' => [
                // Shown once. No endpoint can return it again.
                'key' => $plain,
                'record' => $this->publicKey($record),
            ],
        ], 201);
    }

    /** DELETE /settings/api-keys/:id — revoke, keeping the row for the audit trail. */
    public function revokeApiKey(Request $request, string $id): JsonResponse
    {
        $keys = $this->storedKeys();

        $found = false;
        foreach ($keys as &$key) {
            if (($key['id'] ?? null) === $id && empty($key['revoked_at'])) {
                $key['revoked_at'] = now()->toIso8601String();
                $found = true;
                break;
            }
        }
        unset($key);

        abort_unless($found, 404, 'API key not found or already revoked.');

        $this->saveKeys($keys, $request);
        $this->audit($request, 'settings.api-key.revoke', ['id' => $id]);

        return response()->json(['data' => ['revoked' => $id]]);
    }

    /** @return array<int,array<string,mixed>> */
    private function storedKeys(): array
    {
        $row = Setting::firstOrCreate(['group' => 'api_keys'], ['data' => []]);
        $keys = $row->data['keys'] ?? null;

        return is_array($keys) ? array_values($keys) : [];
    }

    /** @param array<int,array<string,mixed>> $keys */
    private function saveKeys(array $keys, Request $request): void
    {
        $row = Setting::firstOrCreate(['group' => 'api_keys'], ['data' => []]);
        $row->data = array_merge(is_array($row->data) ? $row->data : [], ['keys' => $keys]);
        $row->updated_by = $request->user()?->id;
        $row->save();
    }

    /**
     * Client-safe view of a stored key. The hash never leaves the server.
     *
     * @param  array<string,mixed>  $k
     * @return array<string,mixed>
     */
    private function publicKey(array $k): array
    {
        return [
            'id' => $k['id'] ?? '',
            'name' => $k['name'] ?? '',
            'masked' => ($k['prefix'] ?? 'mtj_').str_repeat('•', 8).($k['last4'] ?? ''),
            'scopes' => $k['scopes'] ?? [],
            'createdAt' => $k['created_at'] ?? null,
            'createdBy' => $k['created_by'] ?? null,
            'lastUsedAt' => $k['last_used_at'] ?? null,
            'revokedAt' => $k['revoked_at'] ?? null,
            'active' => empty($k['revoked_at']),
        ];
    }

    /**
     * Per-group validation. Anything not listed here is discarded.
     *
     * @return array<string,array<int,mixed>>
     */
    private function rules(string $group): array
    {
        return match ($group) {
            'company' => [
                'siteName' => ['sometimes', 'string', 'max:120'],
                'tagline' => ['sometimes', 'nullable', 'string', 'max:255'],
                'contactEmail' => ['sometimes', 'nullable', 'email', 'max:255'],
                'supportEmail' => ['sometimes', 'nullable', 'email', 'max:255'],
                'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
                'launchCity' => ['sometimes', 'nullable', 'string', 'max:120'],
                'address' => ['sometimes', 'nullable', 'string', 'max:500'],
                'timezone' => ['sometimes', 'string', 'max:64'],
            ],
            'branding' => [
                'logoUrl' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'logoDarkUrl' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'faviconUrl' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'ogImageUrl' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'primaryColor' => ['sometimes', 'nullable', 'string', 'max:32'],
                'accentColor' => ['sometimes', 'nullable', 'string', 'max:32'],
            ],
            'seo' => [
                'metaTitle' => ['sometimes', 'nullable', 'string', 'max:255'],
                'metaDescription' => ['sometimes', 'nullable', 'string', 'max:500'],
                'ogImage' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'keywords' => ['sometimes', 'nullable', 'string', 'max:500'],
                'canonicalUrl' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'twitterHandle' => ['sometimes', 'nullable', 'string', 'max:64'],
                'noindex' => ['sometimes', 'boolean'],
            ],
            'social' => [
                'twitter' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'instagram' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'facebook' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'linkedin' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'tiktok' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'youtube' => ['sometimes', 'nullable', 'string', 'max:2048'],
                'whatsapp' => ['sometimes', 'nullable', 'string', 'max:2048'],
            ],
            'smtp' => [
                'enabled' => ['sometimes', 'boolean'],
                'host' => ['sometimes', 'nullable', 'string', 'max:255'],
                'port' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:65535'],
                'encryption' => ['sometimes', Rule::in(['tls', 'ssl', 'none'])],
                'username' => ['sometimes', 'nullable', 'string', 'max:255'],
                'password' => ['sometimes', 'nullable', 'string', 'max:255'],
                'fromAddress' => ['sometimes', 'nullable', 'email', 'max:255'],
                'fromName' => ['sometimes', 'nullable', 'string', 'max:120'],
            ],
            'integrations' => [
                'resendApiKey' => ['sometimes', 'nullable', 'string', 'max:255'],
                'googleAnalyticsId' => ['sometimes', 'nullable', 'string', 'max:64'],
                'metaPixelId' => ['sometimes', 'nullable', 'string', 'max:64'],
                'slackWebhookUrl' => ['sometimes', 'nullable', 'string', 'max:2048'],
            ],
            'system' => [
                'maintenanceMode' => ['sometimes', 'boolean'],
                'signupsPaused' => ['sometimes', 'boolean'],
                'signupRateLimitPerHour' => ['sometimes', 'integer', 'min:1', 'max:1000'],
                'weeklyDigestEnabled' => ['sometimes', 'boolean'],
                'weeklyDigestDay' => ['sometimes', Rule::in(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])],
                'weeklyDigestRecipients' => ['sometimes', 'array'],
                'weeklyDigestRecipients.*' => ['email'],
                'notifyOnSignup' => ['sometimes', 'boolean'],
            ],
            default => [],
        };
    }

    /**
     * Defaults so the admin form never renders `undefined` for a group that has
     * never been saved.
     *
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     */
    private function withDefaults(string $group, array $data): array
    {
        $defaults = match ($group) {
            'company' => [
                'siteName' => 'MyTijaara',
                'tagline' => 'One app for food, shopping, deliveries and trusted services.',
                'contactEmail' => '',
                'supportEmail' => '',
                'phone' => '',
                'launchCity' => 'Ibadan',
                'address' => '',
                'timezone' => 'Africa/Lagos',
            ],
            'branding' => [
                'logoUrl' => '',
                'logoDarkUrl' => '',
                'faviconUrl' => '',
                'ogImageUrl' => '',
                'primaryColor' => '#1f5c3a',
                'accentColor' => '#c9a24c',
            ],
            'seo' => [
                'metaTitle' => '',
                'metaDescription' => '',
                'ogImage' => '',
                'keywords' => '',
                'canonicalUrl' => '',
                'twitterHandle' => '',
                'noindex' => false,
            ],
            'social' => [
                'twitter' => '', 'instagram' => '', 'facebook' => '',
                'linkedin' => '', 'tiktok' => '', 'youtube' => '', 'whatsapp' => '',
            ],
            'smtp' => [
                'enabled' => false,
                'host' => '',
                'port' => 587,
                'encryption' => 'tls',
                'username' => '',
                'password' => '',
                'fromAddress' => '',
                'fromName' => 'MyTijaara',
            ],
            'integrations' => [
                'resendApiKey' => '', 'googleAnalyticsId' => '',
                'metaPixelId' => '', 'slackWebhookUrl' => '',
            ],
            'system' => [
                'maintenanceMode' => false,
                'signupsPaused' => false,
                'signupRateLimitPerHour' => 10,
                'weeklyDigestEnabled' => false,
                'weeklyDigestDay' => 'mon',
                'weeklyDigestRecipients' => [],
                'notifyOnSignup' => true,
            ],
            'api_keys' => ['keys' => []],
            default => [],
        };

        return array_merge($defaults, $data);
    }

    /**
     * Coerce types the JSON column would otherwise store as strings.
     *
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     */
    private function normalize(array $data): array
    {
        foreach (['enabled', 'noindex', 'maintenanceMode', 'signupsPaused', 'weeklyDigestEnabled', 'notifyOnSignup'] as $bool) {
            if (array_key_exists($bool, $data)) {
                $data[$bool] = filter_var($data[$bool], FILTER_VALIDATE_BOOLEAN);
            }
        }
        foreach (['port', 'signupRateLimitPerHour'] as $int) {
            if (array_key_exists($int, $data) && $data[$int] !== null) {
                $data[$int] = (int) $data[$int];
            }
        }

        return $data;
    }

    /**
     * Drop any field whose value is the redaction placeholder we sent out, so a
     * round-tripped form cannot destroy a stored secret.
     *
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     */
    private function stripRedacted(array $data): array
    {
        return array_filter(
            $data,
            fn ($value) => ! (is_string($value) && ($value === self::REDACTED || str_starts_with($value, '••••'))),
        );
    }

    /**
     * Never send raw secrets back to the client.
     *
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     */
    private function redact(string $group, array $data): array
    {
        if ($group === 'integrations' && ! empty($data['resendApiKey'])) {
            $data['resendApiKey'] = $this->mask((string) $data['resendApiKey']);
        }
        if ($group === 'smtp') {
            // Report whether a password exists without revealing its length.
            $data['passwordSet'] = ! empty($data['password']);
            $data['password'] = $data['passwordSet'] ? self::REDACTED : '';
        }
        if ($group === 'api_keys') {
            $keys = is_array($data['keys'] ?? null) ? $data['keys'] : [];
            $data['keys'] = array_map(fn ($k) => $this->publicKey($k), $keys);
        }

        return $data;
    }

    private function mask(string $value): string
    {
        return strlen($value) <= 4 ? '••••' : str_repeat('•', 8).substr($value, -4);
    }

    /** @param array<string,mixed>|array<int,string> $changes */
    private function audit(Request $request, string $action, array $changes): void
    {
        try {
            AuditLog::create([
                'user_id' => $request->user()?->id,
                'actor' => $request->user()?->name,
                'action' => $action,
                'target' => 'settings',
                'changes' => $changes,
                'ip' => $request->ip(),
                'device' => substr((string) $request->userAgent(), 0, 255),
            ]);
        } catch (\Throwable) {
            // Auditing must never block the write it is recording.
        }
    }
}
