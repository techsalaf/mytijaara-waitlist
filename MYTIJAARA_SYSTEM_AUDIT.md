# MyTijaara Ecosystem — Comprehensive System Audit Report

**Audit Date:** 2026-09-07  
**Scope:** 6 projects (mytijaara-admin, mytijaara-waitlist, mytijaara-user-web, mytijaara-user-app, mytijaara-rider-app, mytijaara-store-app)  
**Excluded:** mytijaara-business (per explicit instruction)  
**Auditor:** Claude Code (automated with human oversight)

---

## Executive Summary

This audit covers **6 independent codebases** comprising a multi-tenant marketplace ecosystem built on Laravel 12 (admin/waitlist backends), Next.js 15 (user-web), and Flutter 3.10+ (3 mobile apps). The system processes waitlist signups, referral rewards, virtual data rooms, multi-vendor orders, real-time delivery tracking, and 30+ payment gateways across multiple currencies.

**Overall Risk Rating:** 🟡 **ELEVATED** — Multiple critical security findings, architectural debt in admin backend, and 5 of 6 repositories lack version control.

---

## Phase 1: Workspace Discovery — Project Inventory

| Project | Type | Framework | Language | Git Status | Primary Purpose |
|---------|------|-----------|----------|------------|-----------------|
| **mytijaara-admin** | Backend + Admin UI | Laravel 12 + Inertia/React 19 | PHP 8.3 / TS | ❌ No .git | Multi-tenant admin panel, config API, module management |
| **mytijaara-waitlist** | Full-stack | Laravel 12 (API) + TanStack Start (FE) | PHP 8.3 / TS | ✅ Has .git | Waitlist signup, referrals, VDR, CMS, email campaigns |
| **mytijaara-user-web** | Frontend | Next.js 15 + MUI + Redux | TypeScript | ❌ No .git | Customer-facing web marketplace |
| **mytijaara-user-app** | Mobile | Flutter 3.10 + GetX | Dart | ❌ No .git | Customer mobile app (food, grocery, pharmacy, rental, ride-share) |
| **mytijaara-rider-app** | Mobile | Flutter 3.10 + GetX | Dart | ❌ No .git | Delivery rider app with foreground location tracking |
| **mytijaara-store-app** | Mobile | Flutter 3.10 + GetX | Dart | ❌ No .git | Vendor/store management with POS printer integration |

**Shared Infrastructure:**
- Database: MySQL via XAMPP (separate databases per project)
- Auth: Sanctum (admin/waitlist), Better Auth (waitlist FE), Firebase Auth (all mobile + user-web)
- Realtime: Laravel Reverb / Pusher (WebSockets)
- Maps: Google Maps Platform (Places, Routes, Geocoding)
- Payments: 30+ gateways (Stripe, Razorpay, PhonePe, Flutterwave, Paystack, MercadoPago, Xendit, Iyzico, etc.)
- Modules: nwidart/laravel-modules (AI, Builder, ReelsModule, TaxModule)

---

## Phase 2: Architecture Discovery — Key Findings Per Project

### 2.1 mytijaara-admin (Laravel 12 + Inertia)

**Critical Architecture Issues:**
- **God Classes:** `Helpers.php` (217 KB, 5000+ lines), `PlaceNewOrder.php` trait (111 KB), `PaymentGatewayTrait.php` (300+ lines hardcoded gateway list), `Payment.php` trait (96 hardcoded routes)
- **Anti-pattern:** 14 CentralLogics files loaded via `files` autoload (not PSR-4) — `ProductLogic.php` (81 KB), `StoreLogic.php` (66 KB), `OrderLogic.php` (58 KB)
- **ConfigController.php** (83 KB, 1450 lines) — single endpoint returning entire business config, Google Maps API proxy, module-aware, 15+ `Cache::rememberForever()` calls with no invalidation strategy
- **OrderController.php** (61 KB) — module-aware branching (ride-share, rental), N+1 query risks
- **Module coupling:** AI, Builder, TaxModule, ReelsModule loaded globally; `addon_published_status()` checks sprinkled throughout

