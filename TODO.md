# Production TODO

## Active

- [x] Replace direct `src/lib/mock-data.ts` consumers with API modules and server-backed state across the admin UI. (Mock data is retained only as the API modules' explicit local fallback.)
- [-] Replace remaining presentational UI actions with their API-backed equivalents and remove hard-coded dashboard/system placeholders. (The public waitlist count now uses the exact API value.)
- [-] Convert settings pages from uncontrolled hard-coded inputs to read/write `settingsApi` state. The current shared Save button is presentational and must not be relied on for configuration persistence.
- [-] Add backend feature/API tests for every critical public and admin flow. (Authentication, waitlist/referrals, campaign CRUD, CMS/FAQ CRUD, RBAC denial, and notification ownership are covered; media, users/roles mutation, and analytics coverage remains.)
- [-] Complete password reset, session management, provider-backed mail/webhook handling, CMS publishing workflows, and analytics collection. (Password-reset API and token revocation are complete; a production mail provider and remaining operational flows still need configuration/verification.)
- [ ] Complete deployment, monitoring, backup, privacy, security, accessibility, and browser QA documentation.

## Completed foundation

- [x] Recover and promote the Laravel backend source.
- [x] Validate MySQL migration state and seeded administrator authentication.
- [x] Wire public waitlist submission, live count, token login/logout, and admin token verification.
- [x] Add Docker Compose, PHP 8.4 runtime target, and backend installation guidance.
