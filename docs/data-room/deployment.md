# Deployment

## Environment variables

All server-side. None of these belongs in a frontend bundle, and none is committed.

| Variable | Default | Notes |
| --- | --- | --- |
| `DATA_ROOM_ENABLED` | `true` | false takes the room offline entirely. `GET /dataroom/gate` still answers, with `open: false` |
| `DATA_ROOM_MASTER_PIN_HASH` | unset | bcrypt hash of the optional global PIN. Wins over the settings row |
| `DATA_ROOM_SESSION_TTL` | `480` | absolute session lifetime, minutes |
| `DATA_ROOM_IDLE_TIMEOUT` | `30` | idle timeout, minutes. This is a ceiling the settings row may lower |
| `DATA_ROOM_MAX_FAILED_ATTEMPTS` | `5` | per throttle key |
| `DATA_ROOM_LOCKOUT_SECONDS` | `900` | floor of 60 is enforced in code |
| `DATA_ROOM_STORAGE_DISK` | `dataroom` | |
| `DATA_ROOM_STORAGE_ROOT` | `storage/app/dataroom` | read by `config/filesystems.php` |
| `DATA_ROOM_WATERMARK_ENABLED` | `true` | ANDed with the settings row |
| `DATA_ROOM_MAX_UPLOAD_KB` | `51200` | 50 MB |
| `DATA_ROOM_AV_ENABLED` | `false` | see [known-limitations.md](known-limitations.md#1-no-malware-scanning-is-provisioned) |
| `DATA_ROOM_CLAMSCAN_PATH` | `/usr/bin/clamscan` | |
| `DATA_ROOM_AV_TIMEOUT` | `60` | seconds |

Minimum viable production block:

```
DATA_ROOM_ENABLED=true
DATA_ROOM_STORAGE_ROOT=/var/www/mytijaara/storage/app/dataroom
DATA_ROOM_SESSION_TTL=480
DATA_ROOM_IDLE_TIMEOUT=30
```

Everything else has a safe default. Adding the PIN and the scanner are the two
deliberate hardening steps.

## Deploy sequence

```bash
cd backend && composer install --no-dev --optimize-autoloader
```

```bash
cd backend && php artisan migrate
```

Before that, on a database you cannot afford to half-build, check what MySQL is
about to be asked to do without asking it:

```bash
cd backend && php artisan migrate --pretend
```

`MigrationMysqlCompatibilityTest` already asserts offline that no emitted
identifier exceeds 64 characters, that no `NOT NULL TIMESTAMP` lacks a default,
and that no `dataroom_*` index key exceeds 767 bytes, which are the three
failures that reached the first production runs. `--pretend` against the real
instance is the second layer for the failure classes a static read of the DDL
cannot see. See
[known-limitations.md](known-limitations.md#14-the-gate-suite-runs-on-sqlite-production-runs-on-mysql).

### If `migrate` fails part-way

MySQL DDL is not transactional, so a migration that dies mid-way leaves the
tables it already created in place and is never recorded in the `migrations`
table. Do not drop anything and do not edit the `migrations` table by hand. Pull
the fix and re-run:

```bash
cd backend && php artisan migrate --force
```

Every `Schema::create` in `2026_08_27_000001_create_dataroom_tables` is guarded
by `Schema::hasTable`, and the two junction uniques are re-checked after the
creates, so the second run finishes the tables the first run did not reach and is
a no-op on the ones it did.

`2026_08_28_000001_narrow_dataroom_indexed_columns` then repairs a database that
was already built by the earlier wide column definitions. It shrinks `slug`,
`visitor_email`, `name`, `action` and `target_type`, adds the three
`dataroom_audit_logs` indexes that the 1071 failure prevented, and drops the
superseded `nullableMorphs` index where it did land. MySQL only, idempotent, and
it aborts with a readable message naming the row rather than truncating one.
Verify:

```bash
cd backend && php artisan migrate:status | grep dataroom
```

Expect `Ran` twice. Then confirm all eleven tables exist:

```bash
cd backend && php artisan tinker --execute="echo count(DB::select('show tables like \"dataroom%\"'));"
```

Expect `11`.

```bash
cd backend && php artisan db:seed --class=DataRoomSeeder
```

```bash
cd backend && php artisan db:seed --class=RoleSeeder
```

The `RoleSeeder` run is what grants the seven `data-room.*` permissions to
`super_admin` (all 49) and `admin` (37, without `manage-settings` and `delete`).
Skipping it leaves every admin data room route 403 for everyone.

Both seeders are idempotent. Re-running them will not duplicate folders,
templates, roles or permissions.

Then the caches:

```bash
cd backend && php artisan config:cache && php artisan route:cache
```

Any change to a `DATA_ROOM_*` value requires `config:cache` again, or the old
value stays live.

## Frontend build

```bash
pnpm install && pnpm build
```

`package.json` pins `@tanstack/router-core` to `1.171.16` as a direct
dependency even though no source file imports it. Do not remove it. Under
pnpm's default strict layout only direct dependencies get a link in the top
level of `node_modules`, and the SSR chunk that nitro generates imports
`@tanstack/router-core/ssr/server` by bare specifier. Without the link that
specifier resolves to a path that does not exist and rolldown fails the build
with `[MISSING_EXPORT] "disposeSsrResponseDetached" is not exported by
"../../../node_modules/@tanstack/router-core/dist/esm/ssr/server.js"`, plus the
same for `waitForRequest`. The exports are present in the package; the file the
bundler was pointed at is not.

The version is exact rather than a range because it has to match what
`@tanstack/start-server-core` resolves for itself. That package declares
`"@tanstack/router-core": "1.171.16"` with no range. A caret here would let a
later install float the top-level copy to a different version than the one
nitro's chunk was built against, which puts the same failure back.

## Storage directory

```bash
mkdir -p backend/storage/app/dataroom/quarantine backend/storage/app/dataroom/documents
```

The web user needs read and write on both. `quarantine/` must be on the same
filesystem as `documents/` so the promote step is a rename rather than a copy.

**Never run `php artisan storage:link` against this disk.** A symlink into
`public/` would recreate exactly the `/public/uploads/financial-model.xlsx`
exposure the design exists to prevent. Verify after any deploy:

```bash
ls -la backend/public | grep -i dataroom
```

That should print nothing.

## Web server

Deny direct access to `storage/` at the server level as a second layer. The disk
is already outside the document root, so this is belt and braces.

nginx:

```nginx
location ~ ^/storage/ { deny all; return 404; }
```

Apache, in `backend/storage/.htaccess`:

```apache
Require all denied
```

## Optional global PIN

```bash
cd backend && php artisan dataroom:hash-pin
```

Prompts twice, minimum 6 characters, prints the bcrypt hash. Paste it into
`DATA_ROOM_MASTER_PIN_HASH`. The `--pin=` flag exists but lands the PIN in shell
history; use the prompt.

The PIN is a barrier, not a factor. Everyone admitted shares it, so it proves
nothing about who is knocking. It exists to shut the room behind one value during
a sensitive window.

## Optional malware scanning

```bash
sudo apt-get install clamav clamav-daemon
```

```bash
sudo freshclam
```

Then set `DATA_ROOM_AV_ENABLED=true` and `DATA_ROOM_CLAMSCAN_PATH=/usr/bin/clamscan`
and re-run `config:cache`. No code change. Verify with a known-clean PDF upload and
check `meta.malwareScanned` in the response reads `true`.

Both `apt-get` lines need root. They are for the operator to run.

## Cache driver

Rate limiting uses the cache. On a single server `CACHE_STORE=file` works. Behind
more than one PHP process or more than one host, move to a shared store or the
counters fragment and the effective attempt ceiling multiplies by the number of
processes:

```
CACHE_STORE=redis
```

Recorded in [known-limitations.md](known-limitations.md#8-rate-limiting-is-per-process-cache-per-ip).

## Behind a proxy

`RateLimiter` keys on the request IP. Behind Cloudflare or a load balancer,
configure `TrustProxies` or every visitor collapses onto one key and one attacker
locks out every investor. Verify by checking that two different clients produce
two different `dataroom:auth:ip:*` keys.

## HTTPS

Non-negotiable in production. Session tokens travel in the `Authorization` header;
over plain HTTP they are readable in transit. Redirect all HTTP to HTTPS at the
edge and enable HSTS.

## Verification after deploy

```bash
cd backend && vendor/bin/phpunit --filter DataRoom
```

Then, against the live host:

```bash
curl -s https://<host>/api/v1/dataroom/gate
```

Expect exactly three fields: `open`, `pinRequired`, `message`. Anything more is a
regression.

```bash
curl -si https://<host>/api/v1/dataroom/dashboard | grep -i x-robots-tag
```

Expect `noindex, nofollow, noarchive`, alongside a 401 for the missing token.

## What to restart

| Change | Restart |
| --- | --- |
| `.env` or config | `php artisan config:cache`, then reload PHP-FPM |
| Routes | `php artisan route:cache` |
| Migrations | nothing |
| Frontend | rebuild and redeploy the static bundle |

PHP-FPM reload needs root; it is the operator's to run:

```bash
sudo systemctl reload php8.3-fpm
```

## Rollback

The create migration's `down()` drops all eleven tables in reverse dependency
order and touches no pre-existing table. The repair migration's `down()` is a
deliberate no-op, since there is no useful state to return to: widening the
columns recreates the key-length failure, and the indexes it adds belong to the
create migration. So rolling the data room back means rolling both back:

```bash
cd backend && php artisan migrate:rollback --step=2
```

That destroys every grant, session and audit row. Bytes under
`storage/app/dataroom` survive, orphaned. Take the backup in
[backup-and-recovery.md](backup-and-recovery.md) first.

To take the room offline without dropping anything, set `DATA_ROOM_ENABLED=false`
and re-cache config. Reversible, instant, keeps the data.
