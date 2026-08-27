# Access grant model

A grant is the authorization subject for the entire data room. No visitor exists
without one, and nothing a visitor can reach is decided anywhere other than by
their grant. `AdminDataRoomGrantController` is therefore the highest-value surface
in the feature: gated on `data-room.manage-access`, every mutation audited.

## Fields

| Field | Notes |
| --- | --- |
| `uuid` | external reference |
| `visitor_email` | **immutable after creation.** It is half the credential; changing it would hand an existing code to a different mailbox |
| `visitor_name`, `organization`, `role_title` | `role_title` defaults `Investor` |
| `access_code_hash`, `code_hint` | bcrypt + last 4 characters |
| `starts_at` | defaults to now. A future value makes the grant `pending` |
| `expires_at` | null = never expires |
| `max_uses`, `current_uses` | `current_uses` increments per successful authentication, not per request |
| `status` | see below |
| `all_documents_access` | bypasses both junctions for reads |
| `downloads_permitted` | gate 2 of 4 |
| `notes` | internal. Never returned to a visitor |
| `created_by`, `last_accessed_at`, `acknowledged_at` | |

## Statuses

Three are set by an administrator and three are derived from the clock.
`effectiveStatus()` is the only correct reader:

```php
if (in_array($this->status, ['revoked', 'suspended'], true)) return $this->status;
if ($this->expires_at && now()->greaterThan($this->expires_at)) return 'expired';
if ($this->max_uses !== null && $this->current_uses >= $this->max_uses) return 'exhausted';
if ($this->starts_at && now()->lessThan($this->starts_at)) return 'pending';

return $this->status === 'active' ? 'active' : $this->status;
```

| Status | Source | Meaning |
| --- | --- | --- |
| `active` | stored | usable now |
| `pending` | derived | `starts_at` is in the future |
| `expired` | derived | past `expires_at` |
| `exhausted` | derived | `current_uses >= max_uses` |
| `suspended` | stored | paused by an admin, reversible |
| `revoked` | stored | terminal |

`isActive()` is `effectiveStatus() === 'active'` and is checked by
`DataRoomAuthenticate` on **every** request as well as at authentication. Expiry
therefore needs no scheduled job: a grant stops working at the instant it expires,
mid-session included. The stored column can lag; the model is authoritative.

**Revocation is terminal.** `POST /grants/{id}/status` refuses to move a revoked
grant to anything else:

> A revoked grant cannot be reactivated. Issue a new grant instead.

A revoked code can never come back to life. Reissuing is a new grant with a new
code, which keeps the audit story unambiguous.

## Creation

`POST /api/v1/admin/dataroom/grants`. Four wizard steps commit here as one
payload: visitor, access window, permissions, review.

A template seeds the scope; anything sent explicitly overrides it, so the review
step is always what actually gets saved. Templates are copied, not linked —
editing a template later never silently changes an issued grant.

**A grant must have scope.** Creation is rejected with 422 unless it carries
`all_documents_access`, at least one document, at least one folder, or at least
one entry in either permission matrix array:

> A grant must include at least one document or category, or full access.

Ids named only in the permission-matrix arrays count, or the wizard would refuse a
payload that `syncScope()` would have happily granted.

The response is **the only time the plaintext code exists** outside the visitor's
inbox:

```json
{ "data": { "grant": { ... }, "accessCode": "MTJ-8F4K-92QX" } }
```

Only the bcrypt hash and the four-character hint are stored. A lost code is
regenerated, never recovered.

## Durations

`AdminDataRoomGrantController::DURATIONS`, in hours:

| Option | Hours |
| --- | --- |
| `1h` | 1 |
| `6h` | 6 |
| `24h` | 24 |
| `3d` | 72 |
| `7d` | 168 |
| `14d` | 336 |
| `30d` | 720 |
| `custom` | explicit `expires_at`, must be `after:now` |
| `never` | null `expires_at` |

`never` requires an explicit second field:

```json
{ "duration": "never", "confirm_never_expires": true }
```

Without it, 422:

