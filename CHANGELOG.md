# Changelog

## 2026-08-06

### Added

- CMS context layer (`src/lib/cms-context.tsx`): `CmsProvider`, `useCmsData<T>`, `useFaqs`, `useTestimonials` — every landing component now reads from the DB with hardcoded defaults as fallback.
- Landing page route loader now fetches `/cms`, `/content/faqs`, and `/content/testimonials` in parallel alongside `/launch-config`.
- SEO section: `og:title`, `og:description`, `og:image`, `twitter:card` populated from the `seo` CMS section; falls back to hardcoded values when the section is empty.
- Announcement bar component (`src/components/landing/announcement-bar.tsx`): rendered above the nav only when `cms["announcement"].data.enabled === true`.
- Five new admin CMS editors: `admin.cms.how.tsx`, `admin.cms.why.tsx`, `admin.cms.inside-the-app.tsx`, `admin.cms.built-for-nigerians.tsx`, `admin.cms.partners.tsx` — all follow the `useCmsSection` hook pattern with full save/enable controls.
- `CmsApiTest.php`: 17 tests / 53 assertions covering public GET, admin CRUD, draft promotion, cache invalidation, enabled/published exclusion, RBAC guards, and response shape.
- `src/lib/cms-context.test.tsx`: 12 gate tests covering `useCmsData` fallback, merge, key preservation, multi-section, out-of-provider, `useFaqs`, and `useTestimonials`.

### Changed

- `nav.tsx`: nav links array CMS-driven (`navigation` section), hardcoded defaults preserved.
- `footer.tsx`: tagline, columns, copyright, and social links (`footer` + `social` sections) CMS-driven; year still seeded from the route-loader clock to prevent hydration mismatch on year-rollover.
- `inside-the-app.tsx`: badge, heading, subheading from `inside_the_app` CMS section.
- `partners.tsx`: badge, heading, subheading from `partners` CMS section.
- `hero.tsx`: subtitle and secondary CTA label from `hero` CMS section.
- `faq.tsx`: FAQ items from DB (`useFaqs`), heading/subheading from `faqs` CMS section.
- `services.tsx`: heading and item text from `services` CMS section; icons hardcoded by position.
- `how.tsx`: heading and steps from `how` CMS section.
- `why.tsx`: heading, subheading, and value points from `why` CMS section.
- `trusted-by.tsx`: statistics items from `statistics` CMS section.
- `built-for-nigerians.tsx`: heading, body, and bullet points from `built_for_nigerians` CMS section.
- `admin.cms.tsx`: renamed "Features" tab to "Services"; added tabs for the five new editors.
- Fixed `AdminApiTest` to include `scheduledAt` when patching a campaign to `scheduled` status, matching the schedule-guard validation added in a previous sprint.

### Email platform (2026-08-05)

- Wired real Resend send, segment expansion, scheduled dispatch, and schedule guard (422 on missing `scheduledAt`).
- Added `ReferralRewardsTest` and full campaign/referral analytics coverage.
- Weekly digest endpoint, preview, audit trail, and nightly schedule.



### Added

- Promoted the previously untracked Laravel 12 backend into `backend/`.
- Added frontend API modules for analytics, audit logs, auth, campaigns, CMS, dashboard, media, notifications, referrals, roles, settings, templates, and users.
- Added Docker Compose for MySQL 8.4, Redis, API, queue worker, and scheduler.
- Added required project-progress documents.

### Changed

- Public waitlist submissions now send the backend contract fields, including consent and referral code.
- Admin sessions validate their Sanctum token before rendering protected UI.
- Logout revokes the server token before local credentials are cleared.
- Backend API guests receive a JSON 401 instead of a nonexistent web-login redirect.
- Dashboard and analytics charts now use live Laravel aggregates rather than direct mock data or randomized values.
- Referral verification now marks the referral conversion, and referral analytics expose real visit, conversion, signup, and UTM-source data.
- Email campaign, draft, scheduled, detail, and template views now request live API data; the email builder creates server-side drafts and queues campaigns for delivery.
- CMS FAQ and testimonial management now uses the content API for create, edit, publish, and delete operations.
- Media library now reads server-side files and folders and performs real upload and deletion operations.
- Notifications, audit logs, users, roles/permissions, user detail, and waitlist administration now read from the Laravel API rather than importing mock data directly.
- Added waitlist feature tests for verified signup, duplicate prevention, referral conversion, and protected admin updates; role saves, audit searching, and bulk verification now call their APIs.
- Fixed CMS draft publishing so a publish request promotes and clears its submitted draft atomically, and constrained notification read actions to the notification's owner or global notifications.
- Added password-reset API endpoints backed by Laravel's broker and updated the frontend reset forms to call them; successful resets revoke all active Sanctum tokens.
- Removed the hard-coded inflated landing-page waitlist count; public social proof now reflects the actual backend total.
- Fixed local API CORS for both Vite origins (`localhost:3000` and `127.0.0.1:3000`) and added a preflight regression test for login.
