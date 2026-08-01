# syntax=docker/dockerfile:1

# =============================================================================
# MyTijaara API — production Dockerfile (multi-stage)
# -----------------------------------------------------------------------------
# Stage 1 (vendor): install composer dependencies with the full toolchain.
# Stage 2 (runtime): slim php-fpm + nginx image, non-root, driven by
# supervisord. The same image is reused by the queue and scheduler services in
# docker-compose.yml — they just override the command.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — Composer dependencies
# -----------------------------------------------------------------------------
FROM composer:2 AS vendor

WORKDIR /app

# Copy only what composer needs first, so the dependency layer is cached
# independently of application source changes.
COPY composer.json composer.lock ./

# --no-scripts: artisan isn't present yet at this point, so skip package:discover.
RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --prefer-dist \
    --no-interaction \
    --no-progress

# Now bring in the full source and build the optimized autoloader.
COPY . .

RUN composer dump-autoload --no-dev --optimize --classmap-authoritative \
    && composer run-script post-autoload-dump || true

# -----------------------------------------------------------------------------
# Stage 2 — Runtime (php-fpm 8.2 + nginx)
# -----------------------------------------------------------------------------
FROM php:8.4-fpm-bookworm AS runtime

# --- system packages + PHP extensions ---------------------------------------
# gd            -> intervention/image (GD driver, default in v3)
# pdo_mysql     -> MySQL/MariaDB connection
# bcmath        -> precise integer math
# exif          -> image metadata for intervention
# zip, opcache  -> composer artifacts + bytecode cache
# predis/predis (composer) handles Redis in userland, so NO pecl redis ext.
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        default-mysql-client \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libzip-dev \
        libonig-dev \
        unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        gd \
        bcmath \
        exif \
        zip \
        opcache \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# --- production PHP + opcache tuning -----------------------------------------
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-app.ini

# --- nginx + supervisor + entrypoint -----------------------------------------
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

WORKDIR /var/www/html

# --- application code (vendor comes from stage 1) ----------------------------
COPY --chown=www-data:www-data . .
COPY --from=vendor --chown=www-data:www-data /app/vendor ./vendor

# Ensure the writable dirs exist and are owned by the runtime user.
RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

# nginx needs to write its pid/temp dirs as www-data.
RUN mkdir -p /var/lib/nginx /var/log/nginx /run \
    && chown -R www-data:www-data /var/lib/nginx /var/log/nginx /run

# Drop privileges. www-data ships with the php-fpm base image.
USER www-data

EXPOSE 8000

ENTRYPOINT ["entrypoint"]

# Default command: run php-fpm + nginx under supervisor. The queue and
# scheduler services override this in docker-compose.yml.
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf", "-n"]
