# Known limitations

Referenced from `backend/config/dataroom.php` and
`backend/app/Services/DataRoom/DocumentUploader.php`. Every gap below is a real
gap in the deployment as it stands. None of it is simulated in code to look
finished.

## 1. No malware scanning is provisioned

`config('dataroom.antivirus.enabled')` defaults to **false**. Uploads therefore go
validate → private disk with the scan stage explicitly skipped.

The pipeline stage exists: `DocumentUploader` writes to a `quarantine/`
subdirectory first and only promotes bytes to `documents/` after the scan gate,
and the gate shells out to `clamscan` through `symfony/process` when it is turned
on. What is missing is the binary. Nothing in this deployment pretends otherwise:
`DocumentUploader::store()` returns `scanned: false`, the upload endpoint reports
`meta.malwareScanned: false`, and the audit row reads
`malware scan: not configured` rather than `malware scan: clean`.

**Residual risk.** A malicious file uploaded by an administrator would be stored
and served to visitors. The mitigating controls are the extension allowlist, the
MIME-versus-extension cross-check, the forbidden-extension list applied to every
segment of a multi-part filename, and the fact that only authenticated
administrators holding `data-room.upload` can put bytes in the room at all. That
reduces the exposure to "an administrator uploads an infected diligence document
by accident". It does not eliminate it.

**To close it.** Install ClamAV, then set `DATA_ROOM_AV_ENABLED=true` and
`DATA_ROOM_CLAMSCAN_PATH` to the binary. No code change is required.

## 2. Office documents have no in-browser preview

PDF and image previews are served from the private disk through the authorized
endpoint. DOCX, XLSX, PPTX, DOC, XLS, PPT and CSV have **no viewer**. The visitor
UI shows "Preview unavailable for this file type" and offers a download when, and
only when, the four download gates all allow it.

This was a deliberate refusal rather than an omission. The two ways to preview an
Office file in a browser are to hand the bytes to a third-party viewer, which
means shipping a confidential cap table to an external service, or to convert
server-side with LibreOffice, which is not installed. A viewer that silently
posted the file elsewhere would be worse than no viewer, and a viewer that
appeared to protect the document while exposing the original would be a lie.

**To close it.** Provision LibreOffice headless and add a conversion stage that
renders to PDF on the private disk, then reuse the existing PDF path. The
authorization checks do not change.

## 3. Watermarking covers PDFs only, and can fail open

`PdfWatermarker` stamps every page with the visitor's email, organization,
timestamp and a confidentiality line, using `setasign/fpdi`. Three limits:

- **PDF only.** Images, spreadsheets and Office files are served unstamped.
- **Fails open, by design.** FPDI's free parser cannot re-import an encrypted PDF
  or certain structures. When `stamp()` returns null the caller serves the original
  unstamped rather than denying access, and records which path was taken in the
  audit trail. Denying a legitimate investor because of a PDF quirk is the worse
  failure.
- **Deterrence, not protection.** A recipient can screenshot, re-print or
  re-render any document. The purpose is that a copy which escapes carries the
  address it was issued to.

## 4. No email delivery of credentials

Grant creation returns the plaintext access code once, on screen, for the
administrator to deliver out of band. No invitation email is sent automatically.
The spec asked for exactly this: credentials are not auto-mailed unless explicitly
requested, and the "explicitly requested" path is not built.

**Consequence.** Delivery is manual. There is no record in the system of how or
when a code reached its recipient, only that it was issued.

## 5. Sessions are bearer tokens, not cookies

Visitor sessions are opaque 64-character tokens sent as `Authorization: Bearer`.
Only `hash('sha256', $token)` is stored. This keeps the data room's session state
completely disjoint from the public site's cookie jar and from Sanctum, which is
what makes the three-domain separation real rather than nominal.

The trade-off is that the token lives in the browser's storage rather than in an
`HttpOnly` cookie, so an XSS bug anywhere the workspace runs could read it. The
compensating controls are a 30-minute idle timeout, an 8-hour absolute ceiling,
immediate invalidation when a grant is revoked or suspended, and the fact that the
data room UI renders no visitor-supplied HTML.

## 6. No MFA or email OTP

Authentication is a single factor: the assigned email address plus the access code
(plus the optional room-wide PIN, which is shared and therefore not a factor). The
authenticate flow is structured so a second step can be inserted between code
verification and session issue without rebuilding anything, but that step does not
exist.

## 7. Expiry is derived, not swept

`effectiveStatus()` computes expiry, exhaustion and pending state from the row on
every read, so an expired grant stops working the instant it expires with no cron
involved. The stored `status` column can therefore lag: a grant may read
`status: active` in the database while reporting `exhausted` through the API. That
is correct behaviour and is asserted in the test suite, but anyone querying the
table directly must use the model, not the column.

Dead session rows are deleted when they are next presented, not on a schedule.
`dataroom_sessions` will accumulate rows for sessions nobody returns to.

## 8. Rate limiting is per-process cache, per IP

Brute-force protection uses Laravel's `RateLimiter` keyed on the client IP and on
a hash of the submitted email. On a single-server deployment with a shared cache
store this is sound. Two caveats:

