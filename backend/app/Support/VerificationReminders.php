<?php

namespace App\Support;

use App\Models\CronRun;
use App\Models\Unsubscribe;
use App\Models\WaitlistEntry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Who is due a verification reminder, and what the reminder cycle looks like
 * right now.
 *
 * This class is the single definition of "eligible". The console command sends
 * to whatever `dueQuery()` returns and the admin monitoring endpoint counts
 * whatever `dueQuery()` returns, so the number an administrator reads is the
 * number that will actually be mailed. Two implementations of that predicate
 * would drift the first time the cadence changed.
 *
 * Eligibility, in full:
 *
 *  1. `verified = false`. The whole point. Re-checked immediately before each
 *     individual send as well, because a user can confirm their address in the
 *     seconds between the query and the SMTP handshake.
 *  2. Not soft-deleted (Eloquent's default scope).
 *  3. `status <> 'unsubscribed'` and the address is absent from `unsubscribes`.
 *     Both are checked because they are set by different flows: the admin panel
 *     writes the status, the one-click footer link writes the table.
 *  4. A `verification_token` exists, or one can be minted. Without it the CTA in
 *     the mail would be a dead link, and a reminder whose button does nothing is
 *     worse than no reminder.
 *  5. `COALESCE(last_verification_reminder_at, created_at)` is at least
 *     `interval_days` old. Anchoring the first nudge to `created_at` is what
 *     stops a fresh signup being nudged minutes after its welcome email.
 *  6. `verification_reminders_sent < max_per_entry`, when that cap is enabled.
 */
class VerificationReminders
{
    /** Days between nudges. */
    public static function intervalDays(): int
    {
        return (int) config('reminders.interval_days', 3);
    }

    /** Hard cap per address; 0 means unlimited. */
    public static function maxPerEntry(): int
    {
        return (int) config('reminders.max_per_entry', 5);
    }

    /** Rows to process in one invocation. */
    public static function batchSize(): int
    {
        return (int) config('reminders.batch_size', 50);
    }

    /** Rows to read per database chunk. */
    public static function chunkSize(): int
    {
        return (int) config('reminders.chunk_size', 25);
    }

    public static function isEnabled(): bool
    {
        return (bool) config('reminders.enabled', true);
    }

    /**
     * The cutoff: anything last touched at or before this moment is due.
     */
    public static function cutoff(?Carbon $now = null): Carbon
    {
        return ($now ?? now())->copy()->subDays(self::intervalDays());
    }

    /**
     * Every unverified entry that is still a legitimate recipient, ignoring
     * cadence. This is the denominator on the admin page: "how many people have
     * not confirmed and could still be nudged".
     *
     * @return Builder<WaitlistEntry>
     */
    public static function pendingQuery(): Builder
    {
        return WaitlistEntry::query()
            ->where('verified', false)
            ->where('status', '<>', 'unsubscribed')
            ->whereNotIn('email', function ($q) {
                $q->select('email')->from((new Unsubscribe)->getTable());
            });
    }

    /**
     * Entries that are due right now. `pendingQuery()` plus the cadence gate and
     * the per-address cap.
     *
     * Deliberately unordered so it can be counted directly. The command applies
     * `dueOrder()` on top; a raw ORDER BY inside an aggregate query is not
     * portable across MySQL and the SQLite the suite runs on.
     *
     * @return Builder<WaitlistEntry>
     */
    public static function dueQuery(?Carbon $now = null): Builder
    {
        $cutoff = self::cutoff($now);
        $max = self::maxPerEntry();

        $query = self::pendingQuery()
            ->whereRaw(
                'COALESCE('.self::col('last_verification_reminder_at').', '.self::col('created_at').') <= ?',
                [$cutoff],
            );

        if ($max > 0) {
            $query->where('verification_reminders_sent', '<', $max);
        }

        return $query;
    }

    /**
     * Oldest touch first: in a batch that cannot hold everyone, the address that
     * has been waiting longest for its next nudge gets the slot.
     *
     * @param  Builder<WaitlistEntry>  $query
     * @return Builder<WaitlistEntry>
     */
    public static function dueOrder(Builder $query): Builder
    {
        return $query->orderByRaw(
            'COALESCE('.self::col('last_verification_reminder_at').', '.self::col('created_at').') asc',
        );
    }

    /** Quote a `waitlist_entries` column for the active connection's grammar. */
    private static function col(string $column): string
    {
        return DB::connection()->getQueryGrammar()->wrap('waitlist_entries.'.$column);
    }

    /**
     * Everything `/admin/cron-setup` displays. One method so the page cannot
     * show a mixture of values read at different instants.
     *
     * @return array<string,mixed>
     */
    public static function stats(): array
    {
        $task = 'waitlist:send-verification-reminders';

        $lastRun = CronRun::where('task', $task)->latest('id')->first();
        $lastSuccess = CronRun::where('task', $task)
            ->whereIn('status', ['success', 'partial'])
            ->latest('id')
            ->first();
        $lastAnyRun = CronRun::latest('id')->first();

        $window = now()->subDays(30);

        $totals = CronRun::where('task', $task)
            ->where('created_at', '>=', $window)
            ->selectRaw('COALESCE(SUM(succeeded),0) as sent, COALESCE(SUM(failed),0) as failed, COUNT(*) as runs')
            ->first();

        $lastError = CronRun::where('task', $task)
            ->where('failed', '>', 0)
            ->whereNotNull('message')
            ->latest('id')
            ->first();

        $lastReminderAt = WaitlistEntry::max('last_verification_reminder_at');

        return [
            'enabled' => self::isEnabled(),
            'intervalDays' => self::intervalDays(),
            'maxPerEntry' => self::maxPerEntry(),
            'batchSize' => self::batchSize(),
            'command' => $task,
            'httpTaskKeys' => array_keys((array) config('cron.tasks', [])),
            'tokenConfigured' => config('cron.token') !== '',
            'paths' => self::paths(),

            'unverifiedTotal' => (int) WaitlistEntry::where('verified', false)->count(),
            'eligibleTotal' => (int) self::pendingQuery()->count(),
            'dueNow' => (int) self::dueQuery()->count(),
            'cappedOut' => self::maxPerEntry() > 0
                ? (int) self::pendingQuery()->where('verification_reminders_sent', '>=', self::maxPerEntry())->count()
                : 0,

            'remindersSent30d' => (int) ($totals->sent ?? 0),
            'remindersFailed30d' => (int) ($totals->failed ?? 0),
            'runs30d' => (int) ($totals->runs ?? 0),
            'lastReminderAt' => $lastReminderAt ? Carbon::parse($lastReminderAt)->toIso8601String() : null,

            'lastRun' => self::runPayload($lastRun),
            'lastSuccessfulRun' => self::runPayload($lastSuccess),
            'lastAnyTaskRun' => self::runPayload($lastAnyRun),
            'lastError' => $lastError?->message,
            'lastErrorAt' => $lastError?->created_at?->toIso8601String(),

            // "Does the scheduler look alive?" A run inside the last 48 hours is
            // the signal, deliberately loose: the recommended cPanel cadence is
            // hourly, but a host under load can miss several in a row without
            // anything actually being wrong.
            'schedulerHealthy' => $lastAnyRun !== null && $lastAnyRun->created_at->gt(now()->subHours(48)),
            'recentRuns' => CronRun::where('task', $task)
                ->latest('id')
                ->limit(10)
                ->get()
                ->map(fn (CronRun $r) => self::runPayload($r))
                ->all(),
        ];
    }

    /**
     * The literal strings an operator has to paste into cPanel, read off the
     * server that will actually run the cron rather than guessed by hand.
     *
     * This exists because every wrong cron entry we have ever debugged was a
     * wrong path. `base_path()` is the real install directory, and
     * `phpCliCandidates` is the subset of the usual shared-hosting PHP binaries
     * that genuinely exist on THIS machine, probed not assumed. The admin page
     * builds its copy-paste command from these values, so the command it shows
     * is correct on first paste.
     *
     * `phpBinary` is the binary serving this HTTP request, so on cPanel it is
     * normally a CGI/FPM binary and NOT what cron should call. It is reported
     * only so the page can say so out loud.
     *
     * @return array<string,mixed>
     */
    public static function paths(): array
    {
        return [
            'basePath' => base_path(),
            'artisan' => base_path('artisan'),
            'appUrl' => rtrim((string) config('app.url', ''), '/'),
            'logPath' => storage_path('logs/laravel.log'),
            'cronLogPath' => storage_path('logs/cron.log'),
            'phpVersion' => PHP_VERSION,
            'phpSapi' => PHP_SAPI,
            'phpBinary' => PHP_BINARY,
            'phpCliCandidates' => self::phpCliCandidates(),
        ];
    }

    /**
     * Shared-hosting PHP CLI locations that exist and are executable here.
     *
     * The list is fixed and checked in, never taken from input: this only ever
     * stats a hardcoded set of paths. `@` suppresses the open_basedir warning a
     * restricted host raises for paths outside its allowed tree; a suppressed
     * path simply does not make the list.
     *
     * @return list<string>
     */
    private static function phpCliCandidates(): array
    {
        $candidates = [
            '/usr/local/bin/php',
            '/usr/bin/php',
            '/opt/cpanel/ea-php84/root/usr/bin/php',
            '/opt/cpanel/ea-php83/root/usr/bin/php',
            '/opt/cpanel/ea-php82/root/usr/bin/php',
            '/opt/cpanel/ea-php81/root/usr/bin/php',
            '/opt/alt/php84/usr/bin/php',
            '/opt/alt/php83/usr/bin/php',
            '/opt/alt/php82/usr/bin/php',
            '/opt/alt/php81/usr/bin/php',
            '/usr/local/lsws/lsphp84/bin/lsphp',
            '/usr/local/lsws/lsphp83/bin/lsphp',
            '/usr/local/lsws/lsphp82/bin/lsphp',
        ];

        $found = [];

        foreach ($candidates as $path) {
            if (@is_file($path) && @is_executable($path)) {
                $found[] = $path;
            }
        }

        return $found;
    }

    /**
     * @return array<string,mixed>|null
     */
    private static function runPayload(?CronRun $run): ?array
    {
        if (! $run) {
            return null;
        }

        return [
            'id' => $run->id,
            'task' => $run->task,
            'trigger' => $run->trigger,
            'status' => $run->status,
            'processed' => $run->processed,
            'succeeded' => $run->succeeded,
            'failed' => $run->failed,
            'skipped' => $run->skipped,
            'durationMs' => $run->duration_ms,
            'message' => $run->message,
            'startedAt' => $run->started_at?->toIso8601String(),
            'finishedAt' => $run->finished_at?->toIso8601String(),
        ];
    }
}
