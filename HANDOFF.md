# MyTijaara — Frontend Handoff & Backend Integration Guide

This document is a complete engineering handoff for the **MyTijaara** project as it exists today: a fully-built marketing/waitlist landing page and an admin panel, both wired to **mock in-memory data**. It is written so another engineer (or an AI app builder) can pick it up and connect a real backend without having to reverse-engineer the codebase first.

---

**Last updated:** after the launch-countdown + frontend-hardening pass. §10 "Changelog" lists exactly what changed and where.

## 1. What this project is

- **Product**: MyTijaara — a Nigerian "super-app" concept (food, groceries, pharmacy, artisans, parcels, car rentals, vendor marketplace).
- **What's built**:
  1. A public **landing / waitlist page** at `/` with a signup form.
  2. A full **admin dashboard** at `/admin/*` (30+ pages) to manage waitlist, referrals, email campaigns, CMS content, media, users, roles, analytics, settings, etc.
  3. A **mock auth flow** at `/auth/*` (login, forgot password, reset, session expired).
- **What's NOT built**: any real backend. Every signup, every admin table, every "send campaign" button, every settings save, is powered by **hard-coded mock data in `src/lib/mock-data.ts`** and a **fake API layer in `src/lib/api/`** that just `setTimeout`s and mutates an in-memory array. Nothing persists across page reloads.

The user experience is production-quality; the data layer is a stub waiting to be replaced.

---

## 2. Technology stack

| Layer           | Choice                                                                                                                                                                        | Notes                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Framework       | **TanStack Start v1** (React 19)                                                                                                                                              | Full-stack React with SSR + file-based routing. Runs on Cloudflare Workers (workerd) in production. |
| Bundler         | **Vite 7**                                                                                                                                                                    | Config in `vite.config.ts`.                                                                         |
| Router          | **@tanstack/react-router**                                                                                                                                                    | File-based routing under `src/routes/`. `routeTree.gen.ts` is auto-generated — do not edit.         |
| Styling         | **Tailwind CSS v4**                                                                                                                                                           | Configured via `src/styles.css` using `@theme`. No `tailwind.config.js`.                            |
| UI kit          | **shadcn/ui (New York style)** + **Radix UI** primitives                                                                                                                      | Components live in `src/components/ui/`. Icons: `lucide-react`.                                     |
| Forms           | `react-hook-form` + `zod` + `@hookform/resolvers`                                                                                                                             | **In use** by the landing waitlist form. Schema: `src/lib/schemas/waitlist.ts`.                     |
| Data fetching   | **@tanstack/react-query v5** is installed and wired into the router (`QueryClient` in router context) but **not yet used** — current pages fetch imperatively in `useEffect`. |
| Charts          | **recharts**                                                                                                                                                                  | Used across admin analytics.                                                                        |
| Toasts          | **sonner**                                                                                                                                                                    | Toaster is expected to be mounted (used with `toast.success/error` throughout).                     |
| Tables/UX       | `cmdk` (command palette), `vaul` (drawers), `embla-carousel-react`, `input-otp`, `date-fns`, `react-day-picker`, `react-resizable-panels`.                                    |
| Package manager | **bun** (`bunfig.toml` present). Use `bun add <pkg>`.                                                                                                                         |
| Linting         | ESLint 9 + Prettier.                                                                                                                                                          |

**Runtime constraints (important for backend work)**: server code runs on Cloudflare workerd, not Node. No `child_process`, no `sharp`, no native binaries, no `fs.watch`. Full list in project rules — assume "Web-standard APIs + fetch + Node compat subset".

---

## 3. Repository layout

