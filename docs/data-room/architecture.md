# Architecture

## What this is

A single-tenant investor data room inside the existing MyTijaara Laravel
application. It adds 11 tables, 7 RBAC permissions, one middleware, five
services, seven controllers and 47 routes. It changes no existing table, no
existing route and no existing auth path.

## Three identity domains, one application

```
                      ┌──────────────────────────────┐
   public visitor ──> │ landing site + waitlist      │  no auth
                      └──────────────────────────────┘
                      ┌──────────────────────────────┐
   administrator ───> │ /admin  ·  auth:sanctum      │  Sanctum PAT + Spatie RBAC
                      │         ·  permission:*      │
                      └──────────────┬───────────────┘
                                     │ issues grants
                                     v
                      ┌──────────────────────────────┐
   investor ────────> │ /dataroom · DataRoomAuthenti- │  opaque bearer token
                      │             cate middleware   │  scoped to one grant
                      └──────────────────────────────┘
```

The separation is structural, not a naming convention:

- The visitor routes never reference `auth:sanctum`
  (`backend/routes/api.php:74`). `DataRoomAuthenticate` never consults a Sanctum
  token or a session cookie. It resolves a `dataroom_sessions` row by
  `hash('sha256', $bearer)` and nothing else.
- A waitlist row grants nothing. There is no join between `waitlist_entries` and
  `dataroom_access_grants`.
- An admin account grants nothing to a visitor and vice versa. The only way into
  the room is a grant an administrator issued to a named email address.
- An admin needs an explicit `data-room.*` permission to touch the admin side.
  `RoleSeeder` gives `admin` five of the seven and withholds
  `data-room.manage-settings` and `data-room.delete` for `super_admin`.

## Layers

**HTTP.** `DataRoomVisitorAuthController` (gate, authenticate, me, logout),
`DataRoomWorkspaceController` (dashboard, folders, search, document metadata,
preview, download, activity, acknowledge), and five admin controllers. No
controller decides authorization itself.

**Middleware.** `DataRoomAuthenticate` is the only place a visitor session is
validated. It re-checks four things on every request: the room is open, the
session exists, neither clock has expired, and the grant is still active. Nothing
is cached, so a revocation lands on the visitor's next click.

**Services.**

| Service | Responsibility |
| --- | --- |
| `DataRoomAuthorizer` | The only answer to "may this grant touch this resource". |
| `DataRoomPolicyResolver` | Merges `config/dataroom.php` with `dataroom_settings`. |
| `AccessCodeGenerator` | CSPRNG code generation, normalization, hint extraction. |
| `DocumentUploader` | validate → quarantine → scan → promote → checksum. |
| `PdfWatermarker` | Per-visitor PDF stamping. Fails open, never closed. |

**Models.** 10 Eloquent models over the 11 tables (the two grant junctions are
pivots). `DataRoomAccessGrant::effectiveStatus()` derives expiry and exhaustion
from the clock; `DataRoomSetting::current()` returns the singleton settings row.

## The two-layer policy model

`config/dataroom.php` is owned by whoever controls the environment.
`dataroom_settings` is owned by an administrator in the UI.
`DataRoomPolicyResolver` merges them with one rule: **config is a ceiling, the
admin may only tighten it.**

```php
public function idleTimeoutMinutes(): int
{
    $ceiling = max(1, (int) config('dataroom.idle_timeout', 30));
    $configured = (int) $this->settings()->session_timeout_minutes;

    return $configured > 0 ? min($ceiling, $configured) : $ceiling;
}
```

Consequence: an operator who sets `DATA_ROOM_ENABLED=false` has closed the room,
and no admin session, compromised or otherwise, can reopen it through the API.
An admin can always close it further: `emergency_lockdown`, `downloads_enabled`
and `watermark_enabled` are honoured downward.

## Request paths

**Authenticate.** `POST /api/v1/dataroom/authenticate` → room open? → throttle
check on IP and on `sha1(email)` → optional global PIN → load up to 10 grants for
that email, newest first → `Hash::check` the normalized code against each →
`isActive()` → increment `current_uses`, issue `Str::random(64)`, persist only its
SHA-256 → 200 with the token, both session clocks and the visitor payload. Every
failure on that path returns the same 401 and the same sentence.

**Read a document.** `GET /api/v1/dataroom/documents/{uuid}` →
`DataRoomAuthenticate` resolves the grant → look the document up by opaque UUID
and `status = published` → `DataRoomAuthorizer::canAccess()` → increment
`view_count`, write a `dataroom_document_views` row and an audit row → return
metadata. Missing and unauthorized both answer **404 with the same body**.

**Stream bytes.** `preview` and `download` add a byte-existence check, then
watermark PDFs when policy allows, then stream from the private disk.
`download` additionally requires `canDownload()`, which is a separate gate from
`canAccess()`.

## Where it plugs into what already existed

- `bootstrap/app.php` — unchanged. The `api/v1` prefix and the `permission:`
  middleware alias were already there.
- `RoleSeeder` — extended from 42 to 49 permissions. Existing roles keep every
  permission they had.
- `config/filesystems.php` — one new private disk, `dataroom`.
- `routes/api.php` — two new blocks, one public/visitor, one inside the existing
  `auth:sanctum` group.
- Nothing in `src/` (the public React site) references the data room. It is absent
  from the navbar, the footer, the sitemap and every CTA, and every data room
  response carries `X-Robots-Tag: noindex, nofollow, noarchive`.

## Testing shape

Two lanes, split on the machine-space boundary.

**Gate lane** (deterministic, free, every commit): 145 tests / 841 assertions
across `DataRoomAuthenticationTest`, `DataRoomAuthorizationTest`,
`DataRoomAdminApiTest`, `DataRoomUploadSecurityTest`, `DataRoomEvalRunnerTest`
and `AccessCodeGeneratorTest`.

**Eval lane** (paid, threshold-gated): `backend/tests/Eval/` captures 30
visitor-facing payloads deterministically, then `evals/data-room/run.php` hands
each to local Claude Code with `rubric.md` to answer the one question a test
cannot: does any of this wording tell an outsider something it should not.
Leakage and header dimensions are absolute; copy is a mean with an 85% floor. See
[../../evals/data-room/README.md](../../evals/data-room/README.md).
