<?php

namespace Tests\Feature;

use App\Mail\VerificationReminderMail;
use App\Models\CronRun;
use App\Models\Unsubscribe;
use App\Models\WaitlistEntry;
use App\Support\VerificationReminders;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The reminder cycle for waitlisters who never confirmed their address.
 *
 * The seven scenarios named in the spec are each a test here, in order:
 * eligible-but-not-due, due after the interval, not due before it, verified
 * excluded immediately, two runs send once, a failed send is logged and
 * isolated, and a batch continues past a bad record. The rest cover the
 * boundaries those seven do not reach: unsubscribes, soft deletes, the
 * per-address cap, token minting, batch bounding, and `--dry-run`.
 *
 * Two transports are used deliberately. Tests that assert on *what was mailed*
 * use `Mail::fake()`. Tests that need a send to *fail* cannot: `MailFake` never
 * builds a message, so it never dispatches `MessageSending`, which is the only
 * clean injection point for a transport error. Those tests run on the `array`
 * mailer from phpunit.xml and assert against the database instead.
 */
class VerificationReminderTest extends TestCase
{
    use RefreshDatabase;

    private const COMMAND = 'waitlist:send-verification-reminders';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'reminders.enabled' => true,
            'reminders.interval_days' => 3,
            'reminders.max_per_entry' => 5,
            'reminders.batch_size' => 50,
            'reminders.chunk_size' => 25,
        ]);
    }

    /**
     * `created_at` is not fillable and the cadence anchors on it, so it is written
     * past the guard after the row exists.
     *
     * @param  array<string,mixed>  $attributes
     */
    private function entry(array $attributes = []): WaitlistEntry
    {
        static $n = 0;
        $n++;

        $createdAt = $attributes['created_at'] ?? null;
        unset($attributes['created_at']);

        $entry = WaitlistEntry::create(array_merge([
            'public_id' => 'wl_test_'.$n,
            'name' => 'Test Person '.$n,
            'email' => "person{$n}@example.com",
            'role' => 'customer',
            'status' => 'pending',
            'verified' => false,
            'verification_token' => Str::random(48),
            'referral_code' => 'REF'.$n,
            'position' => $n,
        ], $attributes));

        if ($createdAt !== null) {
            $entry->forceFill(['created_at' => $createdAt])->save();
        }

        return $entry->refresh();
    }

    /** Throw from the transport for one address only. */
    private function failSendsTo(string $email, string $reason = 'mailbox unavailable'): void
    {
        Event::listen(MessageSending::class, function (MessageSending $event) use ($email, $reason) {
            foreach ($event->message->getTo() as $address) {
                if ($address->getAddress() === $email) {
                    throw new \RuntimeException($reason);
                }
            }
        });
    }

    /** Reminder rows written by the audit trail, by type. */
    private function eventCount(string $type): int
    {
        return \App\Models\EmailEvent::where('type', $type)->count();
    }

    // -----------------------------------------------------------------------
    // Scenario 1 — a brand-new unverified signup is eligible but not yet due.
    // -----------------------------------------------------------------------

    public function test_new_unverified_signup_is_eligible_but_not_due_yet(): void
    {
        Mail::fake();
        $entry = $this->entry(['created_at' => now()]);

        $this->assertSame(1, VerificationReminders::pendingQuery()->count(), 'should count as pending');
        $this->assertSame(0, VerificationReminders::dueQuery()->count(), 'must not be due on signup day');

        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertNothingSent();
        $this->assertSame(0, $entry->fresh()->verification_reminders_sent);
        $this->assertNull($entry->fresh()->last_verification_reminder_at);
    }

    // -----------------------------------------------------------------------
    // Scenario 2 — unverified for longer than the interval gets one reminder.
    // -----------------------------------------------------------------------

    public function test_unverified_entry_older_than_the_interval_receives_a_reminder(): void
    {
        Mail::fake();
        $entry = $this->entry(['created_at' => now()->subDays(4)]);

        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertSent(VerificationReminderMail::class, function (VerificationReminderMail $mail) use ($entry) {
            return $mail->hasTo($entry->email) && $mail->attempt === 1;
        });

        $fresh = $entry->fresh();
        $this->assertSame(1, $fresh->verification_reminders_sent);
        $this->assertNotNull($fresh->last_verification_reminder_at);
        $this->assertNull($fresh->last_verification_reminder_error);

        $this->assertDatabaseHas('email_events', [
            'waitlist_entry_id' => $entry->id,
            'type' => 'verification_reminder',
        ]);
    }

    public function test_the_interval_is_measured_from_the_last_reminder_not_from_signup(): void
    {
        Mail::fake();
        // Signed up long ago, but nudged yesterday: not due.
        $entry = $this->entry([
            'created_at' => now()->subDays(30),
            'last_verification_reminder_at' => now()->subDay(),
            'verification_reminders_sent' => 1,
        ]);

        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertNothingSent();
        $this->assertSame(1, $entry->fresh()->verification_reminders_sent);
    }

    // -----------------------------------------------------------------------
    // Scenario 3 — inside the interval, nothing is sent.
    // -----------------------------------------------------------------------

    public function test_entry_inside_the_interval_receives_nothing(): void
    {
        Mail::fake();
        $this->entry(['created_at' => now()->subDays(2)]);

        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertNothingSent();
    }

    public function test_the_boundary_is_reached_at_exactly_the_interval(): void
    {
        Mail::fake();
        $entry = $this->entry(['created_at' => now()->subDays(3)->subSecond()]);

        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertSent(VerificationReminderMail::class);
        $this->assertSame(1, $entry->fresh()->verification_reminders_sent);
    }

    // -----------------------------------------------------------------------
    // Scenario 4 — verifying makes an address ineligible immediately.
    // -----------------------------------------------------------------------

    public function test_verified_entries_are_never_mailed(): void
    {
        Mail::fake();
        $this->entry([
            'created_at' => now()->subDays(10),
            'verified' => true,
            'verified_at' => now()->subDay(),
            'verification_token' => null,
        ]);

        $this->assertSame(0, VerificationReminders::pendingQuery()->count());
        $this->assertSame(0, VerificationReminders::dueQuery()->count());

        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertNothingSent();
    }

    public function test_verifying_mid_batch_cancels_that_recipients_reminder(): void
    {
        // The race the spec calls out. `sendOne()` re-reads the row immediately
        // before mailing, so a confirmation that lands after the page SELECT still
        // wins. Simulated by confirming the second recipient from inside the
        // transport while the first one is being sent.
        $first = $this->entry(['created_at' => now()->subDays(9), 'email' => 'first@example.com']);
        $second = $this->entry(['created_at' => now()->subDays(8), 'email' => 'racer@example.com']);

        Event::listen(MessageSending::class, function (MessageSending $event) use ($second) {
            foreach ($event->message->getTo() as $address) {
                if ($address->getAddress() === 'first@example.com') {
                    WaitlistEntry::where('id', $second->id)->update([
                        'verified' => true,
                        'verified_at' => now(),
                        'verification_token' => null,
                    ]);
                }
            }
        });

        $this->artisan(self::COMMAND)->assertExitCode(0);

        $this->assertSame(1, $first->fresh()->verification_reminders_sent);
        $this->assertSame(0, $second->fresh()->verification_reminders_sent, 'confirmed mid-batch, must not be mailed');
        $this->assertNull($second->fresh()->last_verification_reminder_at, 'no claim should have been written');
        $this->assertSame(1, $this->eventCount('verification_reminder'));

        $run = CronRun::where('task', self::COMMAND)->latest('id')->first();
        $this->assertSame(1, $run->succeeded);
        $this->assertSame(1, $run->skipped);
    }

    // -----------------------------------------------------------------------
    // Scenario 5 — repeated runs send exactly one reminder.
    // -----------------------------------------------------------------------

    public function test_three_consecutive_runs_send_only_one_reminder(): void
    {
        Mail::fake();
        $entry = $this->entry(['created_at' => now()->subDays(5)]);

        $this->artisan(self::COMMAND)->assertExitCode(0);
        $this->artisan(self::COMMAND)->assertExitCode(0);
        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertSentCount(1);
        $this->assertSame(1, $entry->fresh()->verification_reminders_sent);
    }

    public function test_the_claim_is_a_compare_and_swap_on_the_reminder_timestamp(): void
    {
        // The guard on its own: once one process moves the column, an UPDATE
        // carrying the previously-read value matches nothing. This is what makes
        // two overlapping cron runs harmless.
        $entry = $this->entry(['created_at' => now()->subDays(5)]);

        $firstClaim = WaitlistEntry::where('id', $entry->id)
            ->where('verified', false)
            ->whereNull('last_verification_reminder_at')
            ->update(['last_verification_reminder_at' => now()]);

        $secondClaim = WaitlistEntry::where('id', $entry->id)
            ->where('verified', false)
            ->whereNull('last_verification_reminder_at')
            ->update(['last_verification_reminder_at' => now()]);

        $this->assertSame(1, $firstClaim);
        $this->assertSame(0, $secondClaim, 'a second claim on a stale value must match no rows');
    }

    // -----------------------------------------------------------------------
    // Scenario 6 — a failed send is recorded, not swallowed.
    // -----------------------------------------------------------------------

    public function test_a_failed_send_is_recorded_on_the_row_and_in_the_run_log(): void
    {
        $entry = $this->entry(['created_at' => now()->subDays(6), 'email' => 'broken@example.com']);
        $this->failSendsTo('broken@example.com', 'SMTP said no');

        $this->artisan(self::COMMAND)->assertExitCode(1);

        $fresh = $entry->fresh();
        $this->assertStringContainsString('SMTP said no', (string) $fresh->last_verification_reminder_error);
        // The claim is kept on purpose: a broken address waits the full interval
        // rather than being retried on every cron tick.
        $this->assertNotNull($fresh->last_verification_reminder_at);
        $this->assertSame(0, $fresh->verification_reminders_sent, 'a failed send must not count against the cap');

        $run = CronRun::where('task', self::COMMAND)->latest('id')->first();
        $this->assertNotNull($run);
        $this->assertSame('failed', $run->status);
        $this->assertSame(1, $run->failed);
        $this->assertStringContainsString('SMTP said no', (string) $run->message);

        $this->assertDatabaseHas('email_events', [
            'waitlist_entry_id' => $entry->id,
            'type' => 'verification_reminder_failed',
        ]);
    }

    public function test_a_permanently_failing_address_is_not_retried_before_the_interval(): void
    {
        $entry = $this->entry(['created_at' => now()->subDays(6), 'email' => 'broken@example.com']);
        $this->failSendsTo('broken@example.com');

        $this->artisan(self::COMMAND)->assertExitCode(1);
        $this->artisan(self::COMMAND)->assertExitCode(0);   // nothing due, so nothing failed

        $this->assertSame(1, $this->eventCount('verification_reminder_failed'), 'one attempt per interval');
    }

    // -----------------------------------------------------------------------
    // Scenario 7 — one bad record does not stop the batch.
    // -----------------------------------------------------------------------

    public function test_one_failing_recipient_does_not_stop_the_others(): void
    {
        // Oldest touch first, so the failure lands on the first of three.
        $bad = $this->entry(['created_at' => now()->subDays(9), 'email' => 'bad@example.com']);
        $goodA = $this->entry(['created_at' => now()->subDays(8), 'email' => 'good-a@example.com']);
        $goodB = $this->entry(['created_at' => now()->subDays(7), 'email' => 'good-b@example.com']);

        $this->failSendsTo('bad@example.com');

        $this->artisan(self::COMMAND)->assertExitCode(0);

        $this->assertSame(0, $bad->fresh()->verification_reminders_sent);
        $this->assertStringContainsString('mailbox unavailable', (string) $bad->fresh()->last_verification_reminder_error);
        $this->assertSame(1, $goodA->fresh()->verification_reminders_sent);
        $this->assertSame(1, $goodB->fresh()->verification_reminders_sent);

        $run = CronRun::where('task', self::COMMAND)->latest('id')->first();
        $this->assertSame('partial', $run->status);
        $this->assertSame(2, $run->succeeded);
        $this->assertSame(1, $run->failed);
    }

    // -----------------------------------------------------------------------
    // Suppression, caps, tokens, ordering, switches.
    // -----------------------------------------------------------------------

    public function test_unsubscribed_addresses_are_suppressed_both_ways(): void
    {
        Mail::fake();

        $byStatus = $this->entry(['created_at' => now()->subDays(9), 'status' => 'unsubscribed']);
        $byTable = $this->entry(['created_at' => now()->subDays(9), 'email' => 'optout@example.com']);
        Unsubscribe::create(['email' => 'optout@example.com', 'reason' => 'test']);

        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertNothingSent();
        $this->assertSame(0, $byStatus->fresh()->verification_reminders_sent);
        $this->assertSame(0, $byTable->fresh()->verification_reminders_sent);
    }

    public function test_soft_deleted_entries_are_ignored(): void
    {
        Mail::fake();
        $entry = $this->entry(['created_at' => now()->subDays(9)]);
        $entry->delete();

        $this->assertSame(0, VerificationReminders::dueQuery()->count());
        $this->artisan(self::COMMAND)->assertExitCode(0);
        Mail::assertNothingSent();
    }

    public function test_the_per_address_cap_stops_the_cycle(): void
    {
        Mail::fake();
        config(['reminders.max_per_entry' => 2]);

        $entry = $this->entry([
            'created_at' => now()->subDays(30),
            'verification_reminders_sent' => 2,
            'last_verification_reminder_at' => now()->subDays(10),
        ]);

        $this->assertSame(0, VerificationReminders::dueQuery()->count());
        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertNothingSent();
        $this->assertSame(2, $entry->fresh()->verification_reminders_sent);
        $this->assertSame(1, VerificationReminders::stats()['cappedOut']);
    }

    public function test_a_cap_of_zero_means_unlimited(): void
    {
        Mail::fake();
        config(['reminders.max_per_entry' => 0]);

        $entry = $this->entry([
            'created_at' => now()->subDays(60),
            'verification_reminders_sent' => 99,
            'last_verification_reminder_at' => now()->subDays(10),
        ]);

        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertSent(VerificationReminderMail::class, fn (VerificationReminderMail $mail) => $mail->attempt === 100);
        $this->assertSame(100, $entry->fresh()->verification_reminders_sent);
    }

    public function test_the_final_reminder_is_labelled_as_final(): void
    {
        Mail::fake();
        config(['reminders.max_per_entry' => 3]);

        $this->entry([
            'created_at' => now()->subDays(30),
            'verification_reminders_sent' => 2,
            'last_verification_reminder_at' => now()->subDays(4),
        ]);

        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertSent(VerificationReminderMail::class, function (VerificationReminderMail $mail) {
            return $mail->attempt === 3
                && str_contains($mail->envelope()->subject, 'Last reminder')
                && str_contains($mail->render(), 'Final reminder');
        });
    }

    public function test_a_missing_verification_token_is_minted_before_sending(): void
    {
        Mail::fake();
        $entry = $this->entry(['created_at' => now()->subDays(5), 'verification_token' => null]);

        $this->artisan(self::COMMAND)->assertExitCode(0);

        $fresh = $entry->fresh();
        $this->assertNotNull($fresh->verification_token, 'the CTA would be a dead link without one');
        $this->assertSame(48, strlen($fresh->verification_token));

        Mail::assertSent(
            VerificationReminderMail::class,
            fn (VerificationReminderMail $mail) => str_contains($mail->render(), 'token='.$fresh->verification_token),
        );
    }

    public function test_the_batch_size_bounds_one_run_and_oldest_waits_go_first(): void
    {
        Mail::fake();
        config(['reminders.batch_size' => 2, 'reminders.chunk_size' => 1]);

        $oldest = $this->entry(['created_at' => now()->subDays(20), 'email' => 'oldest@example.com']);
        $middle = $this->entry(['created_at' => now()->subDays(15), 'email' => 'middle@example.com']);
        $newest = $this->entry(['created_at' => now()->subDays(4), 'email' => 'newest@example.com']);

        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertSentCount(2);
        $this->assertSame(1, $oldest->fresh()->verification_reminders_sent);
        $this->assertSame(1, $middle->fresh()->verification_reminders_sent);
        $this->assertSame(0, $newest->fresh()->verification_reminders_sent, 'newest waits for the next run');
    }

    public function test_the_limit_option_overrides_the_configured_batch_size(): void
    {
        Mail::fake();
        $this->entry(['created_at' => now()->subDays(20)]);
        $this->entry(['created_at' => now()->subDays(19)]);
        $this->entry(['created_at' => now()->subDays(18)]);

        $this->artisan(self::COMMAND, ['--limit' => 1])->assertExitCode(0);

        Mail::assertSentCount(1);
    }

    public function test_a_dry_run_sends_nothing_and_writes_nothing(): void
    {
        Mail::fake();
        $entry = $this->entry(['created_at' => now()->subDays(9)]);

        $this->artisan(self::COMMAND, ['--dry-run' => true])->assertExitCode(0);

        Mail::assertNothingSent();
        $this->assertSame(0, $entry->fresh()->verification_reminders_sent);
        $this->assertNull($entry->fresh()->last_verification_reminder_at);
        $this->assertSame(0, CronRun::count(), 'a dry run must not look like a real run');
    }

    public function test_a_dry_run_terminates_on_a_backlog_larger_than_one_chunk(): void
    {
        // Regression guard for the loop itself: a dry run writes nothing, so
        // without the handled-id filter the same page would be read forever.
        Mail::fake();
        config(['reminders.batch_size' => 5, 'reminders.chunk_size' => 2]);

        for ($i = 0; $i < 5; $i++) {
            $this->entry(['created_at' => now()->subDays(10 + $i)]);
        }

        $this->artisan(self::COMMAND, ['--dry-run' => true])->assertExitCode(0);

        Mail::assertNothingSent();
        $this->assertSame(0, CronRun::count());
    }

    public function test_the_master_switch_stops_all_sending(): void
    {
        Mail::fake();
        config(['reminders.enabled' => false]);
        $entry = $this->entry(['created_at' => now()->subDays(9)]);

        $this->artisan(self::COMMAND)->assertExitCode(0);

        Mail::assertNothingSent();
        $this->assertSame(0, $entry->fresh()->verification_reminders_sent);

        $run = CronRun::latest('id')->first();
        $this->assertSame('success', $run->status);
        $this->assertStringContainsString('Disabled', (string) $run->message);
    }

    public function test_a_successful_run_is_written_to_the_run_log(): void
    {
        Mail::fake();
        $this->entry(['created_at' => now()->subDays(9)]);

        $this->artisan(self::COMMAND, ['--trigger' => 'manual'])->assertExitCode(0);

        $run = CronRun::where('task', self::COMMAND)->latest('id')->first();
        $this->assertSame('manual', $run->trigger);
        $this->assertSame('success', $run->status);
        $this->assertSame(1, $run->succeeded);
        $this->assertSame(0, $run->failed);
        $this->assertNotNull($run->finished_at);
        $this->assertIsInt($run->duration_ms);
        $this->assertSame(1, $run->meta['dueAtStart']);
    }

    // -----------------------------------------------------------------------
    // Run log housekeeping. An hourly cron writes ~8,760 rows a year per task
    // and `stats()` never reads past 30 days, so the table has to be capped or
    // it grows forever to hold data no screen displays.
    // -----------------------------------------------------------------------

    /** `created_at` is guarded, so an aged run row is written past the guard. */
    private function agedRun(string $task, int $daysOld): CronRun
    {
        $run = CronRun::create([
            'task' => $task,
            'trigger' => 'schedule',
            'status' => 'success',
            'started_at' => now()->subDays($daysOld),
            'finished_at' => now()->subDays($daysOld),
        ]);

        $run->forceFill(['created_at' => now()->subDays($daysOld)])->save();

        return $run->refresh();
    }

    public function test_prune_removes_only_old_rows_of_the_named_task(): void
    {
        $stale = $this->agedRun(self::COMMAND, 120);
        $edge = $this->agedRun(self::COMMAND, 91);
        $recent = $this->agedRun(self::COMMAND, 29);
        $otherTask = $this->agedRun('campaigns:send-due', 400);

        $removed = CronRun::prune(self::COMMAND);

        $this->assertSame(2, $removed);
        $this->assertDatabaseMissing('cron_runs', ['id' => $stale->id]);
        $this->assertDatabaseMissing('cron_runs', ['id' => $edge->id]);
        $this->assertDatabaseHas('cron_runs', ['id' => $recent->id]);
        // Pruning one task must never touch another task's history: each task
        // calls prune for itself, and a cross-task delete would silently erase
        // the campaign log the moment reminders ran.
        $this->assertDatabaseHas('cron_runs', ['id' => $otherTask->id]);
    }

    public function test_prune_keeps_a_row_exactly_on_the_boundary(): void
    {
        // The comparison is strictly `<`, so the row at exactly 90 days survives
        // and the one a second older does not. Time has to be frozen for the
        // question to even be answerable: without it, `now()` inside `prune()`
        // runs milliseconds after `now()` in the fixture and every "exactly 90
        // days" row is already fractionally over the line.
        $this->freezeTime();

        $boundary = $this->agedRun(self::COMMAND, 90);

        $this->assertSame(0, CronRun::prune(self::COMMAND), 'exactly 90 days old is inside the window');
        $this->assertDatabaseHas('cron_runs', ['id' => $boundary->id]);

        // One second past it, and it goes.
        $boundary->forceFill(['created_at' => now()->subDays(90)->subSecond()])->save();

        $this->assertSame(1, CronRun::prune(self::COMMAND));
        $this->assertDatabaseMissing('cron_runs', ['id' => $boundary->id]);
    }

    public function test_prune_is_a_no_op_on_an_empty_log(): void
    {
        $this->assertSame(0, CronRun::prune(self::COMMAND));
    }

    public function test_a_real_run_prunes_the_log_and_keeps_its_own_row(): void
    {
        Mail::fake();
        $stale = $this->agedRun(self::COMMAND, 200);
        $this->entry(['created_at' => now()->subDays(5)]);

        $this->artisan(self::COMMAND)->assertExitCode(0);

        $this->assertDatabaseMissing('cron_runs', ['id' => $stale->id]);
        // The prune happens after `finish()`, so the row for this run is written
        // and still present. If it ever ran first, a crash between prune and
        // finish would lose the record of work that actually happened.
        $current = CronRun::where('task', self::COMMAND)->latest('id')->first();
        $this->assertNotNull($current);
        $this->assertSame(1, $current->succeeded);
        $this->assertSame(1, CronRun::where('task', self::COMMAND)->count());
    }

    public function test_a_dry_run_leaves_the_log_alone(): void
    {
        Mail::fake();
        $stale = $this->agedRun(self::COMMAND, 200);
        $this->entry(['created_at' => now()->subDays(5)]);

        $this->artisan(self::COMMAND, ['--dry-run' => true])->assertExitCode(0);

        // A dry run is read-only in both directions: it neither writes a run row
        // nor deletes one.
        $this->assertDatabaseHas('cron_runs', ['id' => $stale->id]);
        $this->assertSame(1, CronRun::count());
    }

    // -----------------------------------------------------------------------
    // Server paths surfaced to the admin page.
    // -----------------------------------------------------------------------

    public function test_stats_reports_the_paths_the_setup_page_pastes_into_cpanel(): void
    {
        $paths = VerificationReminders::stats()['paths'];

        $this->assertSame(base_path(), $paths['basePath']);
        $this->assertSame(base_path('artisan'), $paths['artisan']);
        $this->assertSame(storage_path('logs/laravel.log'), $paths['logPath']);
        $this->assertSame(storage_path('logs/cron.log'), $paths['cronLogPath']);
        $this->assertSame(PHP_VERSION, $paths['phpVersion']);
        $this->assertIsArray($paths['phpCliCandidates']);
    }

    public function test_the_reported_app_url_has_no_trailing_slash(): void
    {
        // The page concatenates this with `/api/v1/cron/run`; a trailing slash
        // would produce a double slash in the cURL fallback URL.
        config(['app.url' => 'https://mytijaara.com/']);

        $this->assertSame('https://mytijaara.com', VerificationReminders::stats()['paths']['appUrl']);
    }

    // -----------------------------------------------------------------------
    // The email body itself.
    // -----------------------------------------------------------------------

    public function test_the_reminder_body_names_itself_a_reminder_and_carries_a_live_cta(): void
    {
        $entry = $this->entry(['created_at' => now()->subDays(5), 'position' => 42]);

        $html = (new VerificationReminderMail($entry, 1))->render();

        $this->assertStringContainsString('still unconfirmed', $html);
        $this->assertStringContainsString('Confirm my email', $html);
        $this->assertStringContainsString('verify-email?token='.$entry->verification_token, $html);
        $this->assertStringContainsString('#42', $html, 'queue position is one of the things confirming protects');
        $this->assertStringContainsString('joined the MyTijaara waitlist', $html, 'must say why it arrived');
        $this->assertStringContainsString('unsubscribe?email=', $html);
        // It must not pretend to be a first welcome.
        $this->assertStringNotContainsString("You're in,", $html);
    }

    public function test_the_body_degrades_safely_when_no_token_can_be_shown(): void
    {
        $entry = $this->entry(['verification_token' => null]);

        $html = (new VerificationReminderMail($entry, 1))->render();

        $this->assertStringNotContainsString('Confirm my email', $html);
        $this->assertStringContainsString('fresh confirmation link', $html);
    }
}