```
src/
  routes/                     # file-based routes (see §5)
    __root.tsx                # HTML shell, <head>, QueryClientProvider, error/notFound boundaries
    index.tsx                 # PUBLIC landing page (~70 lines) — composes src/components/landing/* inside <LaunchStateProvider>
    admin.tsx                 # /admin layout — mounts AdminShell (sidebar/topbar) + <Outlet/>
    admin.index.tsx           # /admin dashboard (charts, KPIs)
    admin.waitlist.tsx        # /admin/waitlist table (CRUD, filters, CSV export)
    admin.<feature>.tsx       # 30+ admin pages (see §5)
    auth.tsx                  # /auth layout (split-screen shell)
    auth.login.tsx / auth.forgot-password.tsx / auth.reset-password.tsx / auth.session-expired.tsx
  components/
    admin/
      admin-shell.tsx         # sidebar + topbar + user menu + notifications + command palette
      admin-skeleton.tsx      # loading skeleton for the shell
      command-palette.tsx     # ⌘K palette (cmdk)
      ui-bits.tsx             # PageHeader, StatCard, SectionCard, EmptyState, confirmDestructive
      admin-auth-gate.tsx     # SINGLE client auth boundary for the whole /admin subtree
    landing/                  # every landing section, one file each (nav, hero, trusted-by,
                              # moments, services, why, how, inside-the-app, built-for-nigerians,
                              # partners, waitlist-section, waitlist-form, waitlist-count, faq,
                              # footer, logo, reveal)
    launch/                   # launch/countdown system (see §5.1)
      launch-state-provider.tsx | launch-countdown.tsx | countdown-card.tsx
      launch-banner.tsx | launch-cta.tsx
    ui/                       # shadcn/ui primitives (button, input, dialog, dropdown-menu, etc.)
  lib/
    api/
      client.ts               # apiCall() — fake fetch with setTimeout + optional failRate
      waitlist.ts             # waitlistApi.list/get/create/update/remove/restore (in-memory)
      launch.ts               # launchApi.get/update — the launch/countdown CMS config
      index.ts                # barrel export
    launch/config.ts          # LaunchConfiguration type + DEFAULT_LAUNCH_CONFIG + state math
    types/index.ts            # SHARED domain types — import from here, never from mock-data
    schemas/waitlist.ts       # zod schema for the public signup (reusable server-side)
    mock-data.ts              # THE single source of mock data (users, stats, campaigns, faqs…)
    auth-mock.ts              # localStorage-backed "session" (key: mytijaara_admin_session)
    theme.ts                  # light/dark theme init
    csv.ts                    # toCsv() + downloadCsv() helpers
    utils.ts                  # cn() (clsx + tailwind-merge)
    error-page.ts             # SSR 500 HTML
    error-capture.ts          # window.onerror capture
    lovable-error-reporting.ts
  assets/                     # hero image, moment-of-day images, phone screenshots
  hooks/use-mobile.tsx
  router.tsx                  # createRouter() — QueryClient injected into context
  start.ts                    # createStart() — global error middleware
  server.ts                   # SSR entrypoint (TanStack Start)
  styles.css                  # Tailwind v4 config + design tokens (§4)
  routeTree.gen.ts            # AUTO-GENERATED — do not edit
```

---

## 4. Design system

Defined in `src/styles.css` via Tailwind v4 `@theme`. Semantic tokens (do **not** hardcode hex colors in components; use `bg-primary`, `text-foreground`, etc.):

- **Primary**: deep green `oklch(0.36 0.09 156)` (~`#0D7A46` / `#166534`) — MyTijaara brand.
- **Gold accent**: `oklch(0.78 0.13 82)` (~`#D4A017`).
- **Fonts**: Display = **Plus Jakarta Sans**, Body = **Inter** (loaded from Google Fonts via `<link>` in `__root.tsx`).
- **Radius**: base `1rem`, scaled `sm→4xl`.
- **Shadows**: `--shadow-elegant`, `--shadow-soft`, `--shadow-glow` (color-mixed from primary/gold).
- **Dark mode**: `.dark` class variant; toggled by `src/lib/theme.ts` (localStorage key).

A sweep has already replaced the old `#0D7A46` / `#D4A017` literals across the landing page, admin shell and admin routes with `bg-primary` / `text-gold` / `var(--primary)` / `var(--gold)`. Keep it that way — no new hex literals.

---

## 5. Routes (complete list)