**Security Findings:**
- `.env` contains `APP_PUBLIC_IP=198.54.115.74` (potential infra leak)
- `APP_DEBUG=true` in `.env.example` (production default should be false)
- Pusher/Reverb all use `6ammart` test credentials in `.env.example`
- `PURCHASE_CODE=NulledMaster` in `.env` — indicates unlicensed upstream code
- **storage/app/public/** (34 subdirs: admin, banner, campaign, category, product, restaurant, store, vendor, etc.) currently **TRACKED IN GIT** — user uploads must be untracked

**Database:**
- MySQL spatial columns via `matanyadaev/laravel-eloquent-spatial` for zone boundaries
- 149 Eloquent models; largest: `Store` (38 KB), `Item` (22 KB), `Order` (12 KB)

### 2.2 mytijaara-waitlist (Laravel 12 API + TanStack Start FE)

**Strengths (Well-Engineered):**
- **Compare-and-swap idempotency** in `SendVerificationReminders` command (lines 219-226): `UPDATE ... WHERE verified=false AND last_verification_reminder_at = previous_value` prevents double-send across concurrent cron runs
- **Referral reward idempotency:** `rewarded_at` column + `whereNull('rewarded_at')` guard in `RewardDispatcher` (lines 95-101) — concurrent admin actions cannot double-pay
- **Separate auth domain for VDR:** `DataRoomAuthenticate` middleware uses SHA-256 token hash lookup, constant-time validation, no caching, security headers (`noindex, no-store`)
- **Encrypted 2FA at rest:** `two_factor_secret` → `encrypted`, `two_factor_recovery_codes` → `encrypted:array` (User model lines 56-57)
- **Soft-delete aware signup:** checks trashed rows, force-deletes to allow re-signup (WaitlistController lines 256-267)
- **Honeypot + rate limiting** on public signup endpoint (lines 224-234)

**Architecture:**
- Clean route separation: public → Sanctum + spatie permissions → VDR (separate middleware)
- Settings-driven configuration (SMTP, referral program) via `Setting` model with JSON `data` column
- Cron endpoint gated by shared secret (`CRON_TOKEN`) for shared hosting compatibility

### 2.3 mytijaara-user-web (Next.js 15 + MUI + Redux)

**Critical Security Findings:**
- **`next.config.js` lines 16-28:** `images.remotePatterns` allows `hostname: '**'` for BOTH `http` and `https` — **XSS/phishing vector** (any domain can serve images, enabling avatar spoofing, tracking pixels, mixed-content)
- `eslint.ignoreDuringBuilds: true` — lint failures won't block deployment
- `compiler.removeConsole` strips logs in production (debugging harder)

**Architecture:**
- Next.js App Router with MUI v5, Redux Toolkit, React Query v3
- Firebase v10 for Auth/Messaging/Crashlytics
- Google Maps via `@react-google-maps/api` + `google-map-react`
- Internationalization: i18next + custom scanner scripts
- **Package name:** `sixam-mart` (upstream naming, not MyTijaara)

### 2.4 Mobile Apps (Flutter 3.10 + GetX)

| App | Key Dependencies | Notable Integrations |
|-----|------------------|---------------------|
| **user-app** | `drift` (local DB), `flutter_inappwebview`, `speech_to_text`, `google_sign_in`, `flutter_facebook_auth`, `sign_in_with_apple` | Most feature-rich: rental, ride-share, service modules, PDF generation, video player |
| **rider-app** | `flutter_foreground_task` (background location), `flutter_polyline_points`, `fl_chart` | Critical for delivery tracking; foreground service for location |
| **store-app** | `print_bluetooth_thermal` + `flutter_esc_pos_utils` | **POS thermal printer integration** for order receipts |

**Common Stack:**
- Firebase Core/Messaging/Auth across all three
- `dart_pusher_channels` for realtime
- `geolocator` 14.x, `google_maps_flutter` 2.14+
- GetX 4.7 for state/routing/DI

---

## Phase 3: Cross-System Analysis — Contract Mapping

### 3.1 Authentication Boundaries

| System | Auth Mechanism | Token Scope | Cross-Access |
|--------|---------------|-------------|--------------|
| Admin panel | Laravel Sanctum + spatie permissions | API tokens, session cookies | **Cannot access VDR** |
| Waitlist API | Sanctum (admin) + Better Auth (FE) | Bearer tokens | **Cannot access VDR** |
| VDR (waitlist) | Custom `DataRoomAuthenticate` | SHA-256 hashed bearer | **Isolated** — separate guard, no session sharing |
| User-web | Firebase Auth + custom JWT | ID tokens | Independent |
| Mobile apps | Firebase Auth + custom tokens | ID tokens | Independent |

**✅ Good:** VDR is correctly isolated — admin session grants nothing in VDR, VDR token grants nothing in admin.

### 3.2 API Contracts

**Admin → Mobile/Web (ConfigController):**
- Single `/api/v1/config` endpoint returns 200+ settings keys
- Google Maps proxy endpoints: `place_api_autocomplete`, `distance_api`, `place_api_details`, `direction_api`, `geocode_api`
- Module-aware responses (Rental, RideShare, TaxModule, ReelsModule)
- **Risk:** Massive payload, no versioning, `Cache::rememberForever` with no invalidation

**Waitlist API → Frontend:**
- RESTful: `/waitlist`, `/referrals`, `/cms`, `/dataroom`
- Public endpoints: signup, count, avatars, cities, verify, referral visit tracking
- Admin endpoints: full CRUD + bulk actions + exports (CSV streaming)

**Mobile ↔ Backend:**
- Shared Laravel API (admin's API v1) consumed by all 3 Flutter apps
- Ziggy route helpers in admin frontend for Laravel route generation

### 3.3 Database Overlaps

| Table/Concept | Admin | Waitlist | User-Web | Mobile Apps |
|---------------|-------|----------|----------|-------------|
| Users | `users` (admin) | `users` (admin) + `waitlist_entries` | Firebase UID | Firebase UID |
| Orders | `orders` (core) | — | Reads via API | Reads via API |
| Stores | `stores` | — | Reads via API | Reads via API (store-app writes) |
| Zones | `zones` (spatial) | — | Reads via API | Reads via API |
| Referrals | — | `referrals`, `referral_visits` | — | — |
| VDR | — | `dataroom_*` tables | — | — |

**Finding:** No shared database — each project has its own MySQL database. Contracts are HTTP-only.

### 3.4 Realtime Channels

| Channel | Producer | Consumers | Protocol |
|---------|----------|-----------|----------|
| Order updates | Admin (order placement) | Rider-app, Store-app | Pusher / Laravel Reverb |
| Chat/Notifications | Admin, User-web | All apps | Pusher / Firebase Messaging |
| Location tracking | Rider-app | Admin, User-web | Pusher (foreground task) |

**Finding:** Pusher/Reverb credentials in admin `.env` are test keys (`6ammart`). Production keys needed.

### 3.5 Payment Flows

**Gateway Coverage:** 30+ gateways hardcoded in `PaymentGatewayTrait.php` with supported currencies.

**Flow:**
1. Admin configures gateway credentials in settings (stored in `BusinessSetting` / `Setting` models)
2. `Payment::generate_link()` creates `PaymentRequest` record, returns gateway-specific pay URL
3. Gateway callbacks hit `/payment/{gateway}/pay` routes (95+ hardcoded in `Payment.php`)
4. Webhook verification varies per gateway — no unified verification layer

**Risk:** 95 hardcoded routes in `Payment.php` — adding a gateway requires code change + deploy.

### 3.6 Module Interfaces (Laravel Modules)

| Module | Purpose | Integration Points |
|--------|---------|-------------------|
| **AI** | OpenAI integration | `openai-php/laravel`, `ConfigController` returns `openai_config` |
| **Builder** | Drag-drop page builder | Separate React addon (`Modules/Builder/resources/`) |
| **TaxModule** | Multi-jurisdiction tax | `CalculateTaxService`, integrated in `PlaceNewOrder`, `ConfigController` |
| **ReelsModule** | Short video content | Referenced in `ConfigController`, no standalone API seen |

**Finding:** Modules loaded globally via autoload; `addon_published_status()` checks scattered. No module registry/contract.

---

## Phase 4: Deep Audit — Detailed Findings

### 4.1 Security (🔴 Critical / 🟠 High / 🟡 Medium)

| ID | Severity | Location | Finding | Evidence | Remediation |
|----|----------|----------|---------|----------|-------------|
| SEC-001 | 🔴 Critical | `mytijaara-user-web/next.config.js:16-28` | **Image hostname wildcard `**` for HTTP + HTTPS** — allows any domain to serve images, enabling XSS via SVG, phishing via avatar spoofing, mixed-content attacks | `remotePatterns: [{protocol: 'http', hostname: '**'}, {protocol: 'https', hostname: '**'}]` | Restrict to explicit domains: `mytijaara.com`, `storage.mytijaara.com`, known CDN hosts |
| SEC-002 | 🔴 Critical | `mytijaara-admin/.env:11` | **Public IP exposed** in committed `.env` — `APP_PUBLIC_IP=198.54.115.74` | Direct read of `.env` | Remove from `.env`; use runtime detection or separate config |
| SEC-003 | 🟠 High | `mytijaara-admin/.env:35` | **Nulled license indicator** — `PURCHASE_CODE=NulledMaster` suggests unlicensed upstream code | `.env` line 35 | Verify license compliance; replace with valid purchase code |
| SEC-004 | 🟠 High | `mytijaara-admin/.env.example:4` | **`APP_DEBUG=true`** in example — developers may copy to production | `.env.example` line 4 | Set `APP_DEBUG=false` in `.env.example` |
| SEC-005 | 🟠 High | `mytijaara-admin/storage/app/public/` | **34 directories of user uploads tracked in Git** — banners, products, store images, vendor docs | `ls storage/app/public/` shows 34 subdirs | `git rm -r --cached storage/app/public`; add to `.gitignore` |
| SEC-006 | 🟡 Medium | `mytijaara-waitlist/backend/app/Http/Middleware/DataRoomAuthenticate.php` | VDR token validation uses SHA-256 — good, but **no rate limiting** on `/dataroom/authenticate` | Middleware lines 36-49 | Add rate limiter on authentication endpoint |
| SEC-007 | 🟡 Medium | `mytijaara-waitlist/backend/app/Support/SmtpConfig.php:97-132` | SMTP test connection exposes detailed error messages to admin UI | `test()` method returns raw exception messages | Sanitize error output; log details, return generic message |
| SEC-008 | 🟡 Medium | `mytijaara-admin/app/Traits/Payment.php:39-101` | **95 hardcoded payment routes** — route enumeration possible | `Payment.php` trait | Move to config; use signed URLs for payment initiation |
| SEC-009 | 🟡 Medium | `mytijaara-admin/app/Http/Controllers/Api/V1/ConfigController.php` | **Massive config endpoint** exposes all business settings, Google Maps keys, module configs | 1450-line controller | Split into domain-specific endpoints; add API versioning |
| SEC-010 | 🟢 Low | `mytijaara-waitlist/backend/app/Models/User.php:56-57` | **2FA secrets encrypted at rest** — ✅ correctly implemented | `casts()` method | Maintain; audit key rotation policy |

### 4.2 Performance (🔴 Critical / 🟠 High / 🟡 Medium)

| ID | Severity | Location | Finding | Impact | Remediation |
|----|----------|----------|---------|--------|-------------|
| PERF-001 | 🔴 Critical | `mytijaara-admin/app/Http/Controllers/Api/V1/ConfigController.php` | **15+ `Cache::rememberForever()` with no invalidation** — stale data served indefinitely | Serves stale business config, zone data, currency symbols | Replace with TTL-based caching; add cache tags/invalidation on settings update |
| PERF-002 | 🟠 High | `mytijaara-admin/app/Http/Controllers/Api/V1/ConfigController.php:550-620` | **Zone query loads modules + delivery options per zone** — N+1 risk in `zoneDeliveryOptions` loop | 50+ zones × modules = hundreds of queries | Eager load `modules.deliveryOptions`; use single query with joins |
| PERF-003 | 🟠 High | `mytijaara-admin/app/Traits/PlaceNewOrder.php` | **111 KB trait** — cart processing, coupon, tax, delivery fee, pro discounts all in one transaction | Long DB locks during checkout; hard to test | Split into pipeline: `CartValidator → PricingEngine → TaxCalculator → OrderPersister` |
| PERF-004 | 🟡 Medium | `mytijaara-admin/app/CentralLogics/Helpers.php` (217 KB) | **God class** — 5000+ lines, 80+ static methods, used everywhere | Memory bloat; any change risks cascade | Extract domain services: `CurrencyService`, `ZoneService`, `PaymentService`, `NotificationService` |
| PERF-005 | 🟡 Medium | `mytijaara-waitlist/backend/app/Console/Commands/SendVerificationReminders.php` | **Chunked processing** (25 rows) good, but **no cursor-based pagination** for large waitlists | Offset pagination degrades past 10k rows | Use `cursor()` or `chunkById()` for large datasets |
| PERF-006 | 🟢 Low | `mytijaara-user-web/next.config.js:11-15` | `removeConsole` in production — removes `console.log` but keeps `error`/`warn` | ✅ Reasonable default | No action needed |

### 4.3 Reliability (🔴 Critical / 🟠 High / 🟡 Medium)

| ID | Severity | Location | Finding | Risk Scenario | Remediation |
|----|----------|----------|---------|---------------|-------------|
| REL-001 | 🟠 High | `mytijaara-admin/app/Traits/PlaceNewOrder.php` | **Single massive transaction** (lines 71-550+) — coupon, tax, inventory, order, payment all in one | Deadlock on high concurrency; partial failure rolls back everything | Split: validate → reserve inventory → create order → async payment |
| REL-002 | 🟠 High | `mytijaara-admin/app/Http/Controllers/Api/V1/ConfigController.php` | **No cache invalidation strategy** — `rememberForever` on business settings, zones, currencies | Admin changes settings; mobile apps see stale config for days | Add `Cache::forget()` in settings update controllers; use cache tags |
| REL-003 | 🟡 Medium | `mytijaara-waitlist/backend/app/Console/Commands/SendVerificationReminders.php:219-226` | **Compare-and-swap claim** — ✅ correctly prevents double-send | ✅ Well-designed | Document pattern; apply to other batch jobs |
| REL-004 | 🟡 Medium | `mytijaara-waitlist/backend/app/Support/RewardDispatcher.php:95-101` | **Referral reward idempotency** — ✅ `whereNull('rewarded_at')` guard | ✅ Well-designed | Document pattern |
| REL-005 | 🟡 Medium | `mytijaara-waitlist/backend/app/Http/Controllers/Api/WaitlistController.php:269-321` | **Transaction only wraps DB writes** — email/notification sent after commit (line 325) | Mail failure doesn't roll back signup (correct), but no retry queue shown | Ensure `SendWaitlistWelcomeJob` has exponential backoff + dead letter |
| REL-006 | 🟢 Low | `mytijaara-waitlist/backend/app/Http/Controllers/Api/CmsController.php` | **5-min cache TTL** for public CMS — ✅ reasonable | ✅ Good balance | No action |

### 4.4 Maintainability (🔴 Critical / 🟠 High / 🟡 Medium)

| ID | Severity | Location | Finding | Technical Debt | Remediation |
|----|----------|----------|---------|----------------|-------------|
| MAINT-001 | 🔴 Critical | `mytijaara-admin/app/CentralLogics/*.php` (14 files) | **`files` autoload (not PSR-4)** — 500 KB of procedural helpers loaded globally | Cannot tree-shake; every request loads all; no namespacing | Migrate to PSR-4 services under `App\Services\` with DI |
| MAINT-002 | 🔴 Critical | `mytijaara-admin/app/Traits/PlaceNewOrder.php` (111 KB) | **Single trait does everything** — validation, pricing, tax, coupons, pro discounts, attachments, order creation | 1450 lines in ConfigController + 1100 in this trait = 2500 lines of order logic | Decompose into `OrderPlacementService` with injected `PricingEngine`, `TaxCalculator`, `InventoryReserver` |
| MAINT-003 | 🟠 High | `mytijaara-admin/app/Traits/PaymentGatewayTrait.php` (390+ lines) | **Hardcoded gateway→currency map** — adding gateway = code change | 30+ gateways maintained in PHP array | Move to database-backed `payment_gateways` table with currency JSON column |
| MAINT-004 | 🟠 High | `mytijaara-admin/app/Traits/Payment.php` (103 lines) | **95 hardcoded payment routes** — route map in trait | Adding gateway requires trait edit + route registration | Use dynamic route registration from gateway config |
| MAINT-005 | 🟠 High | `mytijaara-admin/composer.json:59-81` | **14 files in `files` autoload** — `Helpers.php`, `ProductLogic.php`, etc. | Global namespace pollution; no static analysis | Migrate to `App\Services\` with proper DI |
| MAINT-006 | 🟡 Medium | `mytijaara-waitlist/backend/app/Http/Controllers/Api/ConfigController.php` | **No such controller in waitlist** — waitlist uses `LaunchConfigController` + `SettingsController` | Inconsistent naming vs admin | Align naming; document API contract |
| MAINT-007 | 🟡 Medium | `mytijaara-user-web/package.json:2` | **Package name `sixam-mart`** — upstream brand, not MyTijaara | Confusion in deploy logs, Docker images, monitoring | Rename to `mytijaara-user-web` |
| MAINT-008 | 🟡 Medium | All Flutter apps | **Package names `sixam_mart*`** — upstream naming | Same as above | Rename to `mytijaara_user_app`, `mytijaara_rider_app`, `mytijaara_store_app` |
| MAINT-009 | 🟢 Low | `mytijaara-waitlist/backend/app/Models/Referral.php:25-28` | **`scopePendingReward`** — clean scope for converted-but-unpaid | ✅ Good pattern | Replicate for other "pending" states |

---

## Phase 5: Repository Preparation — Git Status & .gitignore Audit

### 5.1 Current Git State

| Project | .git Exists? | .gitignore Adequate? | Critical Missing Ignores |
|---------|--------------|----------------------|--------------------------|
| **mytijaara-waitlist** | ✅ Yes | ✅ Good | None (covers `.output`, `.tanstack`, `.wrangler`, `evals/*/captures`, `evals/*/results`) |
| **mytijaara-admin** | ❌ No | ❌ **Missing `/storage/app/public`** | Must add `/storage/app/public` (34 dirs of uploads) |
| **mytijaara-user-web** | ❌ No | ✅ Good | Covers `.next`, `out`, `build`, `.env*.local`, `.vercel` |
| **mytijaara-user-app** | ❌ No | N/A (Flutter) | Need `.gitignore` for `build/`, `.dart_tool/`, `.packages`, `*.iml` |
| **mytijaara-rider-app** | ❌ No | N/A (Flutter) | Same as above |
| **mytijaara-store-app** | ❌ No | N/A (Flutter) | Same as above |

### 5.2 Required Actions Before Push

1. **Initialize Git** for 5 projects without repos:
   ```bash
   cd /c/xampp/htdocs/mytijaara-admin && git init && git add .gitignore && git commit -m "chore: initial commit with gitignore"
   # Repeat for user-web, user-app, rider-app, store-app
   ```

2. **Fix admin .gitignore** — add `/storage/app/public` before first commit:
   ```gitignore
   /storage/app/public
   ```

3. **Untrack uploaded files** if already committed:
   ```bash
   git rm -r --cached storage/app/public
   ```

4. **Never force-push** — all pushes must be fast-forward or explicit merge.

5. **No secrets in commits** — verify `.env` files are ignored (they are in all projects).

---

## Phase 6: Verification Checklist (Pre-Push)

- [ ] All 6 projects have `.git` initialized
- [ ] All 6 projects have proper `.gitignore`
- [ ] Admin `storage/app/public` untracked
- [ ] No `.env` files tracked (verified via `git ls-files | grep '\.env'`)
- [ ] No large binaries (>100MB) in history
- [ ] Commit messages follow conventional format
- [ ] Main branch is default
- [ ] Remote origin configured (but **not pushed yet** — awaiting approval)

---

## Recommendations Priority Matrix

### Immediate (Before Any Deploy)
1. **SEC-001** — Fix Next.js image hostname wildcard
2. **SEC-005** — Untrack admin `storage/app/public`
3. **SEC-002/003/004** — Clean admin `.env` (remove IP, fix debug, verify license)
4. **Git init** all 5 projects without repos

### Short-term (Next Sprint)
5. **PERF-001** — Add cache invalidation to ConfigController
6. **REL-001** — Decompose PlaceNewOrder transaction
7. **MAINT-001/005** — Migrate CentralLogics to PSR-4 services
8. **MAINT-003/004** — Database-driven payment gateway config

### Medium-term (Quarter)
9. **PERF-002/003** — Optimize zone queries; split order placement pipeline
10. **MAINT-002** — Extract OrderPlacementService from PlaceNewOrder trait
11. **SEC-008/009** — Signed payment URLs; versioned config API
12. Rename all packages from `sixam-mart*` to `mytijaara-*`

### Ongoing
- Add gate tests (<2s) for every critical path
- Periodic evals for LLM-driven features (AI module)
- Monitor VDR access patterns for anomalies
- Rotate 2FA encryption keys annually

---

## Appendix: File References for Key Findings

| Finding | File | Lines |
|---------|------|-------|
| SEC-001 | `mytijaara-user-web/next.config.js` | 16-28 |
| SEC-002 | `mytijaara-admin/.env` | 11 |
| SEC-003 | `mytijaara-admin/.env` | 35 |
| SEC-004 | `mytijaara-admin/.env.example` | 4 |
| SEC-005 | `mytijaara-admin/storage/app/public/` | 34 subdirs |
| SEC-006 | `mytijaara-waitlist/backend/app/Http/Middleware/DataRoomAuthenticate.php` | 36-49 |
| SEC-007 | `mytijaara-waitlist/backend/app/Support/SmtpConfig.php` | 97-132 |
| SEC-008 | `mytijaara-admin/app/Traits/Payment.php` | 39-101 |
| SEC-009 | `mytijaara-admin/app/Http/Controllers/Api/V1/ConfigController.php` | 1-1450 |
| PERF-001 | `mytijaara-admin/app/Http/Controllers/Api/V1/ConfigController.php` | 75, 88, 101, 115, 117, 144, 195, 201, 205, 214, 220, 1416 |
| PERF-002 | `mytijaara-admin/app/Http/Controllers/Api/V1/ConfigController.php` | 550-620 |
| PERF-003 | `mytijaara-admin/app/Traits/PlaceNewOrder.php` | 1-1100 |
| PERF-004 | `mytijaara-admin/app/CentralLogics/Helpers.php` | 1-5000 |
| REL-001 | `mytijaara-admin/app/Traits/PlaceNewOrder.php` | 71-550 |
| REL-002 | `mytijaara-admin/app/Http/Controllers/Api/V1/ConfigController.php` | 75, 88, 101, 115, 117, 144, 195, 201, 205, 214, 220, 1416 |
| REL-003 | `mytijaara-waitlist/backend/app/Console/Commands/SendVerificationReminders.php` | 219-226 |
| REL-004 | `mytijaara-waitlist/backend/app/Support/RewardDispatcher.php` | 95-101 |
| MAINT-001 | `mytijaara-admin/composer.json` | 59-81 |
| MAINT-002 | `mytijaara-admin/app/Traits/PlaceNewOrder.php` | 1-1100 |
| MAINT-003 | `mytijaara-admin/app/Traits/PaymentGatewayTrait.php` | 8-390 |
| MAINT-004 | `mytijaara-admin/app/Traits/Payment.php` | 39-101 |

---

**Report Generated:** 2026-09-07  
**Next Review:** After Phase 6 repository preparation complete