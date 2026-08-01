# MyTijaara API

Laravel 12 API for the design-locked TanStack Start frontend. It owns persistence, Sanctum token authentication, RBAC, waitlist/referrals, CMS, media, analytics, email campaigns, audit logs, queues, and OpenAPI documentation.

## Local setup

1. Copy `.env.example` to `.env`, set a unique `APP_KEY`, and configure MySQL and Redis.
2. Run `composer install`, then `php artisan key:generate`.
3. Run `php artisan migrate --seed` and `php artisan storage:link`.
4. Start the API with `php artisan serve --port=8000` and the worker with `php artisan queue:work`.
5. Set `VITE_API_BASE_URL=http://localhost:8000/api/v1` in the frontend `.env.local`, then restart Vite.

The seeded active administrator is `adaeze@mytijaara.com` with password `password`. Change that password immediately outside local development.

## Containers

For an isolated MySQL 8.4 and Redis stack, copy `.env.example` to `.env`, update the credentials to match `docker-compose.yml`, then run `docker compose up --build`. The API is available at `http://localhost:8000`, its health endpoint at `/up`, and its generated OpenAPI documentation at `/docs/api`.

## Verification

Run `php artisan test`. API errors use `{ "message": string, "errors"?: object }`; successful responses use `{ "data": ... }`.
