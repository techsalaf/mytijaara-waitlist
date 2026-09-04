<?php

namespace Tests\Feature;

use App\Models\CronRun;
use App\Models\WaitlistEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The HTTP cron trigger and the admin status feed.
 *
 * The endpoint replaced an unauthenticated closure that called
 * `Artisan::call('campaigns:send-due')`, so these tests exist as much to pin the
 * fix as to describe the feature. The three properties that matter:
 *
 *   - no token configured => 503 for everyone (fail closed);
 *   - wrong token => 401, compared with `hash_equals`;
 *   - the command is never taken from the request, only looked up in the fixed
 *     `config('cron.tasks')` allowlist.
 */
class CronEndpointTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'test-cron-token-0123456789abcdef';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'cron.token' => self::TOKEN,
            'cron.tasks' => [
                'campaigns' => 'campaigns:send-due',
                'reminders' => 'waitlist:send-verification-reminders',
            ],
            'reminders.enabled' => true,
            'reminders.interval_days' => 3,
        ]);
    }

    private function url(array $query = []): string
    {
        return $this->api.'/cron/run'.($query ? '?'.http_build_query($query) : '');
    }

    /** @param  array<string,mixed>  $attributes */
    private function unverifiedEntry(array $attributes = []): WaitlistEntry
    {
        static $n = 0;
        $n++;

        $createdAt = $attributes['created_at'] ?? null;
        unset($attributes['created_at']);

        $entry = WaitlistEntry::create(array_merge([
            'public_id' => 'wl_cron_'.$n,
            'name' => 'Cron Person '.$n,
            'email' => "cron{$n}@example.com",
            'role' => 'customer',
            'status' => 'pending',
            'verified' => false,
            'verification_token' => Str::random(48),
            'referral_code' => 'CRON'.$n,
            'position' => $n,
        ], $attributes));

        if ($createdAt !== null) {
            $entry->forceFill(['created_at' => $createdAt])->save();
        }

        return $entry->refresh();
    }

    // -----------------------------------------------------------------------
    // Authentication.
    // -----------------------------------------------------------------------

    public function test_an_unconfigured_token_disables_the_endpoint(): void
    {
        config(['cron.token' => '']);

        $this->getJson($this->url())
            ->assertStatus(503)
            ->assertJsonPath('status', 'unconfigured');
    }

    public function test_an_unconfigured_token_cannot_be_bypassed_by_sending_an_empty_one(): void
    {
        config(['cron.token' => '']);

        $this->getJson($this->url(['token' => '']))->assertStatus(503);
        $this->withHeader('X-Cron-Token', '')->getJson($this->url())->assertStatus(503);
    }

    public function test_a_missing_token_is_rejected(): void
    {
        $this->getJson($this->url())
            ->assertStatus(401)
            ->assertJsonPath('status', 'unauthorized');
    }

    public function test_a_wrong_token_is_rejected(): void
    {
        $this->getJson($this->url(['token' => 'nope']))->assertStatus(401);
        // A correct prefix must not help: the comparison is constant-time and
        // whole-string.
        $this->getJson($this->url(['token' => substr(self::TOKEN, 0, 20)]))->assertStatus(401);
    }

    public function test_the_right_token_is_accepted_in_the_query_string(): void
    {
        $this->getJson($this->url(['token' => self::TOKEN]))
            ->assertOk()
            ->assertJsonPath('status', 'ok');
    }

    public function test_the_right_token_is_accepted_in_the_header(): void
    {
        $this->withHeader('X-Cron-Token', self::TOKEN)
            ->getJson($this->url())
            ->assertOk()
            ->assertJsonPath('status', 'ok');
    }

    public function test_post_is_accepted_as_well_as_get(): void
    {
        $this->postJson($this->url(['token' => self::TOKEN]))->assertOk();
    }

    // -----------------------------------------------------------------------
    // The allowlist.
    // -----------------------------------------------------------------------

    public function test_all_runs_every_allowlisted_task(): void
    {
        Mail::fake();

        $response = $this->getJson($this->url(['token' => self::TOKEN, 'task' => 'all']))->assertOk();

        $response->assertJsonPath('tasks.campaigns.command', 'campaigns:send-due');
        $response->assertJsonPath('tasks.reminders.command', 'waitlist:send-verification-reminders');
        $response->assertJsonPath('tasks.campaigns.exitCode', 0);
        $response->assertJsonPath('tasks.reminders.exitCode', 0);
    }

    public function test_a_single_task_can_be_selected_by_key(): void
    {
        Mail::fake();

        $response = $this->getJson($this->url(['token' => self::TOKEN, 'task' => 'reminders']))->assertOk();

        $response->assertJsonPath('tasks.reminders.command', 'waitlist:send-verification-reminders');
        $response->assertJsonMissingPath('tasks.campaigns');
    }

    public function test_an_unknown_task_key_is_refused(): void
    {
        $this->getJson($this->url(['token' => self::TOKEN, 'task' => 'nonsense']))
            ->assertStatus(422)
            ->assertJsonPath('status', 'unknown_task');
    }

    public function test_a_request_cannot_smuggle_an_arbitrary_command(): void
    {
        // The whole point of the allowlist. `task` is a key, never a command, so
        // none of these can reach Artisan even with a valid token.
        foreach ([
            'migrate:fresh',
            'db:wipe',
            'campaigns:send-due --force',
            'waitlist:send-verification-reminders',   // the value, not the key
            'tinker',
        ] as $attempt) {
            $this->getJson($this->url(['token' => self::TOKEN, 'task' => $attempt]))
                ->assertStatus(422)
                ->assertJsonPath('status', 'unknown_task');
        }

        // Nothing ran, so nothing was logged.
        $this->assertSame(0, CronRun::count());
    }

    // -----------------------------------------------------------------------
    // End-to-end: the endpoint actually sends the reminder.
    // -----------------------------------------------------------------------

    public function test_the_endpoint_sends_a_due_reminder_and_logs_the_run_as_http(): void
    {
        Mail::fake();
        $entry = $this->unverifiedEntry(['created_at' => now()->subDays(5)]);

        $this->getJson($this->url(['token' => self::TOKEN, 'task' => 'reminders']))->assertOk();

        Mail::assertSent(\App\Mail\VerificationReminderMail::class);
        $this->assertSame(1, $entry->fresh()->verification_reminders_sent);

        $run = CronRun::where('task', 'waitlist:send-verification-reminders')->latest('id')->first();
        $this->assertNotNull($run);
        $this->assertSame('http', $run->trigger, 'the run log must distinguish an HTTP hit from the scheduler');
        $this->assertSame('success', $run->status);
    }

    public function test_two_endpoint_hits_do_not_double_send(): void
    {
        Mail::fake();
        $entry = $this->unverifiedEntry(['created_at' => now()->subDays(5)]);

        $this->getJson($this->url(['token' => self::TOKEN, 'task' => 'reminders']))->assertOk();
        $this->getJson($this->url(['token' => self::TOKEN, 'task' => 'reminders']))->assertOk();

        Mail::assertSentCount(1);
        $this->assertSame(1, $entry->fresh()->verification_reminders_sent);
    }

    // -----------------------------------------------------------------------
    // Admin status + manual trigger.
    // -----------------------------------------------------------------------

    public function test_the_status_feed_requires_authentication(): void
    {
        $this->getJson($this->api.'/cron/status')->assertStatus(401);
    }

    public function test_the_status_feed_requires_the_settings_view_permission(): void
    {
        $this->actingAsPermissionless();

        $this->getJson($this->api.'/cron/status')->assertStatus(403);
    }

    public function test_the_status_feed_reports_the_cadence_and_the_counts(): void
    {
        Mail::fake();
        $this->unverifiedEntry(['created_at' => now()->subDays(5)]);       // due
        $this->unverifiedEntry(['created_at' => now()]);                    // pending, not due
        $this->unverifiedEntry(['verified' => true, 'verification_token' => null]);

        $this->actingAsWithPermissions(['settings.view']);

        $response = $this->getJson($this->api.'/cron/status')->assertOk();

        $response->assertJsonPath('data.enabled', true);
        $response->assertJsonPath('data.intervalDays', 3);
        $response->assertJsonPath('data.command', 'waitlist:send-verification-reminders');
        $response->assertJsonPath('data.unverifiedTotal', 2);
        $response->assertJsonPath('data.eligibleTotal', 2);
        $response->assertJsonPath('data.dueNow', 1);
        $response->assertJsonPath('data.tokenConfigured', true);
        // The token value itself must never reach the client.
        $this->assertStringNotContainsString(self::TOKEN, $response->getContent());
    }

    public function test_the_status_feed_lists_the_http_task_keys_without_the_commands(): void
    {
        $this->actingAsWithPermissions(['settings.view']);

        $this->getJson($this->api.'/cron/status')
            ->assertOk()
            ->assertJsonPath('data.httpTaskKeys', ['campaigns', 'reminders']);
    }

    // -----------------------------------------------------------------------
    // Server paths. The setup page builds the cPanel command out of these, so a
    // missing or wrong key here is a command an operator pastes and never
    // notices did not run.
    // -----------------------------------------------------------------------

    public function test_the_status_feed_reports_the_real_install_paths(): void
    {
        $this->actingAsWithPermissions(['settings.view']);

        $response = $this->getJson($this->api.'/cron/status')->assertOk();

        // Not "some string": the actual directory this test is executing from.
        // If `basePath` were ever derived from a request header or a config
        // guess, this is the assertion that breaks.
        $response->assertJsonPath('data.paths.basePath', base_path());
        $response->assertJsonPath('data.paths.artisan', base_path('artisan'));
        $response->assertJsonPath('data.paths.logPath', storage_path('logs/laravel.log'));
        $response->assertJsonPath('data.paths.cronLogPath', storage_path('logs/cron.log'));
        $response->assertJsonPath('data.paths.phpVersion', PHP_VERSION);
        $response->assertJsonPath('data.paths.phpSapi', PHP_SAPI);

        // `artisan` must be the file inside `basePath`, because the page pastes
        // them into one command.
        $paths = $response->json('data.paths');
        $this->assertStringStartsWith($paths['basePath'], $paths['artisan']);
        $this->assertTrue(is_file($paths['artisan']), 'the artisan path the page shows must exist');
    }

    public function test_the_reported_php_candidates_are_all_real_executables(): void
    {
        $this->actingAsWithPermissions(['settings.view']);

        $candidates = $this->getJson($this->api.'/cron/status')
            ->assertOk()
            ->json('data.paths.phpCliCandidates');

        $this->assertIsArray($candidates);
        // The list is a probe, not a guess. Anything in it has to be runnable, or
        // the page recommends a cron entry that cannot execute. On Windows the
        // probe finds nothing, which is the correct answer there.
        foreach ($candidates as $path) {
            $this->assertTrue(is_file($path), "{$path} was reported but is not a file");
            $this->assertTrue(is_executable($path), "{$path} was reported but is not executable");
        }
        // Keys are sequential so `json_encode` emits an array, which is what the
        // TypeScript `string[]` on the client expects.
        $this->assertSame(array_values($candidates), $candidates);
    }

    public function test_the_paths_block_carries_no_secret(): void
    {
        config([
            'app.key' => 'base64:'.base64_encode(str_repeat('k', 32)),
            'database.connections.mysql.password' => 'sup3r-s3cret-db-password',
        ]);

        $this->actingAsWithPermissions(['settings.view']);

        $body = $this->getJson($this->api.'/cron/status')->assertOk()->getContent();

        // The setup page renders every value in `paths` verbatim, so anything
        // sensitive that leaks in here is on screen and in the DOM.
        $this->assertStringNotContainsString(self::TOKEN, $body);
        $this->assertStringNotContainsString(config('app.key'), $body);
        $this->assertStringNotContainsString('sup3r-s3cret-db-password', $body);
        // No env dump either: a `paths` block that grew an `env` key would drag
        // every credential on the box onto an admin page.
        $this->assertArrayNotHasKey('env', $this->getJson($this->api.'/cron/status')->json('data.paths'));
    }

    public function test_run_now_requires_a_write_permission(): void
    {
        $this->actingAsWithPermissions(['settings.view']);

        $this->postJson($this->api.'/cron/run-now')->assertStatus(403);
    }

    public function test_run_now_sends_and_marks_the_run_as_manual(): void
    {
        Mail::fake();
        $entry = $this->unverifiedEntry(['created_at' => now()->subDays(5)]);

        $this->actingAsWithPermissions(['settings.view', 'settings.edit-general']);

        $this->postJson($this->api.'/cron/run-now', ['task' => 'reminders'])
            ->assertOk()
            ->assertJsonPath('data.command', 'waitlist:send-verification-reminders')
            ->assertJsonPath('data.exitCode', 0);

        $this->assertSame(1, $entry->fresh()->verification_reminders_sent);

        $run = CronRun::where('task', 'waitlist:send-verification-reminders')->latest('id')->first();
        $this->assertSame('manual', $run->trigger);
    }

    public function test_run_now_refuses_a_task_outside_the_allowlist(): void
    {
        $this->actingAsWithPermissions(['settings.view', 'settings.edit-general']);

        $this->postJson($this->api.'/cron/run-now', ['task' => 'migrate:fresh'])
            ->assertStatus(422);
    }
}
