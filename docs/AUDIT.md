# MyTijaara launch-platform audit

Audit date: 2026-07-24

## Current architecture

- **Frontend:** React 19, TypeScript, TanStack Start, TanStack Router, Vite and Tailwind CSS.
- **Server runtime:** TanStack Start/Nitro entry in `src/server.ts`; it currently provides only SSR error handling.
- **Data layer:** none. There is no database driver, schema, migration system, server mutation, API route, authentication, queue, mailer, or environment template.
- **UI:** the landing page is a single large module at `src/routes/index.tsx`. It is visually complete and must remain visually unchanged while it is connected to real functionality.

## Confirmed issues

| Severity | Location | Finding | Impact |
| --- | --- | --- | --- |
| Critical | `src/routes/index.tsx` (`Waitlist`) | Submission only calls `setSubmitted(true)`; it does not validate beyond browser email validation, call a server endpoint, or persist data. | Visitors are told they joined the waitlist when no signup exists. |
| High | `src/routes/index.tsx` (`Waitlist`) | Required launch fields such as name, city, referral data and consent are not captured. | The current form cannot meet the launch waitlist requirements. |
| High | project root | No database connection, migrations, or database configuration exists. | MySQL cannot yet store operational data. |
| High | project root | No authentication or authorization exists. | An administration dashboard cannot be secured. |
| High | project root | No analytics collection, email delivery, CMS, media handling, or background jobs exist. | Required platform functions are absent. |
| Medium | `src/routes/index.tsx` (`Footer`) | Social and footer navigation anchors use `href="#"`. | Dead links and an incomplete public experience. |
| Medium | `src/routes/index.tsx` | The displayed `2,400+` waitlist count is hard-coded. | It is a fake metric. |
| Medium | `README.md` | Documentation describes an older Vite-style structure and states that signup is complete. | Setup and capability claims are inaccurate. |
| Medium | toolchain | `bun run lint` and `bun run build` cannot run because Bun is not installed. No alternative lockfile-backed package manager is declared. | Current automated verification is blocked. |
| Medium | project root | No unit, integration, browser, or acceptance test framework is configured. | Required feature testing is not available. |

## Database decision

MySQL 8.0+ is the selected system of record. The target production configuration is a separate MySQL database with a least-privilege application user, UTF-8 (`utf8mb4`), TLS in production, migration history, and automated backups. Development uses the local XAMPP MySQL service only through untracked environment variables.

## Recommended target architecture

Keep the approved TanStack Start landing page as the public frontend. Add a Laravel API and administration application as a separate service, with MySQL as its only relational datastore. The frontend will call versioned Laravel endpoints for public signup and public metrics; Laravel owns validation, persistence, authentication, RBAC, mail, analytics, CMS, jobs, and audit logs.

This separation preserves the approved UI and gives the launch platform a conventional Laravel security and operations model. The public-client contract must be defined before either side connects to it.
