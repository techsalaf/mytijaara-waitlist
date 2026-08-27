<?php

namespace App\Http\Controllers\Api\DataRoom;

use App\Http\Controllers\Controller;
use App\Models\DataRoomAccessGrant;
use App\Models\DataRoomAuditLog;
use App\Models\DataRoomSession;
use App\Services\DataRoom\AccessCodeGenerator;
use App\Services\DataRoom\DataRoomAuthorizer;
use App\Services\DataRoom\DataRoomPolicyResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * Visitor authentication for the data room.
 *
 * Independent of the admin guard by design: there is no path from an admin
 * session to a data room session, or from a waitlist record to either. A
 * visitor is only ever identified by an access grant an administrator issued
 * explicitly.
 *
 * Every failure answers with the same message and the same status. The endpoint
 * does not distinguish "no such email", "wrong code", "expired", "revoked", or
 * "usage exhausted" to the caller, because doing so would let an attacker
 * enumerate which addresses hold grants. The real reason goes to the audit log.
 */
class DataRoomVisitorAuthController extends Controller
{
    /**
     * The single answer to every authentication failure. Wrong email, wrong
     * code, expired, revoked, suspended and exhausted all produce this string
     * and the same 401, so the response body cannot be used to classify an
     * address. The real reason is written to the audit log instead.
     */
    private const GENERIC_FAILURE = 'We could not verify those details. Please check the email address and access code you were sent.';

    public function __construct(
        private readonly DataRoomPolicyResolver $policy,
        private readonly DataRoomAuthorizer $authorizer,
        private readonly AccessCodeGenerator $codes,
    ) {}

    /** GET /api/dataroom/gate — what the access screen needs before it renders. */
    public function gate(): JsonResponse
    {
        // Reveals only whether a PIN field should be shown. It does not reveal
        // the PIN, the number of grants, or anything about the room's contents.
        return response()->json([
            'data' => [
                'open' => $this->policy->isOpen(),
                'pinRequired' => $this->policy->pinRequired(),
                'message' => $this->policy->isOpen() ? null : $this->policy->closedMessage(),
            ],
        ]);
    }

