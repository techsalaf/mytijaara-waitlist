# MyTijaara Investor Data Room

Documentation for the virtual data room built into the MyTijaara application.
First use case: the $150,000 pre-seed round ($100k conventional SAFE + $50k
Sharīʿah-compliant equity, $1.5M post-money cap).

The data room is not a separate site. It runs inside the existing Laravel
application, extends the existing RBAC, and shares the deployment. What it does
not share is authentication: visitor identity is a completely separate domain
from admin identity and from the public waitlist.

## Where things are

| Concern | Path |
| --- | --- |
| Visitor API | `backend/routes/api.php:74-93` |
| Admin API | `backend/routes/api.php:268-315` |
| Authorization | `backend/app/Services/DataRoom/DataRoomAuthorizer.php` |
| Policy merge | `backend/app/Services/DataRoom/DataRoomPolicyResolver.php` |
| Session guard | `backend/app/Http/Middleware/DataRoomAuthenticate.php` |
| Upload pipeline | `backend/app/Services/DataRoom/DocumentUploader.php` |
| Schema | `backend/database/migrations/2026_08_27_000001_create_dataroom_tables.php` |
| Deployment config | `backend/config/dataroom.php` |
| Gate tests | `backend/tests/Feature/DataRoom*`, `backend/tests/Unit/AccessCodeGeneratorTest.php` |
| Eval lane | `evals/data-room/` |

## The documents

**Design**

- [architecture.md](architecture.md) — what the pieces are and why the boundaries
  sit where they do.
- [database-schema.md](database-schema.md) — all 11 tables, column by column.
- [storage.md](storage.md) — where bytes live and how they reach a visitor.

**Security**

- [authentication.md](authentication.md) — the three identity domains, the visitor
  session model, brute-force handling.
- [authorization.md](authorization.md) — the one function that decides access, and
  the four gates on download.
- [access-grants.md](access-grants.md) — the grant lifecycle, statuses, codes,
  durations, templates.
- [security-controls.md](security-controls.md) — the control list mapped to the
  test that proves each one.

**Operations**

- [deployment.md](deployment.md) — environment variables, migrations, first run.
- [backup-and-recovery.md](backup-and-recovery.md) — what to back up and the
  restore order that actually works.
- [admin-guide.md](admin-guide.md) — issuing access, uploading, emergency
  controls.
- [visitor-guide.md](visitor-guide.md) — what to send an investor.

**Honesty**

- [known-limitations.md](known-limitations.md) — every gap, named. Read this
  before promising anything to an investor.
- [future-enhancements.md](future-enhancements.md) — what would be built next and
  in what order.

## The three rules that shape everything else

1. **Security never depends on a URL being secret.** `/dataroom` and every API
   path under it are ordinary, guessable routes. Knowing them gets an attacker a
   401.
2. **The frontend lock is cosmetic.** Every permission is re-decided server-side
   on every request against the grant loaded from the validated session, never
   against anything the client sent.
3. **A failure is never a pass.** An unparseable eval verdict fails the lane. A
   scanner that is enabled but broken rejects the upload. A grant whose status
   cannot be confirmed active is inactive.
