<?php

use App\Console\Commands\SendScheduledCampaigns;
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
 * `withoutOverlapping()` keeps a slow send from stacking runs; the command also
 * claims each row by flipping it to `sending` first, so a double send is
 * impossible even if this guard is lost.
 */
Schedule::command(SendScheduledCampaigns::class)
    ->everyMinute()
    ->withoutOverlapping();
