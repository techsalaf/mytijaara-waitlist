# Database schema

One migration:
`backend/database/migrations/2026_08_27_000001_create_dataroom_tables.php`.
Eleven tables, all prefixed `dataroom_`. No existing table is altered. `down()`
drops them in reverse dependency order.

## 1. `dataroom_settings`

Singleton. `DataRoomSetting::current()` returns row 1, creating it with defaults
if absent.

| Column | Type | Default |
| --- | --- | --- |
| `enabled` | bool | true |
| `global_pin_enabled` | bool | false |
| `global_pin_hash` | string, null | null |
| `default_access_duration_days` | int | 14 |
| `session_timeout_minutes` | int | 30 |
| `max_failed_attempts` | int | 5 |
| `downloads_enabled` | bool | true |
| `watermark_enabled` | bool | true |
| `audit_logging_enabled` | bool | true |
| `emergency_lockdown` | bool | false |

Every one of these is a floor, not a ceiling. `DataRoomPolicyResolver` takes the
stricter of this row and `config/dataroom.php`.

## 2. `dataroom_folders`

`name`, `slug` (unique), `description`, `sort_order`. Flat by design for the
pre-seed round; `DataRoomSeeder` creates the five categories at sort orders
10–50, spaced so a folder can be inserted between two others without a
renumbering pass.

Nesting would be a `parent_id` and a recursive read; nothing in the authorization
layer assumes flatness beyond `documents.folder_id` being a single hop.

## 3. `dataroom_documents`

| Column | Notes |
| --- | --- |
| `uuid` | unique. The **only** identifier a visitor ever sees. |
| `folder_id` | FK, `nullOnDelete`. Deleting a folder orphans documents rather than destroying them. |
| `title`, `description` | `description` is withheld from locked cards. |
| `file_path` | relative path on the private disk, e.g. `documents/<uuid>.pdf`. Never serialized to any client. |
| `original_filename` | normalized display label for `Content-Disposition`. |
| `file_type` | validated extension. |
| `file_size` | bytes. |
| `version` | string, default `1.0`. |
| `status` | enum `draft, published, archived, restricted, superseded`, default `published`. Only `published` is visitor-reachable. |
| `confidentiality_level` | enum `public, internal, confidential, highly_confidential, restricted`, default `confidential`. |
| `checksum` | char(64), SHA-256 of the stored bytes. |
| `tags` | comma-separated, matched by search. |
| `downloads_permitted` | gate 3 of 4 on download. |
| `start_here_order` | null = not featured. Drives the dashboard reading list. |
| `view_count`, `download_count` | denormalized counters for the admin tiles. |
| `uploaded_by` | FK to `users`, `nullOnDelete`. |
| soft deletes | a deleted document keeps its audit trail resolvable via `withTrashed()`. |

Index: `(status, folder_id)`, which is the shape of every visitor listing query.

`confidentiality_level` is descriptive metadata for the reader. It is displayed
even on locked cards and it does **not** participate in the authorization
decision — `canAccess()` never reads it. Access is decided by grant scope and
`status` alone.

## 4. `dataroom_document_versions`

`document_id` (cascade), `version`, `file_path`, `original_filename`,
`file_size`, `checksum`, `change_notes`, `uploaded_by`.

Versioning is additive. Uploading v1.1 writes new bytes under a new generated
name, appends a row here, and repoints the parent document. The prior bytes stay
on disk. Nothing is overwritten, so a bad upload is recoverable and the checksum
history stays honest. Visitors are only ever served the current version.

## 5. `dataroom_access_grants`

The authorization subject. See [access-grants.md](access-grants.md) for the
lifecycle.

| Column | Notes |
| --- | --- |
| `uuid` | unique, external reference. |
| `visitor_name`, `visitor_email`, `organization`, `role_title` | `role_title` defaults `Investor`. |
| `access_code_hash` | bcrypt. In `$hidden`, so it cannot be serialized to any client including an admin. |
| `code_hint` | char(4). Last four characters only, so an admin can match a grant to a code someone quotes. |
| `starts_at`, `expires_at` | nullable. Null `expires_at` = never expires. |
| `max_uses`, `current_uses` | null max = unlimited. |
| `status` | enum `pending, active, expired, revoked, suspended, exhausted`, default `active`. |
| `all_documents_access` | bypasses both junctions for reads. |
| `downloads_permitted` | gate 2 of 4. |
| `notes`, `created_by` | internal. `notes` is never returned to a visitor. |
| `last_accessed_at`, `acknowledged_at` | `acknowledged_at` is the confidentiality timestamp. |
| soft deletes | an archived grant keeps its history. |

Indexes on `visitor_email` (the authenticate lookup) and `status`.

**The stored `status` can lag the truth.** `effectiveStatus()` layers the clock
and the usage counter on top of the column, so a row reading `active` reports
`expired` or `exhausted` through the API the instant either condition holds. The
column is authoritative only for the two states an admin sets deliberately,
`revoked` and `suspended`. Anything querying this table directly must go through
the model.

