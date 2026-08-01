#!/usr/bin/env sh
# =============================================================================
# MyTijaara API — container entrypoint
# -----------------------------------------------------------------------------
# 1. Wait for MySQL to accept connections.
# 2. (app role only) run migrations + storage:link.
# 3. Cache config / routes / views (env is present at runtime, so cache here,
#    not at build — build-time env would bake in wrong values).
# 4. exec the container command (supervisor for app, artisan for queue/scheduler).
#
# Role is controlled by CONTAINER_ROLE:
#   app        -> migrate + storage:link + full caches   (default)
#   queue      -> caches only
#   scheduler  -> caches only
# =============================================================================
set -e

CONTAINER_ROLE="${CONTAINER_ROLE:-app}"

# --- 1. wait for the database ------------------------------------------------
: "${DB_HOST:=mysql}"
: "${DB_PORT:=3306}"

echo "[entrypoint] waiting for MySQL at ${DB_HOST}:${DB_PORT} ..."
i=0
until mysqladmin ping -h"${DB_HOST}" -P"${DB_PORT}" --silent 2>/dev/null; do
    i=$((i + 1))
    if [ "$i" -ge 60 ]; then
        echo "[entrypoint] MySQL did not become ready in time" >&2
        exit 1
    fi
    sleep 2
done
echo "[entrypoint] MySQL is up."

# --- 2. migrations (app role only, one runner avoids races) ------------------
if [ "$CONTAINER_ROLE" = "app" ]; then
    echo "[entrypoint] running migrations ..."
    php artisan migrate --force --no-interaction

    # Public symlink for the media library (storage/app/public -> public/storage).
    php artisan storage:link || true
fi

# --- 3. cache config / routes / views ----------------------------------------
echo "[entrypoint] caching config, routes, views ..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "[entrypoint] starting: $*"

# --- 4. hand off to the container command ------------------------------------
exec "$@"
