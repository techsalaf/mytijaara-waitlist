# MyTijaara — Frontend ↔ Laravel API Contract

This document is the concrete contract between the **TanStack Start frontend** (this repo) and the **Laravel + MySQL backend**. The frontend's `src/lib/api/client.ts` is already wired to call these endpoints when `VITE_API_BASE_URL` is set; when unset, it falls back to mocks.

---

## 1. Base URL & conventions

- Base URL (no trailing slash): `VITE_API_BASE_URL` in the frontend, e.g. `http://localhost:8000/api/v1`.
- All routes below are relative to that base URL.
- Request body: `Content-Type: application/json`.
- Success envelope: `{ data: T, meta?: object }`.
- Error envelope: `{ message: string, errors?: Record<string, string[]> }` with 4xx/5xx status.
- Auth header for protected routes: `Authorization: Bearer <token>` where `<token>` is a Laravel Sanctum personal access token stored in `localStorage` under `mytijaara_api_token`.

---

## 2. Auth

| Frontend | Method | Endpoint | Body | Response |
|---|---|---|---|---|
| `auth-mock.signIn(email, password)` | `POST` | `/auth/login` | `{ email, password }` | `{ data: { token: string, user: AdminUser } }` |
| `auth-mock.signOut()` (client only) | — | — | — | removes token from storage |
| `GET /auth/me` | `GET` | `/auth/me` | — | `{ data: AdminUser }` |

Notes:
- Laravel should use Sanctum token-based auth (not cookie SPA mode).
- Login route should be rate-limited by IP.
- Token is sent on every admin request by `src/lib/api/client.ts`.

---

## 3. Waitlist

Maps to `src/lib/api/waitlist.ts`.

| Frontend | Method | Endpoint | Body / Params | Response |
|---|---|---|---|---|
| `waitlistApi.list()` | `GET` | `/waitlist` | `?search=&status=&source=&page=` | `{ data: WaitlistUser[], meta: { total, current_page, last_page } }` |
| `waitlistApi.get(id)` | `GET` | `/waitlist/:id` | — | `{ data: WaitlistUser \| null }` |
| `waitlistApi.create(payload)` | `POST` | `/waitlist` | signup payload (see schema) | `{ data: WaitlistUser }` |
| `waitlistApi.update(id, patch)` | `PATCH` | `/waitlist/:id` | partial WaitlistUser | `{ data: WaitlistUser }` |
| `waitlistApi.remove(ids[])` | `POST` | `/waitlist/bulk-delete` | `{ ids: string[] }` | `{ data: { removed: WaitlistUser[] } }` |
| `waitlistApi.restore(users[])` | `POST` | `/waitlist/restore` | `{ users: WaitlistUser[] }` | `{ data: { restored: number } }` |
| `waitlistApi.count()` (used by waitlist-count) | `GET` | `/waitlist/count` | — | `{ data: { total: number } }` |

Signup payload shape (matches `src/lib/schemas/waitlist.ts`):
```json
{
  "name": "string",
  "email": "string",
  "phone": "string?",
  "city": "string (Nigerian city enum)",
  "state": "string (Nigerian state enum)",
  "source": "organic | referral | instagram | twitter | facebook | tiktok | google",
  "device": "iOS | Android | Web",
  "status": "active",
  "verified": false,
  "referrals": 0,
  "tags": [],
  "referralCode": "string?",
  "consent": true,
  "website": ""   // honeypot — must be empty
}
```

Notes:
- `POST /waitlist` is **public** (no token).
- All other waitlist routes are **admin-only**.
- Duplicate email protection: return `422` with `errors.email`.
- If `referralCode` is present, link the new signup to the referrer and increment their referral count.

---

## 4. Launch config

Maps to `src/lib/api/launch.ts`.

| Frontend | Method | Endpoint | Body | Response |
|---|---|---|---|---|
| `launchApi.get()` | `GET` | `/launch-config` | — | `{ data: LaunchConfiguration }` |
| `launchApi.update(patch)` | `PATCH` | `/launch-config` | partial `LaunchConfiguration` | `{ data: LaunchConfiguration }` |

`GET /launch-config` is **public** and should be cacheable (short TTL). `PATCH /launch-config` is **admin-only**.

The exact JSON shape is documented in `HANDOFF.md` §5.1 and `src/lib/launch/config.ts`.

---

## 5. Analytics

Maps to a new `src/lib/api/analytics.ts` that the backend agent will create.

| Frontend | Method | Endpoint | Response |
|---|---|---|---|
| dashboard stats | `GET` | `/analytics/overview` | `{ data: DashboardStats }` |
| signup trend | `GET` | `/analytics/trends?days=30` | `{ data: SignupTrendPoint[] }` |
| traffic sources | `GET` | `/analytics/traffic-sources` | `{ data: TrafficSource[] }` |
| city breakdown | `GET` | `/analytics/cities` | `{ data: CityBreakdown[] }` |
| device breakdown | `GET` | `/analytics/devices` | `{ data: DeviceBreakdown[] }` |
| browser breakdown | `GET` | `/analytics/browsers` | `{ data: BrowserBreakdown[] }` |
| funnel | `GET` | `/analytics/funnel` | `{ data: FunnelStep[] }` |