**Public**
| Path | File | Purpose |
|---|---|---|
| `/` | `routes/index.tsx` | Landing page. Thin composition file: renders `<LaunchStateProvider>` around `Nav, Hero, TrustedBy, LaunchCountdown, Moments, Services, Why, How, InsideTheApp, BuiltForNigerians, Partners, WaitlistSection, FAQ, Footer` — each its own file in `src/components/landing/`. |

**Auth** (layout: `routes/auth.tsx`)
| Path | File |
|---|---|
| `/auth/login` | `auth.login.tsx` — accepts ANY credentials, calls `signIn()` (mock), redirects to `/admin` |
| `/auth/forgot-password` | `auth.forgot-password.tsx` |
| `/auth/reset-password` | `auth.reset-password.tsx` |
| `/auth/session-expired` | `auth.session-expired.tsx` |

**Admin** (layout: `routes/admin.tsx` → `AdminShell`; sidebar nav in `admin-shell.tsx`)
| Path | Feature |
|---|---|
| `/admin` | Dashboard: KPI cards, signup trend area chart, traffic sources pie, city breakdown, device pie, referral leaderboard |
| `/admin/analytics` | Deeper analytics (funnel, browsers, engagement) |
| `/admin/waitlist` | Waitlist table: search, filter by status/source, bulk select, CSV export, view/edit/delete dialogs, undo-toast on delete |
| `/admin/referrals`, `/admin/referrals/index`, `/admin/referrals/leaderboard`, `/admin/referrals/analytics`, `/admin/referrals/$id` | Referrals module |
| `/admin/email`, `/admin/email/index`, `/admin/email/drafts`, `/admin/email/scheduled`, `/admin/email/templates`, `/admin/email/builder`, `/admin/email/$id` | Email campaigns |
| `/admin/cms` + `/cms/launch`, `/announcement`, `/features`, `/testimonials`, `/faqs`, `/footer`, `/navigation`, `/seo`, `/social`, `/statistics`, `/index` | CMS for the landing page. **`/admin/cms/launch` is the launch & countdown control panel** — see §5.1. |
| `/admin/media` | Media library (grid, folders) |
| `/admin/users`, `/admin/users/$id` | Admin users |
| `/admin/roles`, `/admin/roles/$id` | Roles & permissions (groups defined in mock-data) |
| `/admin/notifications` | Notifications list |
| `/admin/audit-logs` | Activity log |
| `/admin/system-health` | Fake status page |
| `/admin/profile` | Current admin profile |
| `/admin/settings` + `/company`, `/branding`, `/seo`, `/social`, `/smtp`, `/integrations`, `/api-keys`, `/system`, `/index` | Settings tabs |

TanStack Start uses dot-separated filenames for nested routes (e.g. `admin.settings.smtp.tsx` = `/admin/settings/smtp`). Do **not** create `src/pages/` — that's the wrong framework's convention.

Root `__root.tsx` sets global meta/OG tags, links Google Fonts, mounts `QueryClientProvider` around `<Outlet/>`, and defines `notFoundComponent` (404 page) + `errorComponent` (retry/home fallback).

---

## 5.1 Launch / countdown system (READ THIS BEFORE TOUCHING THE LANDING PAGE)

The public site automatically transitions **pre-launch -> launch day -> post-launch with no code change**. Everything is driven by one config object.

### Files