## 6. `dataroom_access_grant_documents`

`access_grant_id`, `document_id`, `can_download` (default true), `can_print`
(default false). Unique on the pair.

This is the permission matrix, stored. `can_download` here is gate 4.

## 7. `dataroom_access_grant_folders`

`access_grant_id`, `folder_id`, `can_download` (default true). Unique on the pair.

The fallback for gate 4 when no document-level row exists.

## 8. `dataroom_sessions`

| Column | Notes |
| --- | --- |
| `access_grant_id` | cascade. Deleting a grant destroys its sessions. |
| `token_hash` | char(64) unique. SHA-256 of the bearer token. The raw token is never stored. |
| `ip_address`, `user_agent` | UA truncated to 500 chars. |
| `expires_at` | idle clock, refreshed each request. |
| `absolute_expires_at` | hard ceiling, never extended. |
| `last_active_at` | for the admin's active-session list. |

Two clocks, not one. A session dies at whichever fires first.

Rows are deleted when next presented and found dead, not on a schedule, so the
table accumulates rows for sessions nobody returns to. Noted in
[known-limitations.md](known-limitations.md#7-expiry-is-derived-not-swept).

## 9. `dataroom_audit_logs`

| Column | Notes |
| --- | --- |
| `access_grant_id` | nullable, `nullOnDelete`. Null on pre-authentication failures. |
| `user_id` | nullable. Set for administrative actions. |
| `visitor_email` | denormalized so a deleted grant's trail stays readable. |
| `action` | e.g. `authenticated`, `authentication_failed`, `viewed_document`, `downloaded_document`, `access_denied`, `session_expired`, `emergency_lockdown`. |
| `target_type` / `target_id` | `varchar(96)` plus a bigint, indexed as `dr_audit_target_index`. Document, Folder, AccessGrant or Setting. Not `nullableMorphs`, whose 255-character type column made a 1031-byte key that MySQL rejected. See [known-limitations.md](known-limitations.md#14-the-gate-suite-runs-on-sqlite-production-runs-on-mysql). |
| `details` | free text. This is where the real reason for a generic 401 lives. |
| `ip_address`, `user_agent` | |

Indexes: `(action, created_at)` and `(access_grant_id, created_at)`, matching the
two ways the admin dashboard filters.

No document contents, no access code, no session token and no PIN is ever written
here. The `details` column carries classifications (`unknown email`, `code
mismatch`, `status: revoked`), not secrets.

## 10. `dataroom_document_views`

`document_id`, `access_grant_id`, `action_type` enum `view, preview, download`.
Both FKs cascade.

Separate from the audit log because it answers a different question. The audit log
is the forensic record and is append-only in practice; this table is the analytics
source, aggregated for most-viewed, most-downloaded and the daily trend chart.
Indexes `(document_id, action_type)` and `(access_grant_id, created_at)` serve
those two aggregations.

## 11. `dataroom_access_templates`

`name` (unique), `description`, `all_documents_access`, `downloads_permitted`,
`default_duration_days`, `document_ids` (json), `folder_ids` (json),
`created_by`.

A saved permission set. Applying a template at grant creation copies its
contents into the junction tables; it does not create a live link, so editing a
template never silently changes what an already-issued grant can reach.

`DataRoomSeeder` ships eight, idempotently via `firstOrCreate`: Investor Basic,
Investor Standard, VC Investor, Strategic Partner, Bank Partner, Advisor, Legal
Counsel, Full Diligence.

## Relationship summary

```
dataroom_settings          (singleton)

dataroom_folders 1───n dataroom_documents 1───n dataroom_document_versions
       │                        │
       │ n:n                    │ n:n
       │                        │
dataroom_access_grant_folders   dataroom_access_grant_documents
       │                        │
       └──────── dataroom_access_grants ────────┘
                        │  1───n dataroom_sessions
                        │  1───n dataroom_audit_logs
                        │  1───n dataroom_document_views
dataroom_access_templates  (referenced by copy at creation, no FK)
```

## Cascade behaviour

| Delete | Effect |
| --- | --- |
| Folder | documents keep their rows with `folder_id = null`; grant-folder pivots cascade away |
| Document (soft) | rows stay; visitor listings exclude it; audit trail resolvable via `withTrashed()` |
| Document (purge, `data-room.delete`) | pivots, versions and view rows cascade; bytes deleted from disk; audit rows keep `target_id` with nothing behind it |
| Grant (soft) | sessions and pivots remain; `isActive()` is false so nothing is reachable |
| Grant (hard) | sessions, pivots and view rows cascade; audit rows keep `visitor_email` |
| User | `uploaded_by` / `created_by` / `user_id` null out; nothing else moves |

## Migrating

```bash
cd backend && php artisan migrate
```

```bash
cd backend && php artisan db:seed --class=DataRoomSeeder
```

The seeder is idempotent. Re-running it will not duplicate folders or templates.
Never edit these tables by hand in production; use migrations.
