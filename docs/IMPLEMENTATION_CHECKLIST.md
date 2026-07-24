# MyTijaara implementation checklist

Status key: `[ ]` not started, `[-]` in progress, `[x]` tested and complete.

## Phase 0: discovery and architecture

- [x] Audit the existing codebase and record verified findings.
- [x] Select MySQL 8.0+ as the system of record.
- [ ] Define the versioned public and admin API contracts.
- [ ] Define data-retention, privacy, consent, and deletion requirements before collecting personal data.
- [ ] Add reproducible local development, CI, gate-test, and browser-test tooling.

## Phase 1: Laravel platform foundation

- [ ] Create the isolated Laravel API/admin service without changing the approved landing-page design.
- [ ] Configure untracked environment variables and a MySQL health check.
- [ ] Create tested MySQL migrations for users, roles, permissions, audit logs, settings, media, sections, waitlist entries, referrals, tags, notes, page events, campaigns, messages, and unsubscribe records.
- [ ] Configure secure authentication, password reset, session controls, rate limiting, CSRF protection, RBAC, audit logging, queues, caching, and mail.
- [ ] Add application, migration, integration, and browser-test suites.

## Phase 2: waitlist and referrals

- [ ] Replace the client-only waitlist submit flow with a validated, rate-limited Laravel API integration.
- [ ] Capture name, email, optional phone, city, role, referral code/source, consent, timestamp, privacy-safe IP/device metadata, and campaign parameters.
- [ ] Implement duplicate protection, email verification, referral links, invite and conversion tracking, referral leaderboard, and live public count.
- [ ] Add tested admin search, filtering, pagination, tagging, notes, bulk actions, and CSV export.

## Phase 3: CMS and media

- [ ] Make landing-page copy, navigation, CTAs, statistics, FAQs, testimonials, sections, and social links editable without visual redesign.
- [ ] Add media upload validation, folders, alt text, search, image optimization, preview, ordering, enable/disable, draft, and publish workflows.

## Phase 4: analytics and campaigns

- [ ] Record consent-aware page views, unique visitors, CTA clicks, traffic sources, browser/device data, and conversion events.
- [ ] Build live admin analytics for signup cadence, referrals, cities, conversion, devices, browsers, CTAs, pages, and traffic sources.
- [ ] Build email templates, segmentation, campaigns, scheduling, delivery/open/click event handling, resend, previews, and unsubscribe handling.

## Phase 5: launch readiness

- [ ] Replace all fake metrics and dead links with verified behavior or remove them with approved copy changes.
- [ ] Complete accessibility, responsive, security, performance, SEO, backup/restore, and deployment reviews.
- [ ] Manually test every public, admin, email, and failure flow; fix findings and retest.
- [ ] Publish architecture, database, operating, deployment, and remaining-debt documentation.