| File                                              | Role                                                                                                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/launch/config.ts`                        | `LaunchConfiguration` type, `DEFAULT_LAUNCH_CONFIG` placeholder, `resolveLaunchStatus()`, `getTimeRemaining()`, `formatLaunchDate()`, `formatLaunchTime()` |
| `src/lib/api/launch.ts`                           | `launchApi.get()` / `launchApi.update(patch)` — **fake**, module-scoped cache. This is the file to swap.                                                   |
| `src/components/launch/launch-state-provider.tsx` | Fetches the config once, holds a 1s clock, exposes `useLaunch()`                                                                                           |
| `src/components/launch/launch-countdown.tsx`      | Pre-launch section (badge, headline, 4 cards, date line, CTAs)                                                                                             |
| `src/components/launch/countdown-card.tsx`        | One animated digit card (tabular nums, fixed width, zero layout shift)                                                                                     |
| `src/components/launch/launch-banner.tsx`         | Post-launch "We're live" banner + store buttons + once-per-session confetti                                                                                |
| `src/components/launch/launch-cta.tsx`            | `LaunchCTA` + `usePrimaryCta()` — flips nav/hero CTA between "Join the Waitlist" and "Download App"                                                        |
| `src/routes/admin.cms.launch.tsx`                 | **Admin CMS editor for all of the above**                                                                                                                  |

### The config shape (`LaunchConfiguration`)

```ts
{
  launchEnabled: boolean;        // master switch — false renders nothing, no empty space
  countdownEnabled: boolean;     // show the ticking timer
  waitlistEnabled: boolean;      // false hides the waitlist section + waitlist CTAs
  launchDateTime: string;        // ISO-8601 WITH an explicit offset, e.g. "2026-11-15T10:00:00+01:00"
  timezone: string;              // IANA zone for the human-readable date line
  badge: string; launchTitle: string; launchSubtitle: string;
  primaryCTA:   { label: string; href: string; hidden?: boolean };
  secondaryCTA: { label: string; href: string; hidden?: boolean };
  launchStatus: "auto" | "pre_launch" | "launch_day" | "post_launch";  // "auto" derives from launchDateTime
  live: {
    badge: string; title: string; subtitle: string;
    confetti: boolean;
    stores: { platform: "android" | "ios"; label: string; sublabel: string; href: string; comingSoon?: boolean }[];
  }
}
```

State math (`resolveLaunchStatus`): `now < launchDateTime` -> `pre_launch`; within 24h after -> `launch_day`; later -> `post_launch`. A non-`auto` `launchStatus` pins the state (used by admins to preview launch day early).

### Admin control panel — `/admin/cms/launch`

Every field above is editable there: visibility switches, status override, datetime + timezone (with a live "renders on site as" preview), pre-launch copy, both CTAs (label / href / visible), live copy + confetti toggle, and both app-store buttons (label / sublabel / href / coming-soon). The header strip shows the **effective state** and a live remaining-time readout. "Save configuration" calls `launchApi.update(cfg)`.

### What the backend must do

1. Create a **single-row** `launch_config` table (or a `settings` row keyed `launch`) holding the JSON above. JSONB is fine.
2. `GET /launch-config` -> `{ data: LaunchConfiguration }` — **public, unauthenticated, cacheable**. The landing page calls this on every load.
3. `PATCH /launch-config` -> `{ data: LaunchConfiguration }` — **admin only** (`has_role(auth.uid(),'admin')`).
4. Replace the two bodies in `src/lib/api/launch.ts`. Nothing else changes — the provider, the countdown, the CMS page and every CTA already consume it.
5. Validate `launchDateTime` server-side: it MUST carry an explicit offset (`+01:00` / `Z`). A bare local string breaks SSR/client agreement and causes hydration mismatch on the digits.
6. Keep the response shape byte-compatible with `DEFAULT_LAUNCH_CONFIG`; the frontend falls back to that object when the fetch fails.

---

## 6. Mock data & fake API — the parts to replace

### 6.1 `src/lib/mock-data.ts` (single file, ~250 lines)

Deterministic seeded generator + hand-written arrays exported for every admin screen. Key exports:

- `waitlistUsers` — 247 seeded users (`WaitlistUser` type: id, name, email, phone, city, state, status `active|invited|onboarded|unsubscribed`, verified, referrals, referredBy, source, device, tags, notes, joinedAt, lastActive, position).
- `dashboardStats` — totals, growth %, conversion, CTR, open/click rates.
- `signupTrend` — 30-day series (signups + verified).
- `trafficSources`, `cityBreakdown`, `deviceBreakdown`, `browserBreakdown`, `funnel`.
- `referralLeaderboard` — top 25 with rank + points.
- `campaigns`, `emailTemplates`.
- `mediaFiles` — 42 items (image/video/document).
- `activityLog`, `notifications`.
- `adminUsers`, `roles`, `permissionGroups`.
- `faqs` (and other CMS content further down the file).
- `formatNumber()` helper.

### 6.2 `src/lib/api/` — fake API client

- `client.ts` exports `apiCall<T>(endpoint, factory, opts)` which just `await sleep(300–600ms)` and returns `{ data }`. Supports `failRate` for testing error UI. Throws `ApiError` (with `status`).
- `waitlist.ts` exports `waitlistApi` with `list`, `get`, `create`, `update`, `remove(ids[])`, `restore(users[])`. Mutates a module-scoped `cache` array — **resets on page reload**.
- Only `waitlist` has been fully API-ified; **every other admin page imports directly from `mock-data.ts`** and mutates local `useState`. That's the biggest refactor debt.

### 6.3 `src/lib/auth-mock.ts`

- Session stored in `localStorage` under key `mytijaara_admin_session`.
- `signIn(email, password)` ignores inputs and returns a hard-coded "Adaeze Okafor / Super Admin" session.
- `getSession()` / `signOut()`.
- `AdminShell` calls `getSession()` in a `useEffect` and redirects to `/auth/login` if absent. **All admin routes are client-side-gated only** — no server enforcement.

### 6.4 Consumption pattern (what the backend must match)

**Landing signup form** (`src/components/landing/waitlist-form.tsx`, validated by `src/lib/schemas/waitlist.ts`):

```ts
await waitlistApi.create({
  name,
  email,
  phone,
  city,
  state,
  source: "organic",
  device: "Web",
  status: "active",
  verified: false,
  referrals: 0,
  tags: [],
});
```

**Admin waitlist** (`routes/admin.waitlist.tsx`):

```ts
waitlistApi.list().then((r) => setUsers(r.data)); // GET /waitlist
waitlistApi.update(id, patch); // PATCH /waitlist/:id
waitlistApi.remove(ids); // POST /waitlist/bulk-delete
waitlistApi.restore(users); // POST /waitlist/restore  (undo)
```

Everything is `{ data, meta? }` shaped. Preserving that envelope keeps every consumer working.

---

## 7. What a real backend needs to provide

### 7.1 Recommended stack — Laravel + MySQL

The frontend is a **TanStack Start** app that runs on Cloudflare Workers. The backend should be a **separate Laravel API service** that the frontend calls over HTTP. This is the architecture already chosen in `docs/AUDIT.md`.

| Layer             | Choice                               | Notes                                                                                                                                                                                            |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend framework | **Laravel 11+**                      | API-only mode is fine; no Blade views needed.                                                                                                                                                    |
| Database          | **MySQL 8.0+** (`utf8mb4`)           | The system of record.                                                                                                                                                                            |
| Auth              | **Laravel Sanctum** (token-based)    | Issue personal access tokens on login; frontend sends `Authorization: Bearer <token>`. Cookie-based SPA mode is discouraged here because the frontend and backend are separate origins/services. |
| Queue             | **Laravel Queue** (database/redis)   | For campaign sends, referral emails, analytics aggregation.                                                                                                                                      |
| Mail              | **Resend / Postmark / SES**          | Configure in Laravel `.env`.                                                                                                                                                                     |
| Storage           | **Laravel Storage** → S3/MinIO/local | For media library files.                                                                                                                                                                         |
| Cache             | **Redis** or database cache          | For public waitlist count, launch config, rate limits.                                                                                                                                           |
| Scheduler         | **Laravel Scheduler** + cron         | For scheduled campaigns, nightly reports.                                                                                                                                                        |

### 7.2 Service boundary

- **Frontend (this repo)**: UI, routing, form validation, charts, public landing page, admin dashboard. Reads `VITE_API_BASE_URL` at runtime.
- **Laravel backend**: validation, persistence, auth, RBAC, mail, queues, analytics SQL, CMS storage, audit logging.
- **Communication**: JSON over HTTP. CORS must allow the frontend origin. No server-to-server secrets are needed in the browser; only the public API base URL.

### 7.3 Data model (minimum viable)

Laravel migrations should create these tables. Names map to the mock-data exports in `src/lib/mock-data.ts` and the shared types in `src/lib/types/index.ts`.

1. `waitlist_users` — mirrors `WaitlistUser`. Public signups insert here; admin-only reads/updates.
2. `referrals` — `referrer_waitlist_id` → `referred_waitlist_id`, conversion tracking, points.
3. `email_campaigns` + `email_templates` — status enum `draft|scheduled|sent`.
4. `media_files` — metadata for uploads stored on S3/local disk.
5. `cms_sections` (or one table per section) — `cms_hero`, `cms_features`, `cms_testimonials`, `cms_faqs`, `cms_footer`, `cms_navigation`, `cms_seo`, `cms_social`, `cms_statistics`, `cms_announcement`. JSON columns are fine.
6. `notifications` — per-admin-user.
7. `audit_logs` — insert-only, admin-visible.
8. `settings` groups — `company`, `branding`, `seo`, `social`, `smtp`, `integrations`, `api_keys`, `system`. Key/value JSON or dedicated tables.
9. `launch_config` — single row, JSON column matching `LaunchConfiguration` (§5.1). Public read; admin write.
10. `users` (Laravel default), `roles`, `model_has_roles` — use `spatie/laravel-permission` for RBAC. Seed roles: `super_admin`, `admin`, `marketing`, `content_editor`, `analyst`, `support`.

### 7.3 API surface expected by the frontend

The frontend already expects every API module to return `Promise<{ data: T }>`. The mock layer in `src/lib/api/` has been refactored so that **setting `VITE_API_BASE_URL` switches it to real HTTP calls**; leaving it unset keeps the mocks alive. See `docs/API_CONTRACT.md` for the exact endpoint mapping.

Create Laravel API modules that match these frontend modules:

- `src/lib/api/waitlist.ts` → `WaitlistController`
- `src/lib/api/launch.ts` → `LaunchConfigController`
- (new) `src/lib/api/analytics.ts` → `AnalyticsController`
- (new) `src/lib/api/referrals.ts` → `ReferralController`
- (new) `src/lib/api/campaigns.ts` + `templates.ts` → `CampaignController`, `EmailTemplateController`
- (new) `src/lib/api/media.ts` → `MediaController`
- (new) `src/lib/api/cms.ts` → `CmsSectionController`
- (new) `src/lib/api/users.ts` + `roles.ts` → `UserController`, `RoleController`
- (new) `src/lib/api/notifications.ts` → `NotificationController`
- (new) `src/lib/api/audit.ts` → `AuditLogController`
- (new) `src/lib/api/settings.ts` → `SettingsController`

Public endpoint for landing signup MUST be reachable without auth (`POST /api/v1/waitlist`). Validate with the same Zod schema (`src/lib/schemas/waitlist.ts`), rate-limit by IP, and respect the honeypot field.

### 7.4 Analytics endpoints

The dashboard (`admin.index.tsx`) and `admin.analytics.tsx` read `dashboardStats`, `signupTrend`, `trafficSources`, `cityBreakdown`, `deviceBreakdown`, `browserBreakdown`, `funnel`. Expose `GET /api/v1/analytics/overview` returning the same shape. Compute from `waitlist_users` plus page-view events if you implement them.

### 7.5 Email

Campaign send/schedule uses Laravel Mailables + Queue. Store templates in `email_templates`, track opens/clicks via a signed webhook `POST /api/v1/webhooks/email` (verify signature). Respect unsubscribe records.

### 7.6 Media

`MediaController` handles upload validation, image optimization, folder metadata, alt text, and ordering. Store files on the configured disk and persist metadata in `media_files`.

### 7.7 Auth wiring

1. Laravel: install Sanctum, publish config, run migrations.
2. Laravel: `POST /api/v1/auth/login` returns `{ data: { token: string, user: AdminUser } }`.
3. Frontend: replace `src/lib/auth-mock.ts` so `signIn()` stores the token in `localStorage` under `mytijaara_api_token` and the user object under `mytijaara_admin_session`.
4. Frontend: `src/lib/api/client.ts` reads `mytijaara_api_token` and sends `Authorization: Bearer <token>` on admin requests.
5. Frontend: `src/components/admin/admin-auth-gate.tsx` checks the session and redirects to `/auth/login` if absent. Add a server-side `beforeLoad` redirect when real auth lands.
6. Sign-out flow: `queryClient.cancelQueries()` → `queryClient.clear()` → remove token/session → `navigate({ to: "/auth/login", replace: true })`.

### 7.8 Suggested migration order

1. Scaffold Laravel API repo, configure MySQL, Sanctum, CORS.
2. Create `waitlist_users` migration + model + `WaitlistController`.
3. Set `VITE_API_BASE_URL=http://localhost:8000/api/v1` in this frontend's `.env.local`. Verify landing signup + `/admin/waitlist` still work.
4. Add auth (`POST /auth/login`, token storage, Bearer injection).
5. Add `launch_config` table + `LaunchConfigController`; verify `/admin/cms/launch` saves and the landing page reflects changes.
6. Add analytics endpoint so the dashboard becomes real.
7. Migrate referrals, notifications, audit logs, admin users/roles UI.
8. Wire email templates + campaigns.
9. Wire media storage.
10. Wire CMS sections and settings groups.
11. Add server-side rate-limiting and remove `failRate` test hooks.