- Behind a proxy that does not set a trusted forwarded header, every visitor
  shares one IP key and one attacker can lock out everyone. Verify
  `TrustProxies` before putting this behind a CDN.
- With `CACHE_STORE=file` on multiple app servers, each server counts separately,
  multiplying the effective attempt ceiling by the server count. Use a shared
  store (Redis, database) in that topology.

## 9. No legal review of any text

The first-login confirmation records an acknowledgement timestamp against the
grant. Its wording is a confidentiality reminder, not an NDA, and no lawyer has
read it. Nothing in this system has been reviewed for compliance with the NDPR,
GDPR, or any other regulation, and no such claim is made anywhere in the code or
the UI.

## 10. Analytics describe behaviour, not intent

The activity dashboard reports what was viewed, downloaded and when. It does not
score, rank or infer investment interest, and the copy deliberately avoids doing
so. Reading intent into a view count is the reader's judgment, not the system's
output.

## 11. Single-tenant, single round

One data room, one settings row, one folder tree. There is no notion of separate
rooms per deal. Running a second round through it would mean either sharing the
tree or a schema change.

## 12. Deployment gaps

- **Backups are not automated by this codebase.** See
  [backup-and-recovery.md](backup-and-recovery.md). A backup that covers the
  database but not `storage/app/dataroom` restores metadata pointing at bytes that
  no longer exist.
- **No storage encryption at rest** beyond whatever the host filesystem provides.
- **The eval lane needs an authenticated `claude` CLI.** See
  [../../evals/data-room/README.md](../../evals/data-room/README.md).

## 13. `pnpm lint` cannot pass on a `core.autocrlf=true` checkout

Not a data room limitation, but it will look like one the first time someone
runs the frontend lint over this work.

This checkout has `git config core.autocrlf` set to `true`, so git stores LF and
writes CRLF into the working tree. The ESLint config ends with
`eslint-plugin-prettier/recommended`, and prettier is configured for LF, so the
rule reports `Delete ␍` on every line of every file git has touched. Linting
two unrelated pre-existing directories produced 1506 problems on that basis
alone.

`pnpm lint` is therefore red on this machine independently of any change, and
`eslint --fix` across the tree would rewrite every file in the repository. The
data room work was linted by path instead:

```bash
npx eslint src/components/dataroom src/lib/dataroom src/routes/dataroom.tsx
```

That reports 0 errors and 2 `react-refresh/only-export-components` warnings, a
warning class already present six times in `src/lib/cms-context.tsx` and
`src/components/admin`.

The permanent fix is a repository decision, not a data room one: either set
`core.autocrlf=input` and normalize once with a `.gitattributes` `* text=auto
eol=lf`, or set prettier's `endOfLine` to `auto`. Both touch every file, so
neither belongs in a feature commit.

## 14. The gate suite runs on SQLite; production runs on MySQL

The PHPUnit suite uses `DB_CONNECTION=sqlite` with `:memory:`, which keeps the
gate lane free and under a minute. SQLite is more permissive than MySQL about
DDL, so a migration can be green on every one of the 311 tests and still be
rejected by the production database.

That happened twice on the first MySQL deployment of
`2026_08_27_000001_create_dataroom_tables`:

1. `SQLSTATE[42000] 1059` — Laravel's auto-generated index name
   `dataroom_access_grant_documents_access_grant_id_document_id_unique` is 66
   characters and MySQL caps an identifier at 64. SQLite has no cap.
2. `SQLSTATE[42000] 1067` — `dataroom_sessions` declared three `NOT NULL`
   `TIMESTAMP` columns. MySQL auto-assigns `DEFAULT CURRENT_TIMESTAMP` to the
   first one only and leaves the rest with an implicit zero-date default, which
   strict mode rejects. SQLite accepts all three.

Both are now caught offline by
[`backend/tests/Feature/MigrationMysqlCompatibilityTest.php`](../../backend/tests/Feature/MigrationMysqlCompatibilityTest.php),
which registers a MySQL connection it never dials, runs every migration in the
repo through `Connection::pretend()` so the MySQL grammar emits the DDL without
executing it, and then asserts two properties of that SQL: no identifier exceeds
64 characters, and no `NOT NULL TIMESTAMP` lacks a default. It costs about three
seconds and needs no MySQL server.

The residual limitation is that the check is a static read of the emitted SQL,
not an execution of it. It catches these two failure classes and any future one
expressible as a pattern in the DDL. It does not catch a MySQL rejection that
depends on server state, row data, engine, or `sql_mode` — a row-size overflow,
a collation conflict on an existing table, or a foreign key against a column of
a mismatched type. A pre-deployment `php artisan migrate --pretend` against the
real MySQL instance remains worth running, and is in
[deployment.md](deployment.md).

Because DDL is not transactional in MySQL, the first failure left the production
database half-built with the migration unrecorded. Every `Schema::create` in the
data room migration is now wrapped in a `hasTable` guard, and the two junction
uniques are re-checked after the creates, so re-running `php artisan migrate` on
a half-applied database completes it without dropping anything and behaves
identically on a clean one. That recovery path was verified against a real
MySQL 8 database that had been left partly migrated by failure 2.
