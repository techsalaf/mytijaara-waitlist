# Backup and recovery

## The database and the disk are one unit

Eleven `dataroom_*` tables and `storage/app/dataroom` describe the same objects
from two sides. `dataroom_documents.file_path` points at bytes; the bytes carry no
metadata. Back up either alone and the restore is broken:

- Database only: rows whose `file_path` points at nothing. Every preview and
  download 404s.
- Files only: bytes nothing references. Invisible to the application, undeletable
  through it.

Take them together, and take them close enough in time that no upload lands
between the two.

## What to back up

| Item | Why |
| --- | --- |
| `dataroom_*` tables | grants, sessions, audit trail, analytics, scope |
| `storage/app/dataroom/documents/` | every current and historical version |
| `.env` `DATA_ROOM_*` block | the PIN hash. Without it the room may be unopenable |
| `roles` / `permissions` / pivots | the seven `data-room.*` grants. Reseedable, but faster to restore |

`storage/app/dataroom/quarantine/` is transient. Files there are mid-pipeline and
should not exist at rest. Do not back it up; a non-empty quarantine directory at
backup time is a signal to check for a crashed upload, not something to preserve.

## Backup

Database, data room tables only:

```bash
mysqldump -u root mytijaara $(mysql -u root -N -e "SELECT table_name FROM information_schema.tables WHERE table_schema='mytijaara' AND table_name LIKE 'dataroom_%'") > /tmp/dataroom-db-$(date +%F-%H%M).sql
```

Files:

```bash
tar -czf /tmp/dataroom-files-$(date +%F-%H%M).tar.gz -C backend/storage/app dataroom/documents
```

Checksum manifest, which is what makes the restore verifiable:

```bash
cd backend && php artisan tinker --execute="foreach (App\Models\DataRoomDocument::withTrashed()->get() as \$d) { echo \$d->checksum.'  '.\$d->file_path.PHP_EOL; }" > /tmp/dataroom-manifest-$(date +%F).txt
```

Store the three together. They are useless apart.

## Encryption

The dump and the tarball contain the entire confidential corpus in plaintext. Both
must be encrypted at rest:

```bash
gpg --symmetric --cipher-algo AES256 /tmp/dataroom-db-2026-08-27-1400.sql
```

Then delete the unencrypted originals. An unencrypted backup of this data on a
laptop or in object storage is a worse exposure than anything the access control
layer defends against, because it bypasses all of it.

## Restore

1. Stop new writes:

```bash
cd backend && php artisan down
```

2. Restore the bytes:

```bash
tar -xzf /tmp/dataroom-files-2026-08-27-1400.tar.gz -C backend/storage/app
```

3. Restore the rows:

```bash
mysql -u root mytijaara < /tmp/dataroom-db-2026-08-27-1400.sql
```

4. Verify every checksum before letting anyone in:

```bash
cd backend && php artisan tinker --execute="\$bad=0; foreach (App\Models\DataRoomDocument::withTrashed()->get() as \$d) { \$p = Storage::disk('dataroom')->path(\$d->file_path); if (! is_file(\$p) || hash_file('sha256', \$p) !== \$d->checksum) { \$bad++; echo 'MISMATCH '.\$d->uuid.' '.\$d->file_path.PHP_EOL; } } echo \$bad === 0 ? 'ALL OK'.PHP_EOL : \$bad.' BAD'.PHP_EOL;"
```

`ALL OK` means the restore is byte-exact. Any mismatch means that document is
corrupt or missing and must be re-uploaded as a new version; do not open the room
with a known mismatch, because an investor downloading a truncated financial model
is worse than one who sees "not available".

5. Bring it back:

```bash
cd backend && php artisan up
```

## Sessions after a restore

`dataroom_sessions` rows restored from an older dump may reference tokens that no
longer exist in any browser, and rows for sessions issued after the dump are gone.
Neither is dangerous, but the clean move is to clear the table so every visitor
re-authenticates:

```bash
cd backend && php artisan tinker --execute="App\Models\DataRoomSession::truncate();"
```

Grants are untouched by that. Every investor's email and code still work.

## Point-in-time considerations

The audit log is the record that matters most for a restore, because it is the only
answer to "who saw what". A restore from an old dump silently loses audit rows for
the window between the dump and the incident, which is exactly the window anyone
would want to inspect. If the platform supports binlog or WAL shipping, use it for
these tables specifically.

## Deletion semantics that affect recovery

| Operation | Recoverable from? |
| --- | --- |
| Document soft delete | the database. `withTrashed()` finds it, `restore` returns it. Bytes never left |
| Document purge (`?purge=1`) | backup only. Bytes are deleted from disk and the version rows cascade |
| Grant soft delete | the database |
| Grant hard delete | backup only. Sessions, pivots and view rows cascade; audit rows survive with `visitor_email` |
| New version upload | nothing needed. Prior bytes stay; the version row still points at them |

Versioning is additive on purpose, so a bad upload is a repoint rather than a
restore.

## Retention

Disk grows monotonically: every version ever uploaded stays until an explicit
purge. Budget for that. `dataroom_sessions` also accumulates rows for sessions
nobody returns to, since expiry is derived rather than swept
([known-limitations.md](known-limitations.md#7-expiry-is-derived-not-swept)). A
periodic `delete from dataroom_sessions where absolute_expires_at < now()` is safe
at any time; those rows are already dead to the middleware.

Never delete audit rows without a written retention decision. They are the only
forensic record of who reached which document.

## Not automated

There is no scheduled backup job in this branch. The commands above are correct and
tested; nothing runs them on a timer. Wiring them into cron with off-host encrypted
storage is the remaining operational step, recorded in
[known-limitations.md](known-limitations.md#12-deployment-gaps).