    /** POST /api/dataroom/authenticate — email + access code, optional global PIN. */
    public function authenticate(Request $request): JsonResponse
    {
        if (! $this->policy->isOpen()) {
            return $this->fail($this->policy->closedMessage(), 403);
        }

        // Trim before validating, not after. An investor who copies their email
        // out of the invitation lands a trailing space in the field often
        // enough that a 422 there reads as "the credentials are wrong".
        if (is_string($request->input('email'))) {
            $request->merge(['email' => trim($request->input('email'))]);
        }

        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'code' => ['required', 'string', 'max:64'],
            'pin' => ['nullable', 'string', 'max:64'],
        ]);

        $email = strtolower($data['email']);
        $code = $this->codes->normalize($data['code']);

        // Throttle on IP and on the submitted address separately, so one
        // attacker cannot spread guesses across addresses to stay under the IP
        // limit, and a distributed attack still cannot hammer one grant.
        $keys = [
            'dataroom:auth:ip:'.$request->ip(),
            'dataroom:auth:email:'.sha1($email),
        ];

        foreach ($keys as $key) {
            if (RateLimiter::tooManyAttempts($key, $this->policy->maxFailedAttempts())) {
                DataRoomAuditLog::record(null, null, 'authentication_failed', null, 'rate limited', $request);

                return $this->fail(
                    'Too many attempts. For security, access has been paused temporarily. Please try again later.',
                    429,
                    ['retryAfter' => RateLimiter::availableIn($key)],
                );
            }
        }

        if (! $this->policy->pinMatches($data['pin'] ?? null)) {
            $this->penalize($keys);
            DataRoomAuditLog::record(null, null, 'authentication_failed', null, 'global pin mismatch', $request);

            return $this->fail(self::GENERIC_FAILURE, 401);
        }

        // One address can hold more than one grant over time (a superseded
        // grant plus its replacement), so the code decides which one this is.
        // Newest first, so a reissued code wins over the one it replaced.
        $candidates = DataRoomAccessGrant::where('visitor_email', $email)
            ->orderByDesc('id')
            ->limit(10)
            ->get();

        $grant = null;

        foreach ($candidates as $candidate) {
            if (Hash::check($code, $candidate->access_code_hash)) {
                $grant = $candidate;
                break;
            }
        }

        // Always run at least one bcrypt round, hit or miss, so the response
        // time carries no information about whether the address exists.
        if ($candidates->isEmpty()) {
            Hash::make($code);
        }

        if (! $grant) {
            $this->penalize($keys);
            DataRoomAuditLog::record(null, null, 'authentication_failed', null, $candidates->isEmpty() ? 'unknown email' : 'code mismatch', $request);

            return $this->fail(self::GENERIC_FAILURE, 401);
        }

        if (! $grant->isActive()) {
            $this->penalize($keys);
            DataRoomAuditLog::record($grant, null, 'authentication_failed_inactive', $grant, 'status: '.$grant->effectiveStatus(), $request);

            // Same generic message. A revoked investor learns their access no
            // longer works from their MyTijaara contact, not from a probe.
            return $this->fail(self::GENERIC_FAILURE, 401);
        }

        foreach ($keys as $key) {
            RateLimiter::clear($key);
        }

        $grant->increment('current_uses');
        $grant->forceFill(['last_accessed_at' => now()])->save();

        $rawToken = Str::random(64);
        $idle = $this->policy->idleTimeoutMinutes();
        $absolute = $this->policy->absoluteTtlMinutes();

        $session = DataRoomSession::create([
            'access_grant_id' => $grant->id,
            // Only the digest is persisted. The raw token exists in this
            // response and in the visitor's browser, nowhere else.
            'token_hash' => hash('sha256', $rawToken),
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
            'expires_at' => now()->addMinutes($idle),
            'absolute_expires_at' => now()->addMinutes($absolute),
            'last_active_at' => now(),
        ]);

        DataRoomAuditLog::record($grant, null, 'authenticated', $grant, null, $request);

        return response()->json([
            'data' => [
                'token' => $rawToken,
                'session' => [
                    'idleExpiresAt' => $session->expires_at->toIso8601String(),
                    'absoluteExpiresAt' => $session->absolute_expires_at->toIso8601String(),
                    'idleTimeoutMinutes' => $idle,
                ],
                'visitor' => $this->visitorPayload($grant),
            ],
        ])->header('Cache-Control', 'private, no-store, max-age=0');
    }

    /** GET /api/dataroom/me — the current visitor, re-derived server-side. */
    public function me(Request $request): JsonResponse
    {
        /** @var DataRoomAccessGrant $grant */
        $grant = $request->attributes->get('dataroom_grant');
        /** @var DataRoomSession $session */
        $session = $request->attributes->get('dataroom_session');

        return response()->json([
            'data' => $this->visitorPayload($grant) + [
                'session' => [
                    'idleExpiresAt' => $session->expires_at->toIso8601String(),
                    'absoluteExpiresAt' => $session->absolute_expires_at->toIso8601String(),
                    'idleTimeoutMinutes' => $this->policy->idleTimeoutMinutes(),
                ],
            ],
        ]);
    }

    /** POST /api/dataroom/logout — destroy this session only. */
    public function logout(Request $request): JsonResponse
    {
        $header = (string) $request->header('Authorization', '');

        if (Str::startsWith($header, 'Bearer ')) {
            $session = DataRoomSession::with('accessGrant')
                ->where('token_hash', hash('sha256', trim(Str::substr($header, 7))))
                ->first();

            if ($session) {
                DataRoomAuditLog::record($session->accessGrant, null, 'logout', null, null, $request);
                $session->delete();
            }
        }

        // Always 200, whether or not a session was found. A caller cannot use
        // logout to test whether a token is valid.
        return response()->json(['data' => ['success' => true]]);
    }

    // -- internals ---------------------------------------------------------

    /** @return array<string,mixed> */
    private function visitorPayload(DataRoomAccessGrant $grant): array
    {
        $counts = $this->authorizer->counts($grant);

        return [
            'name' => $grant->visitor_name,
            'email' => $grant->visitor_email,
            'organization' => $grant->organization,
            'role' => $grant->role_title,
            'startsAt' => $grant->starts_at?->toIso8601String(),
            'expiresAt' => $grant->expires_at?->toIso8601String(),
            'acknowledgedAt' => $grant->acknowledged_at?->toIso8601String(),
            // Advisory only. Every download is re-checked server-side against
            // the four gates in DataRoomAuthorizer::canDownload().
            'downloadsPermitted' => (bool) $grant->downloads_permitted && $this->policy->downloadsEnabled(),
            'accessibleDocumentsCount' => $counts['accessible'],
            'watermarked' => $this->policy->watermarkEnabled(),
        ];
    }

    /** @param  list<string>  $keys */
    private function penalize(array $keys): void
    {
        foreach ($keys as $key) {
            RateLimiter::hit($key, $this->policy->lockoutSeconds());
        }
    }

    /** @param  array<string,mixed>  $extra */
    private function fail(string $message, int $status, array $extra = []): JsonResponse
    {
        return response()->json(['message' => $message] + $extra, $status)
            ->header('Cache-Control', 'private, no-store, max-age=0');
    }
}