---

## 8. Conventions & gotchas

- **Never edit `src/routeTree.gen.ts`** — regenerated by the router plugin.
- **Never create `src/pages/`** or `src/routes/_app/`; TanStack Start uses file-based routing under `src/routes/`.
- **Do not @import remote CSS** from `styles.css`; fonts already loaded via `<link>` in `__root.tsx`.
- **Admin routes must set `robots: noindex`** — every existing admin route already does; keep that when adding new ones.
- **Every `createFileRoute("...")` string must match its filename exactly** (dots → slashes; `$id` for dynamic segments). Mismatch = blank page + broken build.
- **Use `<Link to="..." params={...}>`** — never string-interpolate paths in `href`.
- **Server functions**: read `process.env.X` inside `.handler()`, not at module scope. Never import `*.server.ts` from client components — the whole chain leaks into the client bundle and build protection blocks it.
- **Toaster (`<Toaster />` from `sonner`)** — code calls `toast.success/error` heavily; make sure the Toaster is mounted in `__root.tsx` when you add real auth flows (currently it may only be mounted per-page).
- **Design tokens > hex literals**. Migrate stray `#0D7A46`/`#D4A017` to `bg-primary`/`bg-gold` for dark-mode correctness as you touch each screen.
- **TanStack Query is installed but underused.** Prefer `queryOptions` + `ensureQueryData` in loaders + `useSuspenseQuery` in components going forward, instead of `useEffect + setState`.

