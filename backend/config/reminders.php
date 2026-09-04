<?php

/*
|--------------------------------------------------------------------------
| Waitlist verification reminders
|--------------------------------------------------------------------------
| Drives `waitlist:send-verification-reminders`. Every number here is read at
| send time, so an operator can retune the cadence from `.env` without a code
| change, and the test suite can compress three days into three seconds.
|
| See docs: /admin/cron-setup in the admin panel renders the operator guide
| from these same values.
*/

return [

    /**
     * Master switch. Off means the command still runs, reports, and records a
     * `cron_runs` row, but sends nothing. Useful when an SMTP quota is blown and
     * you want the monitoring page to keep working.
     */
    'enabled' => (bool) env('VERIFICATION_REMINDERS_ENABLED', true),

    /**
     * Days between nudges, and days after signup before the first nudge.
     *
     * The gate is `COALESCE(last_verification_reminder_at, created_at) + N days`,
     * so a brand-new signup is not nudged the same day it received the welcome
     * email; it waits the same interval as everyone else.
     */
    'interval_days' => max(1, (int) env('VERIFICATION_REMINDER_INTERVAL_DAYS', 3)),

    /**
     * Hard stop on how many reminders one address can ever receive. After this
     * the row drops out of the eligible set permanently. 0 disables the cap.
     *
     * At the default 3-day interval, 5 reminders covers 15 days. Past that an
     * address that never confirms is not going to, and continuing to mail it
     * only damages the sending domain's reputation.
     */
    'max_per_entry' => max(0, (int) env('VERIFICATION_REMINDER_MAX_PER_ENTRY', 5)),

    /**
     * Rows processed per invocation. Shared hosting kills long-running PHP, so
     * the command takes a bounded bite and leaves the rest for the next run
     * rather than trying to drain the whole backlog at once.
     */
    'batch_size' => max(1, (int) env('VERIFICATION_REMINDER_BATCH_SIZE', 50)),

    /**
     * Rows read per database chunk inside a batch. Keeps memory flat on a
     * shared-hosting PHP process no matter how large the waitlist grows.
     */
    'chunk_size' => max(1, (int) env('VERIFICATION_REMINDER_CHUNK_SIZE', 25)),

];