All analytics routes are **admin-only**. Compute from `waitlist_users` and page-view events if implemented.

---

## 6. Referrals

Maps to a new `src/lib/api/referrals.ts`.

| Frontend | Method | Endpoint | Response |
|---|---|---|---|
| leaderboard | `GET` | `/referrals/leaderboard?limit=25` | `{ data: ReferralLeaderboardEntry[] }` |
| referral detail | `GET` | `/referrals/:id` | `{ data: WaitlistUser & { referrals: Referral[] } }` |
| analytics | `GET` | `/referrals/analytics` | `{ data: object }` |

---

## 7. Email campaigns

Maps to new `src/lib/api/campaigns.ts` and `templates.ts`.

| Frontend | Method | Endpoint | Body | Response |
|---|---|---|---|---|
| list campaigns | `GET` | `/campaigns` | — | `{ data: Campaign[] }` |
| get campaign | `GET` | `/campaigns/:id` | — | `{ data: Campaign }` |
| create campaign | `POST` | `/campaigns` | campaign fields | `{ data: Campaign }` |
| update campaign | `PATCH` | `/campaigns/:id` | partial campaign | `{ data: Campaign }` |
| send/schedule | `POST` | `/campaigns/:id/send` | `{ scheduledAt?: string }` | `{ data: Campaign }` |
| list templates | `GET` | `/email-templates` | — | `{ data: EmailTemplate[] }` |
| get template | `GET` | `/email-templates/:id` | — | `{ data: EmailTemplate }` |
| update template | `PATCH` | `/email-templates/:id` | partial template | `{ data: EmailTemplate }` |

Webhook (public, signature-verified):
- `POST /webhooks/email` — handles open/click/bounce events from the email provider.

---

## 8. Media

Maps to a new `src/lib/api/media.ts`.

| Frontend | Method | Endpoint | Body | Response |
|---|---|---|---|---|
| list | `GET` | `/media?folder=&type=` | — | `{ data: MediaFile[] }` |
| upload | `POST` | `/media` | `multipart/form-data` | `{ data: MediaFile }` |
| delete | `DELETE` | `/media/:id` | — | `{ data: { deleted: true } }` |
| update metadata | `PATCH` | `/media/:id` | `{ name, alt, folder }` | `{ data: MediaFile }` |

---

## 9. CMS sections

Maps to a new `src/lib/api/cms.ts`. Each landing section has a key. The admin pages under `/admin/cms/*` edit these.

| Frontend | Method | Endpoint | Body | Response |
|---|---|---|---|---|
| get all sections | `GET` | `/cms` | — | `{ data: Record<string, object> }` |
| get section | `GET` | `/cms/:section` | — | `{ data: object }` |
| update section | `PATCH` | `/cms/:section` | section JSON | `{ data: object }` |

Sections: `hero`, `services`, `why`, `how`, `inside_the_app`, `built_for_nigerians`, `partners`, `testimonials`, `faqs`, `footer`, `navigation`, `seo`, `social`, `statistics`, `announcement`.

---

## 10. Admin users & roles

| Frontend | Method | Endpoint | Body | Response |
|---|---|---|---|---|
| list users | `GET` | `/admin/users` | — | `{ data: AdminUser[] }` |
| get user | `GET` | `/admin/users/:id` | — | `{ data: AdminUser }` |
| update user | `PATCH` | `/admin/users/:id` | partial user | `{ data: AdminUser }` |
| list roles | `GET` | `/admin/roles` | — | `{ data: Role[] }` |
| update role | `PATCH` | `/admin/roles/:id` | partial role | `{ data: Role }` |

Use `spatie/laravel-permission` for roles/permissions.

---

## 11. Notifications & audit logs

| Frontend | Method | Endpoint | Response |
|---|---|---|---|
| notifications | `GET` | `/notifications` | `{ data: Notification[] }` |
| mark read | `POST` | `/notifications/:id/read` | `{ data: Notification }` |
| audit logs | `GET` | `/audit-logs` | `{ data: ActivityLogEntry[] }` |

---

## 12. Settings

| Frontend | Method | Endpoint | Body | Response |
|---|---|---|---|---|
| get settings group | `GET` | `/settings/:group` | — | `{ data: object }` |
| update settings group | `PATCH` | `/settings/:group` | group JSON | `{ data: object }` |

Groups: `company`, `branding`, `seo`, `social`, `smtp`, `integrations`, `api_keys`, `system`.

---

## 13. Testing the contract

1. Start Laravel on `http://localhost:8000` with the routes above.
2. In this frontend, create `.env.local` with `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
3. Restart the Vite dev server.
4. Submit the landing waitlist form — it should hit `POST /api/v1/waitlist`.
5. Log in at `/auth/login` — it should hit `POST /api/v1/auth/login` and store the token.
6. Visit `/admin/waitlist` — it should hit `GET /api/v1/waitlist` with the Bearer token.

If the backend URL is unset, the frontend keeps using mocks and the preview remains functional.