---

## 9. TL;DR for the AI builder

> The frontend is done. Build a **separate Laravel + MySQL API** and point the frontend at it with `VITE_API_BASE_URL`. The API client in `src/lib/api/client.ts` already falls back to mocks when the URL is unset and makes real HTTP calls when it is set. Match the return shape `{ data: T }`. Preserve the `WaitlistUser` type and every consumer keeps working. Start with the waitlist table + signup endpoint, then auth, then `launch_config`, then analytics, then CMS, then everything else. Do not restructure routes. Do not touch `routeTree.gen.ts`. Keep semantic Tailwind tokens. Every admin route is `noindex`. Public signup must work without auth; every other endpoint must be role-gated via Sanctum + `spatie/laravel-permission`.

---

## 10. Changelog — frontend hardening pass (what changed since the first handoff)

**Added**

- `src/lib/types/index.ts` — shared domain types (`WaitlistUser`, `DashboardStats`, `Campaign`, `ApiResponse<T>`, …). Import domain types from here, never from `mock-data.ts`.
- `src/lib/schemas/waitlist.ts` — zod schema for public signup (honeypot field, consent checkbox, Nigerian city/state enums). Reuse it server-side so client and server validate identically.
- `src/components/landing/waitlist-form.tsx` — rewritten with `react-hook-form` + zod: inline errors, `aria-invalid`, labels, autocomplete, honeypot, consent, `?ref=` referral capture, success state showing queue position, `sonner` error toasts.
- `src/components/landing/waitlist-count.tsx` — live counter reading `waitlistApi.list()`.
- Full launch/countdown system — see §5.1.
- `src/routes/admin.cms.launch.tsx` — admin CMS page for the launch config, registered as a tab in `src/routes/admin.cms.tsx`.
- `src/components/admin/admin-auth-gate.tsx` — one auth boundary wrapping the whole `/admin` subtree, mounted in `src/routes/admin.tsx`. **Backend: swap `getSession()` here for a real session check and add a server-side `beforeLoad` redirect — one file, no per-route edits.**

