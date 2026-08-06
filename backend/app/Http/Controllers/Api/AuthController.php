<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\User;
use App\Support\Audit;
use App\Support\TwoFactor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        Password::sendResetLink(['email' => $data['email']]);

        return response()->json(['data' => ['success' => true]]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset($data, function (User $user, string $password): void {
            $user->forceFill(['password' => Hash::make($password), 'remember_token' => str()->random(60)])->save();
            $user->tokens()->delete();
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }

        return response()->json(['data' => ['success' => true]]);
    }

    /** POST /auth/login — IP rate-limited, returns Sanctum token + AdminUser. */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'code' => ['nullable', 'string', 'max:64'],
        ]);

        $key = 'login:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => ["Too many login attempts. Try again in {$seconds}s."],
            ])->status(429);
        }

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if (($user->status ?? 'active') !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['This account is not active.'],
            ]);
        }

        // Second factor, if the account confirmed one. The password is already
        // proven correct here, so a missing code is a challenge, not a failure.
        if ($user->hasTwoFactorEnabled()) {
            $code = trim((string) ($data['code'] ?? ''));

            if ($code === '') {
                return response()->json([
                    'data' => [
                        'twoFactorRequired' => true,
                        'message' => 'Enter the 6-digit code from your authenticator app.',
                    ],
                ], 202);
            }

            if (! TwoFactor::verifyChallenge($user, $code)) {
                RateLimiter::hit($key, 60);
                throw ValidationException::withMessages([
                    'code' => ['That code is not valid or has already been used.'],
                ]);
            }
        }

        RateLimiter::clear($key);

        $user->forceFill(['last_active_at' => now()])->save();
        $user->load('roles');

        $token = $this->issueToken($user, $request);

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => new AdminUserResource($user),
            ],
        ]);
    }

    /** GET /auth/me — the authenticated admin, with permissions and profile. */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles', 'permissions');

        return response()->json(['data' => new AuthenticatedUserResource($user)]);
    }

    /**
     * PATCH /auth/me — the Profile tab.
     *
     * Writes go straight to the row and the fresh record comes back, so the
     * page never shows a success toast over an unsaved form.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:120'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'timezone' => ['sometimes', 'nullable', 'string', 'max:64'],
            'location' => ['sometimes', 'nullable', 'string', 'max:120'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'avatarUrl' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'preferences' => ['sometimes', 'array'],
            'preferences.*' => ['boolean'],
        ]);

        $patch = [];
        foreach (['name', 'email', 'phone', 'timezone', 'location', 'bio'] as $field) {
            if (array_key_exists($field, $data)) {
                $patch[$field] = $data[$field];
            }
        }
        if (array_key_exists('avatarUrl', $data)) {
            $patch['avatar_url'] = $data['avatarUrl'];
        }
        if (array_key_exists('preferences', $data)) {
            // Merge over what is stored and drop unknown keys, so a stale client
            // cannot write junk into the JSON column.
            $patch['preferences'] = array_merge(
                $user->resolvedPreferences(),
                array_map(
                    static fn ($v) => filter_var($v, FILTER_VALIDATE_BOOLEAN),
                    array_intersect_key($data['preferences'], User::PREFERENCE_DEFAULTS),
                ),
            );
        }

        // Changing the email invalidates a prior verification.
        if (array_key_exists('email', $patch) && $patch['email'] !== $user->email) {
            $patch['email_verified_at'] = null;
        }

        if ($patch !== []) {
            $user->forceFill($patch)->save();
            Audit::record($request, 'profile.updated', $user->email, array_keys($patch));
        }

        return response()->json([
            'data' => new AuthenticatedUserResource($user->fresh()->load('roles', 'permissions')),
        ]);
    }

    /**
     * POST /auth/password — change your own password.
     *
     * Every other token is revoked on success, so a stolen session cannot
     * outlive the password it was obtained under. The current token is kept
     * alive so the admin is not logged out of the tab they are working in.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'different:current_password'],
        ]);

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['That is not your current password.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($data['password']),
            'remember_token' => str()->random(60),
        ])->save();

        $currentId = $this->currentTokenId($request);
        $user->tokens()->when($currentId, fn ($q) => $q->where('id', '!=', $currentId))->delete();

        Audit::record($request, 'profile.password-changed', $user->email);

        return response()->json(['data' => ['success' => true]]);
    }

    /**
     * GET /auth/sessions — real Sanctum tokens for this account.
     *
     * `ip` and `user_agent` are recorded at issue time; Sanctum only tracks
     * `last_used_at`, and "sign out of devices you don't recognise" needs more
     * than a timestamp to be actionable.
     */
    public function sessions(Request $request): JsonResponse
    {
        $currentId = $this->currentTokenId($request);

        $sessions = $request->user()->tokens()
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($token) => [
                'id' => (string) $token->id,
                'name' => $token->name,
                'device' => $this->describeDevice($token->user_agent),
                'ip' => $token->ip,
                'current' => (string) $token->id === (string) $currentId,
                'createdAt' => optional($token->created_at)->toIso8601String(),
                'lastUsedAt' => optional($token->last_used_at)->toIso8601String(),
            ])
            ->values()
            ->all();

        return response()->json(['data' => $sessions]);
    }

    /** DELETE /auth/sessions/:id — revoke one token. */
    public function revokeSession(Request $request, string $id): JsonResponse
    {
        $currentId = (string) $this->currentTokenId($request);

        if ($id === $currentId) {
            return response()->json([
                'message' => 'That is the session you are using. Sign out instead.',
            ], 422);
        }

        $deleted = $request->user()->tokens()->where('id', $id)->delete();
        abort_unless($deleted > 0, 404, 'Session not found.');

        Audit::record($request, 'profile.session-revoked', "token:{$id}");

        return response()->json(['data' => ['revoked' => $id]]);
    }

    /** POST /auth/sessions/revoke-others — sign out everywhere else. */
    public function revokeOtherSessions(Request $request): JsonResponse
    {
        $currentId = $this->currentTokenId($request);

        $count = $request->user()->tokens()
            ->when($currentId, fn ($q) => $q->where('id', '!=', $currentId))
            ->delete();

        Audit::record($request, 'profile.sessions-revoked', "count:{$count}");

        return response()->json(['data' => ['revoked' => $count]]);
    }

    /**
     * POST /auth/two-factor — start enrolment.
     *
     * Returns the secret, an inline QR and the one-time recovery codes. 2FA is
     * not active until `confirmTwoFactor()` sees a valid code, so an admin
     * cannot lock themselves out with a secret their app never scanned.
     */
    public function startTwoFactor(Request $request): JsonResponse
    {
        $setup = TwoFactor::begin($request->user());
        Audit::record($request, 'profile.2fa-started', $request->user()->email);

        return response()->json(['data' => $setup]);
    }

    /** POST /auth/two-factor/confirm — finish enrolment with a real code. */
    public function confirmTwoFactor(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:16']]);

        if (! TwoFactor::confirm($request->user(), $data['code'])) {
            throw ValidationException::withMessages([
                'code' => ['That code did not match. Check your authenticator and try again.'],
            ]);
        }

        Audit::record($request, 'profile.2fa-enabled', $request->user()->email);

        return response()->json([
            'data' => new AuthenticatedUserResource($request->user()->fresh()->load('roles', 'permissions')),
        ]);
    }

    /** DELETE /auth/two-factor — turn it off. Password required. */
    public function disableTwoFactor(Request $request): JsonResponse
    {
        $data = $request->validate(['password' => ['required', 'string']]);

        if (! Hash::check($data['password'], $request->user()->password)) {
            throw ValidationException::withMessages([
                'password' => ['That password is not correct.'],
            ]);
        }

        TwoFactor::disable($request->user());
        Audit::record($request, 'profile.2fa-disabled', $request->user()->email);

        return response()->json([
            'data' => new AuthenticatedUserResource($request->user()->fresh()->load('roles', 'permissions')),
        ]);
    }

    /** POST /auth/two-factor/recovery-codes — reissue the single-use codes. */
    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasTwoFactorEnabled(), 422, 'Two-factor authentication is not enabled.');

        $codes = TwoFactor::regenerateRecoveryCodes($request->user());
        Audit::record($request, 'profile.2fa-recovery-codes-reissued', $request->user()->email);

        return response()->json(['data' => ['recoveryCodes' => $codes]]);
    }

    /** POST /auth/logout — revoke the current token. */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['data' => ['success' => true]]);
    }

    /**
     * Id of the token this request authenticated with, or null.
     *
     * Sanctum hands back a `TransientToken` for session-guard requests (and in
     * tests via `Sanctum::actingAs`), which has no id. Reading `->id` off it
     * would be an undefined-property access, so the type is checked first.
     */
    private function currentTokenId(Request $request): ?string
    {
        $token = $request->user()?->currentAccessToken();

        return $token instanceof PersonalAccessToken ? (string) $token->getKey() : null;
    }

    /** Issue a token and stamp it with where it came from. */
    private function issueToken(User $user, Request $request): string
    {
        $token = $user->createToken('admin-panel');

        $token->accessToken->forceFill([
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 512),
        ])->save();

        return $token->plainTextToken;
    }

    /** Readable device label from a user agent string. */
    private function describeDevice(?string $agent): string
    {
        $agent = (string) $agent;
        if ($agent === '') {
            return 'Unknown device';
        }

        $browser = match (true) {
            str_contains($agent, 'Edg/') => 'Edge',
            str_contains($agent, 'OPR/') || str_contains($agent, 'Opera') => 'Opera',
            str_contains($agent, 'Firefox') => 'Firefox',
            str_contains($agent, 'Chrome') => 'Chrome',
            str_contains($agent, 'Safari') => 'Safari',
            default => 'Browser',
        };

        $platform = match (true) {
            str_contains($agent, 'iPhone') => 'iPhone',
            str_contains($agent, 'iPad') => 'iPad',
            str_contains($agent, 'Android') => 'Android',
            str_contains($agent, 'Windows') => 'Windows',
            str_contains($agent, 'Mac OS') => 'macOS',
            str_contains($agent, 'Linux') => 'Linux',
            default => 'Unknown OS',
        };

        return "{$platform} · {$browser}";
    }
}
