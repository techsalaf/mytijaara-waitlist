# Changelog

## 2026-07-29

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
