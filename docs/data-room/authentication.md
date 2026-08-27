# Authentication model

## The identity a visitor has

A data room visitor is an **access grant**, not a user account. There is no
`users` row, no password, no registration and no self-service. An administrator
issues a grant against an email address; that grant is the whole identity.

Consequences worth being explicit about:

- Nothing a visitor does can create, escalate or extend their own identity.
- Deleting the grant deletes the visitor. There is no orphaned account left over.
- The same email may hold several grants over time. The submitted code decides
  which one is in play, newest first, so a reissued code supersedes the one it
  replaced without the old grant needing to be deleted.

## Two credentials, one of them shared

| Credential | Scope | Storage |
| --- | --- | --- |
| Access code, e.g. `MTJ-8F4K-92QX` | one grant | bcrypt hash + last 4 chars as `code_hint` |
| Global room PIN (optional) | whole room | bcrypt hash, env or settings row |

The PIN is a barrier, not a factor: everyone who is let in shares it, so it
proves nothing about who is knocking. It exists so the room can be shut behind one
value during a sensitive window. The access code is the actual authentication.

`DataRoomPolicyResolver::pinRequired()` returns true only when a hash actually
exists. A switch turned on with no hash configured would be an open door, so the
switch alone is not enough.

The environment value wins over the settings row:

```php
$fromEnv = config('dataroom.master_pin_hash');
if (is_string($fromEnv) && $fromEnv !== '') {
    return $fromEnv;
}
```

Generate the hash with `php artisan dataroom:hash-pin`. The `--pin=` flag exists
but lands the PIN in shell history; prefer the interactive prompt.

## Access codes

`AccessCodeGenerator` (`backend/app/Services/DataRoom/AccessCodeGenerator.php`).

- Alphabet: `ACDEFGHJKMNPQRTVWXY34679`. 24 characters, excluding `O I L S B Z U 0
  1 2 5 8`, because a code gets read down a phone line and retyped from a
  screenshot.
- Shape: `MTJ-XXXX-XXXX`. Two groups of four gives 24^8 ≈ 1.1 × 10^11.
- Every character from `random_int()`, which draws from the OS CSPRNG and throws
  rather than degrading. Never `mt_rand`, never `Str::random` for this.
- `normalize()` runs before comparison: uppercases, unifies en/em dashes and
  underscores and spaces to `-`, strips anything else. An investor pasting
  `mtj–8f4k 92qx` out of a mail client authenticates.
- Stored as bcrypt. `hint()` keeps the last four characters so an administrator
  can match a grant to a code someone quotes at them. The full code is displayed
  once, at creation, and is not recoverable. A lost code is regenerated.

Search space plus the per-IP lockout puts online guessing out of reach. The codes
are not built to resist an offline attack on a stolen hash table; bcrypt is what
covers that.

## Sessions

Issued on successful authentication in
`DataRoomVisitorAuthController::authenticate()`:

```php
$rawToken = Str::random(64);
DataRoomSession::create([
    'token_hash' => hash('sha256', $rawToken),
    ...
    'expires_at' => now()->addMinutes($idle),
    'absolute_expires_at' => now()->addMinutes($absolute),
]);
```

- The raw token exists in exactly two places: that response body, and the
  visitor's browser. The database holds only the digest, so a database dump does
  not yield a usable session.
