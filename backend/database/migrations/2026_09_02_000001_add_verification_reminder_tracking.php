<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tracking for the unverified-waitlister reminder cycle, plus a generic run log
 * for everything the cron triggers.
 *
 * Two separate concerns, one migration, because they ship together and neither
 * is useful without the other: the columns decide who is due, the run log is how
 * an administrator sees that the decision is actually being made on schedule.
 *
 * Index names are set explicitly. MySQL caps identifiers at 64 characters and
 * Laravel's generated name for the composite below would be
 * `waitlist_entries_verified_last_verification_reminder_at_index` (61) — under
 * the limit but close enough that a future column rename could push it over,
 * which is the failure MigrationMysqlCompatibilityTest exists to catch.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('waitlist_entries', function (Blueprint $table) {
            // How many reminders this address has received. Enforces
            // config('reminders.max_per_entry') so a dead address is eventually
            // left alone.
            $table->unsignedInteger('verification_reminders_sent')->default(0)->after('verification_token');

            // Claim marker AND cadence marker. The command compare-and-swaps on
            // this value before sending, which is what makes a double cron run
            // harmless.
            $table->timestamp('last_verification_reminder_at')->nullable()->after('verification_reminders_sent');

            // Last transport error for this address, so the admin page can show
            // why one recipient is stuck without trawling the log file.
            $table->text('last_verification_reminder_error')->nullable()->after('last_verification_reminder_at');

            // The eligibility query filters on `verified` then orders by the
            // reminder timestamp; this covers both.
            $table->index(['verified', 'last_verification_reminder_at'], 'wl_entries_reminder_due_idx');
        });

        Schema::create('cron_runs', function (Blueprint $table) {
            $table->id();
            // Artisan signature, e.g. `waitlist:send-verification-reminders`.
            // 191 keeps the index inside the 767-byte InnoDB budget on utf8mb4.
            $table->string('task', 191);
            $table->string('trigger', 32)->default('schedule');   // schedule | http | manual
            $table->string('status', 32)->default('running');      // running | success | partial | failed
            $table->unsignedInteger('processed')->default(0);
            $table->unsignedInteger('succeeded')->default(0);
            $table->unsignedInteger('failed')->default(0);
            $table->unsignedInteger('skipped')->default(0);
            $table->unsignedInteger('duration_ms')->nullable();
            $table->text('message')->nullable();                   // summary, or the last error
            $table->json('meta')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['task', 'created_at'], 'cron_runs_task_created_idx');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cron_runs');

        Schema::table('waitlist_entries', function (Blueprint $table) {
            $table->dropIndex('wl_entries_reminder_due_idx');
            $table->dropColumn([
                'verification_reminders_sent',
                'last_verification_reminder_at',
                'last_verification_reminder_error',
            ]);
        });
    }
};
