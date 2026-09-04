<?php

use App\Console\Commands\SendScheduledCampaigns;
use App\Console\Commands\SendVerificationReminders;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/**
 * Scheduled campaigns are dispatched from here. Every minute is the finest
 * granularity the scheduler offers and matches the minute precision of the
 * `scheduled_at` picker in the builder.
 *
 * On shared hosting `schedule:run` itself only fires every five minutes (see
 * below), so in production this is effectively "within five minutes of the
 * scheduled time". That is a hosting limit, not a bug here: the command claims
 * each row before sending, so a late run sends the same mail, just later.
 *
 * `withoutOverlapping()` keeps a slow send from stacking runs; the command also
 * claims each row by flipping it to `sending` first, so a double send is
 * impossible even if this guard is lost.
 */
Schedule::command(SendScheduledCampaigns::class)
    ->everyMinute()
    ->withoutOverlapping();

/**
 * Verification reminders. Hourly, not every three days, and that is deliberate:
 * the three-day cadence is enforced per address by
 * `VerificationReminders::dueQuery()`, so this schedule only decides how quickly
 * a newly-due address gets picked up. Hourly also means a batch capped at
 * `reminders.batch_size` drains within a day even on a large backlog.
 *
 * `hourly()` is minute 0, which matters on shared hosting: Namecheap's acceptable
 * use policy forbids cron intervals under five minutes, so `/admin/cron-setup`
 * documents `*_/5 * * * *` for `schedule:run`. Minute 0 is in that set, so this
 * event fires. Any frequency chosen here must land on a multiple of five for the
 * same reason — `everyFourMinutes()` would silently never run in production.
 *
 * `withoutOverlapping()` plus the command's own compare-and-swap claim on
 * `last_verification_reminder_at` means neither an overlapping schedule run nor a
 * simultaneous `GET /api/v1/cron/run` can send the same reminder twice.
 *
 * On Namecheap shared hosting this whole file only runs if `schedule:run` is
 * wired to cron. `/admin/cron-setup` documents both that and the direct
 * single-command entry, which is the option that does not depend on the
 * scheduler being installed at all.
 */
Schedule::command(SendVerificationReminders::class, ['--trigger=schedule'])
    ->hourly()
    ->withoutOverlapping();