- Sent as `Authorization: Bearer <token>`. Not a cookie, and deliberately so:
  there is then no shared cookie jar with the public site or with Sanctum, which
  is what makes the domain separation real rather than nominal. The trade-off is
  recorded in [known-limitations.md](known-limitations.md#5-sessions-are-bearer-tokens-not-cookies).
- **Two clocks.** `expires_at` is the idle timeout, default 30 minutes, refreshed
  by `touchActivity()` on every authenticated request. `absolute_expires_at` is a
  hard ceiling, default 8 hours, which activity cannot push. The session dies at
  whichever arrives first.
- `POST /dataroom/logout` deletes the session row and always answers 200, whether
  or not a session was found, so logout cannot be used to test whether a token is
  valid.

### What kills a session

| Event | Effect | Where |
| --- | --- | --- |
| Idle > 30 min | row deleted, `session_expired` logged, 401 | `DataRoomAuthenticate` |
| Age > 8 h | same | same |
| Grant revoked or suspended | row deleted, `access_denied` logged, 403 | same |
| Grant expires / exhausts | same, via `effectiveStatus()` | same |
| Room disabled or locked down | 403 before the token is even read | same |
| Admin "revoke all sessions" | every row deleted | `AdminDataRoomController::emergency` |
| Visitor logout | own row deleted | `logout()` |

Nothing is cached, so none of these wait for a TTL or a cron run.

## Every failure looks the same

`DataRoomVisitorAuthController::GENERIC_FAILURE`:

> We could not verify those details. Please check the email address and access
> code you were sent.

Returned with **401** for all of: unknown email, known email with the wrong code,
revoked grant, expired grant, suspended grant, exhausted grant, wrong global PIN.
The real reason goes to `dataroom_audit_logs.details` (`unknown email`, `code
mismatch`, `status: revoked`, `global pin mismatch`).

Status codes are part of the response, so they are held identical too. A
different code for a different cause would leak just as effectively as a
different sentence. The eval lane's L1 criterion grades exactly this, with the
five rejection payloads presented to the judge side by side.

Timing is equalized as well. On an unknown address there is no hash to check
against, which would make the miss measurably faster than a hit, so the
controller burns one round anyway:

```php
if ($candidates->isEmpty()) {
    Hash::make($code);
}
```

## Brute force

Two independent `RateLimiter` keys per attempt:

- `dataroom:auth:ip:<ip>`
- `dataroom:auth:email:<sha1(email)>`

Both are hit on failure and both are cleared on success. The IP key stops one
attacker walking a code list; the email key stops a distributed attack
concentrating on one grant. Default ceiling 5 attempts, lockout 900 seconds.

At the ceiling the response is **429** with a different, deliberately
non-generic message and a `retryAfter` field:

> Too many attempts. For security, access has been paused temporarily. Please
> try again later.

That one reveals only that the caller is being throttled, which they can already
observe. It says nothing about whether any credential was correct.

Deployment caveats for the limiter (proxy IP collapse, per-server file cache) are
in [known-limitations.md](known-limitations.md#8-rate-limiting-is-per-process-cache-per-ip).

## Room-closed handling

`GET /dataroom/gate` is the only unauthenticated read. It returns exactly three
fields: whether the room is open, whether a PIN field should be rendered, and the
closed message. It does not reveal the PIN, the number of grants, or anything
about the contents.

When the room is closed, `authenticate` returns **403** with the closed message
before touching credentials. `gate.closed_room_authenticate` in the eval corpus
replays a genuinely valid email and code against a closed room specifically to
confirm the response does not hint that the credential was good.

"Disabled" and "emergency lockdown" produce the same sentence on purpose:

> The data room is not currently available. Please contact your MyTijaara contact
> for assistance.

## Room for MFA

There is none today; authentication is single-factor. The flow is arranged so a
second step fits between "code verified" and "session issued" without touching
anything before or after: at that point the grant is known, no token has been
minted, and the throttle keys are still live. Adding email OTP means inserting a
challenge there and holding a short-lived pending record. Nothing about the
session model, the middleware or the authorization layer changes.

## Tests

`backend/tests/Feature/DataRoomAuthenticationTest.php` covers valid code, wrong
code, unknown email, revoked, suspended, expired, exhausted, pending start date,
the identical-message property across all rejection causes, PIN required, wrong
PIN, rate-limit lockout, idle expiry, absolute expiry, revocation killing a live
session, lockdown killing a live session, logout, and the no-token and
garbage-token cases.