**Changed**

- `src/routes/index.tsx` went from ~1400 lines to ~70. Every section now lives in `src/components/landing/*`.
- Hex literals (`#0D7A46`, `#D4A017`, `bg-white`, `#F8FAF8`) swept out of the landing page, admin shell and 40+ admin routes in favour of semantic tokens (`bg-primary`, `text-gold`, `bg-card`, `bg-surface`, `var(--primary)`).
- `styles.css` gained `@keyframes digit-in` / float animations used by the countdown.
- `<Toaster />` is mounted in `src/routes/__root.tsx`.

**Deliberately NOT done (left for the backend agent, on purpose)**

- `useSuspenseQuery` / `queryOptions` conversion of `admin.index.tsx` and `admin.waitlist.tsx`. Designing cache keys and invalidation against an in-memory mock bakes in the wrong ones — do it in the same commit that swaps the data source.
- Migrating admin routes into a `_authenticated/` directory. The single `AdminAuthGate` is functionally equivalent today; move to `_authenticated/` when real Supabase auth lands so the gate runs in `beforeLoad` server-side.
- Every admin page other than `/admin/waitlist` and `/admin/cms/launch` still imports straight from `mock-data.ts`. That is the bulk of the remaining work.

---

## 11. Laravel-specific notes for the backend agent