> A grant that never expires requires explicit confirmation.

`GET /grants/durations` returns the option list plus the settings row's
`default_access_duration_days` so the wizard does not hard-code any of it.

## Permission levels

Three, from broadest to narrowest:

1. **Room-wide** — `all_documents_access`. Every published document. Still
   subject to `status`, so drafts stay invisible.
2. **Folder** — a `dataroom_access_grant_folders` row with its own `can_download`.
3. **Document** — a `dataroom_access_grant_documents` row with `can_download` and
   `can_print`.

Document-level beats folder-level for download, so a folder can be opened broadly
and one file tightened inside it. The spec's six permission types map onto this
shape rather than onto a separate table:

| Spec permission | Where it lives |
| --- | --- |
| `VIEW_FOLDER` | folder pivot row exists |
| `VIEW_METADATA` | implied by any scope covering the document |
| `VIEW_DOCUMENT` / `PREVIEW_DOCUMENT` | `canAccess()` + `isPreviewable()` |
| `DOWNLOAD_DOCUMENT` | the four gates in `canDownload()` |
| `PRINT_DOCUMENT` | `can_print` on the document pivot |

Printing is advisory and is honestly labelled as such: a browser cannot be
prevented from printing what it has rendered. What `can_print` does is withhold
the print affordance and record the intent. Deterrence, not enforcement.

## Templates

Eight seeded by `DataRoomSeeder`, idempotent via `firstOrCreate`. Folder sort
orders in brackets.

| Template | Scope | Downloads | Default |
| --- | --- | --- | --- |
| Investor Basic | [30, 50] | no | 7d |
| Investor Standard | [20, 30, 40, 50] | yes | 14d |
| VC Investor | [10, 20, 30, 40, 50] | yes | 30d |
| Strategic Partner | [30, 40, 50] | no | 14d |
| Bank Partner | [10, 20] | no | 30d |
| Advisor | [30, 40] | no | 30d |
| Legal Counsel | [10, 20] | yes | 30d |
| Full Diligence | all documents | yes | 30d |

Admins can add their own through `POST /admin/dataroom/templates`.

## Lifecycle operations

| Route | Effect |
| --- | --- |
| `GET /grants` | list with creator, scope and session count |
| `GET /grants/{id}` | grant + last 200 audit rows + live sessions (IP, UA, last active, both clocks) |
| `POST /grants` | create, returns the plaintext code once |
| `PATCH /grants/{id}` | profile, scope, matrix. Email is not accepted |
| `POST /grants/{id}/status` | `active` / `suspended` / `revoked` |
| `POST /grants/{id}/extend` | new duration or explicit date, `never` still needs confirmation |
| `POST /grants/{id}/regenerate` | new code, returned once, old hash overwritten |
| `DELETE /grants/{id}` | soft delete |
| `GET /permission-matrix` | documents × grants |

Suspending or revoking deletes every live session for that grant in the same
request and reports the count as `sessionsDestroyed`. An investor mid-session
loses access on their next click, not at the end of a TTL.

`extend` audits the transition as `old -> new`, with `never` written literally, so
a widened window is legible afterwards.

## What is never returned

`access_code_hash` is in the model's `$hidden`, so it cannot be serialized to any
client, admin included. `code_hint` is four characters and exists only so an
administrator can match a grant to a code someone quotes at them on a call.

## Audit trail

Every mutation writes a `dataroom_audit_logs` row with the acting `user_id`:
`admin_created_access_grant`, `admin_updated_access_grant`,
`admin_changed_grant_status`, `admin_revoked_access_grant`,
`admin_extended_access_grant`, `admin_regenerated_access_code`,
`admin_deleted_access_grant`. `GET /grants/{id}` surfaces them inline, so "what
happened to this investor's access" is one request.

## Credential delivery

Manual, by design. The plaintext code is displayed once for the administrator to
send out of band. No invitation email is sent. The consequence — no system record
of how or when a code reached its recipient — is recorded in
[known-limitations.md](known-limitations.md#4-no-email-delivery-of-credentials).
