# Security controls

Mapped to the threat each one answers. Nothing here is a plan; every row is code
that exists in the branch.

## Threat to control

| Threat | Control | Where |
| --- | --- | --- |
| Guessing the URL | Nothing about `/dataroom` is a secret. Every route behind `dataroom.auth`; the only unauthenticated read is `GET /dataroom/gate`, which returns three booleans and a sentence | `routes/api.php:66-93` |
| Account enumeration | One message, one status code (401) for unknown email, wrong code, revoked, expired, suspended, exhausted, wrong PIN | `DataRoomVisitorAuthController::GENERIC_FAILURE` |
| Timing enumeration | `Hash::make($code)` burned when no candidate grant exists, so a miss costs the same as a hit | `authenticate()` |
| Online code guessing | Two `RateLimiter` keys per attempt (IP, sha1 email), 5 attempts, 900 s lockout, 429 with `retryAfter` | `authenticate()`, `penalize()` |
| Offline attack on a stolen table | bcrypt for codes and the PIN. Session tokens stored as SHA-256 digests only | `DataRoomAccessGrant`, `DataRoomSession` |
| Weak codes | `random_int()` from the OS CSPRNG, 24-character unambiguous alphabet, 24^8 space. Never `mt_rand`, never `Str::random` | `AccessCodeGenerator` |
| Stolen session token replay | Digest lookup, idle clock, absolute clock, grant re-checked every request | `DataRoomAuthenticate` |
| Privilege escalation between domains | Separate guard, no shared cookie, no shared token namespace, no `users` row for a visitor. An admin account grants no visitor access and a visitor cannot become an admin | `DataRoomAuthenticate` docblock |
| IDOR | Visitors address documents by `uuid` only. Autoincrement ids never leave the server on visitor traffic. Every lookup is scoped to the grant before the object is returned | `DataRoomWorkspaceController::authorizeDocument()` |
| Existence disclosure | Unauthorized and nonexistent both return 404 with the identical body `This document is not available.`; only the audit row differs | same |
| Search leaking scope | Permission scope applied first, text match narrows it. A match the visitor cannot see returns nothing, not a locked card | `search()` |
| Client-side-only permissions | `downloadsPermitted`, `accessible`, `previewSupported` are UI affordances. `download()` re-runs `canDownload()` before a byte moves | `DataRoomAuthorizer` |
| Public static exposure | Private `local` disk outside the document root, `serve => false`, never `storage:link`ed | `config/filesystems.php:53` |
| Raw storage URLs | None issued. No signed URLs, no temporary URLs, no CDN host. `file_path` never serialized | `storage.md` |
| Path traversal on upload | Stored name is `Str::uuid()` + validated extension. The client name never touches a path | `DocumentUploader` |
| Double extension | Every dot-segment lowercased and checked against `forbidden_extensions`, so `deck.pdf.exe` and `model.php.pdf` both fail | `resolveExtension()` |
| MIME spoofing | `getMimeType()` (finfo over real bytes) compared to the extension's allowed list. `getClientMimeType()` never consulted | `assertMimeMatchesExtension()` |
| Malware | Quarantine subdirectory then `clamscan`. Enabled-but-broken fails closed. Disabled is reported as `scanned: false` everywhere, not hidden | `scan()`, [known-limitations.md](known-limitations.md#1-no-malware-scanning-is-provisioned) |
| Stored XSS through a served file | `Content-Type` from a fixed map with `application/octet-stream` fallback; `svg`, `html`, `htm`, `xhtml`, `shtml` forbidden outright | `DataRoomDocument::mimeType()` |
| Header injection through a filename | `normalizeFilename()` strips everything outside `A-Za-z0-9 ._-`, drops any directory part via `basename()`, caps at 120 chars | `DocumentUploader` |
| Oversize upload | `max_kb`, default 51200 | `config/dataroom.php:63` |
| SQL injection | Eloquent and parameter binding throughout. The only raw fragment is the constant `whereRaw('1 = 0')` | `DataRoomAuthorizer` |
| Stack trace disclosure | Forced JSON error envelope in `bootstrap/app.php`; the disk is configured `throw => false, report => false` so a missing file is a controlled 404 | |
| Search-engine indexing | `X-Robots-Tag: noindex, nofollow, noarchive` on every data room response, set by the middleware | `DataRoomAuthenticate` |
| Cached confidential response | `Cache-Control: private, no-store, max-age=0, must-revalidate` and `Pragma: no-cache` | same |
| Admin over-reach | Seven Spatie permissions gated per endpoint. `admin` is withheld `data-room.manage-settings` and `data-room.delete` | `RoleSeeder.php:56` |
| Audit tampering | Administrative actions are on the always-logged list, so an admin cannot switch off audit logging and then act unobserved | `AdminDataRoomController.php:286` |
| Secret leakage into logs | No code, token, hash or PIN is ever written to `dataroom_audit_logs`. `details` carries classifications (`unknown email`, `code mismatch`, `status: revoked`) | `database-schema.md` |

## The four download gates

All must agree. Any single no wins:

1. `DataRoomPolicyResolver::downloadsEnabled()` — the global settings switch.
2. `grant.downloads_permitted`.
3. `document.downloads_permitted`.
4. The pivot: document row if present, else folder row. Neither present means no.

One settings write disables every download in the room without editing a single
grant or document.

## Emergency controls

`POST /admin/dataroom/emergency`, gated on `data-room.manage-settings`, which the
ordinary `admin` role does not hold. Each action requires the caller to echo a
confirmation phrase or the request is rejected 422.

| Action | Phrase | Effect |
| --- | --- | --- |
| `lock_room` | `LOCK DATA ROOM` | `emergency_lockdown = true` **and** every session deleted. Every request 403 before the token is read |
| `unlock_room` | `UNLOCK DATA ROOM` | clears the flag |
| `revoke_all_sessions` | `REVOKE ALL SESSIONS` | deletes every `dataroom_sessions` row |
| `disable_all_downloads` | `DISABLE ALL DOWNLOADS` | `downloads_enabled = false` |
| `enable_all_downloads` | `ENABLE ALL DOWNLOADS` | restores it |
| `disable_all_grants` | `DISABLE ALL ACCESS GRANTS` | suspends every active grant and deletes every session |

The phrase is compared with `hash_equals` after a trim. Lockdown destroys
sessions too, because a lockdown that leaves live sessions running is not a
lockdown.

Audited as `emergency_lockdown`, `emergency_revoked_all_sessions`,
`emergency_disabled_all_downloads`, `emergency_disabled_all_grants`. Nothing here
is cached, so each takes effect on the next request rather than at the end of a
TTL.

## Two-layer policy

`config/dataroom.php` is a ceiling; the settings row may only tighten it. An
administrator cannot widen a limit the deployment set:

```php
public function idleTimeoutMinutes(): int
{
    return min((int) config('dataroom.idle_timeout'), $this->settings->session_timeout_minutes);
}
```

`watermarkEnabled()` and `downloadsEnabled()` are ANDs of both layers.
`pinRequired()` returns true only when a hash actually exists, because a switch
turned on with no hash configured would be an open door.

## What is deliberately not claimed

- Printing cannot be prevented. `can_print` withholds the affordance and records
  the intent.
- Watermarking is deterrence and traceability, not anti-copy, and it fails open on
  a PDF FPDI cannot re-import.
- Authentication is single-factor today.
- No regulatory compliance claim is made for any framework. No text in the feature
  has been reviewed by counsel; the acknowledgement is a reminder, not an NDA.

All of these are in [known-limitations.md](known-limitations.md) with residual
risk and the exact change that would close each one.

## Test coverage

| Suite | Covers |
| --- | --- |
| `DataRoomAuthenticationTest` | valid, wrong code, unknown email, revoked, suspended, expired, exhausted, pending, identical-message property, PIN required, wrong PIN, lockout, idle expiry, absolute expiry, revocation killing a live session, lockdown killing a live session, logout, no token, garbage token |
| `DataRoomAuthorizationTest` | folder grant, document grant, single-document isolation, unauthorized 404, nonexistent 404 with identical body, unpublished invisible to all-access, each of the four download gates independently, pivot precedence, locked-card withholding, search scope, empty grant, activity isolation |
| `DataRoomUploadSecurityTest` | `.exe`, both double-extension orders, PHP payload named `.pdf`, `.svg`, traversal in the filename, null byte, oversize, normalization output, checksum, quarantine emptied, valid PDF lands under a generated name |
| `DataRoomAdminApiTest` | per-permission gating on every admin route, emergency confirmation phrases, grant lifecycle |
| `AccessCodeGeneratorTest` | format, alphabet exclusions, normalization, hint |
| `DataRoomEvalRunnerTest` | the eval runner's own deterministic logic, without calling a model |

Gate lane: 145 tests, 841 assertions, no network, no paid call.