### Why Laravel is separate

This repo is a TanStack Start frontend. Do **not** put Laravel inside `src/`, do not add PHP files here, and do not try to serve the React app from Laravel. The two services communicate over HTTP.

### CORS

Laravel must allow the frontend origin. In `config/cors.php`:

- `'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:8080')]`
- `'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With']`
- `'supports_credentials' => false` (we are using token auth, not cookies)

### Auth flow

1. `POST /api/v1/auth/login` validates email/password and returns a Sanctum personal access token.
2. Frontend stores `mytijaara_api_token` in `localStorage` (or move to httpOnly cookie later).
3. `src/lib/api/client.ts` injects the token as `Authorization: Bearer <token>`.
4. Laravel `auth:sanctum` middleware protects admin routes.
5. Use `spatie/laravel-permission` to check roles inside controllers: `$user->hasRole('admin')` etc.

### Response envelope

Every successful response should be wrapped as `{ data: T, meta?: object }`. Errors return `{ message: string, errors?: Record<string, string[]> }` with the appropriate 4xx/5xx status. The frontend `ApiError` reads `message` and `status`.

### Validation

Reuse `src/lib/schemas/waitlist.ts` for the public signup. You can port it to a Laravel Form Request or replicate the rules manually. Key rules: name ≥ 2 chars, valid email, Nigerian city/state from the allowed enums, consent checkbox true, honeypot field must be empty.

### Rate limiting

Apply `throttle` middleware to public signup and login routes by IP. Suggested: 5 attempts per minute for login, 10 signups per hour per IP.

### Public vs private endpoints

- **Public** (no token): `GET /launch-config`, `POST /waitlist`, `GET /waitlist/count`.
- **Private** (token + role): everything under `/admin/*` and CMS mutations.

### Keeping the frontend preview alive

If `VITE_API_BASE_URL` is unset, the frontend continues to use mocks. This lets you develop Laravel endpoints one at a time without breaking the preview.
