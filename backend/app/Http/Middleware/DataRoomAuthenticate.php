<?php

namespace App\Http\Middleware;

use App\Models\DataRoomAuditLog;
use App\Models\DataRoomSession;
use App\Services\DataRoom\DataRoomPolicyResolver;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * The data room security boundary.
 *
 * This is a separate guard from Sanctum on purpose. A data room bearer token
 * grants nothing outside these routes, and an authenticated admin session
 * grants nothing here. The two authentication domains share no session store,
 * no cookie, and no token namespace, so neither can escalate into the other.
 *
 * Every request re-validates from the database: the room is open, the session
 * exists, neither clock has run out, and the grant behind it is still active.
 * Nothing is cached, so a revocation takes effect on the visitor's next click
 * rather than at the end of some TTL.
 */
class DataRoomAuthenticate
{
    public function __construct(private readonly DataRoomPolicyResolver $policy) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->policy->isOpen()) {
            return $this->deny($this->policy->closedMessage(), 403);
        }

        $token = $this->bearerToken($request);

        if ($token === null) {
            return $this->deny('Your data room session has ended. Please sign in again.', 401);
        }

        // Constant-length lookup key. The raw token is never stored or logged.
        $session = DataRoomSession::with('accessGrant')
            ->where('token_hash', hash('sha256', $token))
            ->first();

        if (! $session || ! $session->accessGrant) {
            return $this->deny('Your data room session has ended. Please sign in again.', 401);
        }

        if ($session->isExpired()) {
            $grant = $session->accessGrant;
            $session->delete();
            DataRoomAuditLog::record($grant, null, 'session_expired', null, null, $request);

            return $this->deny('Your data room session has ended. Please sign in again.', 401);
        }

        $grant = $session->accessGrant;

        // effectiveStatus() derives expiry and usage limits from the clock, so
        // an expired grant stops working without any scheduled job running.
        if (! $grant->isActive()) {
            $session->delete();
            DataRoomAuditLog::record($grant, null, 'access_denied', null, 'grant no longer active: '.$grant->effectiveStatus(), $request);

            return $this->deny('Your data room access is no longer active. Please contact your MyTijaara contact.', 403);
        }

        $session->touchActivity($this->policy->idleTimeoutMinutes());

        $request->attributes->set('dataroom_grant', $grant);
        $request->attributes->set('dataroom_session', $session);

        $response = $next($request);

        // Keep every data room response out of caches and indexes, including
        // JSON, so an intermediary cannot retain document metadata.
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        $response->headers->set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
        $response->headers->set('Pragma', 'no-cache');

        return $response;
    }

    private function bearerToken(Request $request): ?string
    {
        $header = (string) $request->header('Authorization', '');

        if (! Str::startsWith($header, 'Bearer ')) {
            return null;
        }

        $token = trim(Str::substr($header, 7));

        return $token === '' ? null : $token;
    }

    private function deny(string $message, int $status): Response
    {
        return response()->json(['message' => $message], $status)
            ->header('X-Robots-Tag', 'noindex, nofollow, noarchive')
            ->header('Cache-Control', 'private, no-store, max-age=0');
    }
}
