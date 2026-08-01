# Production backend progress

Last updated: 2026-07-29

## Current milestone: recovered backend foundation

- Laravel 12 API recovered from Claude's unmerged worktree and promoted to `backend/`.
- MySQL migrations, seeders, Sanctum, Spatie RBAC, REST controllers, queue jobs, and OpenAPI support are present.
- Public waitlist signup and live count, admin token login/logout, and token validation are wired from the frontend.
- Backend tests pass: 11 tests and 40 assertions.
- Frontend production build passes.
- Admin dashboard and detailed analytics now load API-backed metrics, charts, and campaign/referral data; randomized analytics values were removed.
- Referral leaderboard, referrer detail, overview, and analytics views now use real referral records, visit/conversion trends, and UTM-source aggregates.
- Email campaign list, drafts, scheduled campaigns, detail metrics, template list, and the campaign builder now use the Laravel API; campaign charts no longer generate random data.
- FAQ and testimonial administration now reads and mutates the CMS content endpoints, including creation, edits, publish state, and deletion.
- Media library now loads server-side files and folders, and supports upload and deletion through the media API.
- Notifications (including the shell dropdown), audit logs, team users, roles/permissions, user detail, and waitlist administration now use their Laravel API modules rather than direct mock data.
- Role changes, audit-log searching, and bulk waitlist verification now perform real API operations. Added waitlist feature coverage for signup, duplicate protection, verification, referral conversion, and admin updates (15 tests / 59 assertions total).
- CMS draft publishing now atomically promotes and clears draft data. Added API coverage for campaigns, CMS/FAQ CRUD, RBAC denial, and notification ownership; private notifications can no longer be marked read by another admin.
- Password reset now uses Laravel's password broker through public API endpoints and revokes existing Sanctum tokens after a successful reset. The reset regression test passes (4 assertions).
- The public hero waitlist count no longer inflates backend data with a hard-coded social-proof fallback; it renders the exact API count or a neutral loading label.
- Local frontend-to-API authentication now supports `http://localhost:3000` and `http://127.0.0.1:3000` CORS preflights; the CORS regression test passes.

## Next milestone: close functional and operational gaps

The remaining work is to complete API-backed actions and state management where controls are still presentational, add comprehensive feature coverage, and close operational/deployment gaps. Mock data remains solely as an explicit no-backend development fallback inside API modules.
