<?php

namespace Tests\Feature;

use App\Models\SystemHealthSample;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Gate tests for the system health module.
 *
 * The page previously rendered five hardcoded statuses and a 24-point latency
 * chart built from Math.random(). These tests pin the replacement: every number
 * comes from a probe that actually ran, a broken dependency is reported as
 * `down` rather than crashing the endpoint, and the chart reads recorded samples.
 */
class SystemHealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_runs_every_probe_and_reports_a_status(): void
    {
        $this->actingAsRole('super_admin');

        $data = $this->getJson("{$this->api}/system/health")->assertOk()->json('data');

        $keys = array_column($data['checks'], 'key');
        sort($keys);
        $this->assertSame(['cache', 'database', 'mail', 'queue', 'storage'], $keys);

        // The database is reachable inside a test, so its probe must be healthy
        // and must have measured a real elapsed time rather than reporting null.
        $db = collect($data['checks'])->firstWhere('key', 'database');
        $this->assertSame('ok', $db['status']);
        $this->assertIsInt($db['latencyMs']);

        $this->assertContains($data['status'], ['ok', 'degraded', 'down']);
        $this->assertArrayHasKey('checkedAt', $data);
        $this->assertArrayHasKey('pending', $data['queue']);
        $this->assertArrayHasKey('lastHour', $data['errors']);
        $this->assertArrayHasKey('writable', $data['storage']);
    }

    public function test_queue_depth_reads_the_real_jobs_tables(): void
    {
        $this->actingAsRole('super_admin');

        DB::table('jobs')->insert([
            'queue' => 'default',
            'payload' => '{}',
            'attempts' => 0,
            'available_at' => time() - 120,
            'created_at' => time() - 120,
        ]);

        $data = $this->getJson("{$this->api}/system/health")->assertOk()->json('data');

        $this->assertSame(1, $data['queue']['pending']);
        $this->assertGreaterThanOrEqual(120, $data['queue']['oldestPendingSeconds']);
    }

    public function test_failed_jobs_bring_the_overall_status_down(): void
    {
        $this->actingAsRole('super_admin');

        DB::table('failed_jobs')->insert([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'connection' => 'database',
            'queue' => 'default',
            'payload' => '{}',
            'exception' => 'boom',
            'failed_at' => now(),
        ]);

        $data = $this->getJson("{$this->api}/system/health")->assertOk()->json('data');

        $queue = collect($data['checks'])->firstWhere('key', 'queue');
        $this->assertSame('down', $queue['status']);
        // The overall status is the worst of the individual probes.
        $this->assertSame('down', $data['status']);
    }

    public function test_unconfigured_smtp_is_reported_as_degraded_not_healthy(): void
    {
        $this->actingAsRole('super_admin');

        // No `smtp` settings row exists, so the mail probe has nothing enabled.
        $data = $this->getJson("{$this->api}/system/health")->assertOk()->json('data');

        $mail = collect($data['checks'])->firstWhere('key', 'mail');
        $this->assertSame('degraded', $mail['status']);
        $this->assertStringContainsString('not configured', $mail['detail']);
    }

    public function test_each_probe_records_a_sample_for_the_chart(): void
    {
        $this->actingAsRole('super_admin');

        $this->assertSame(0, SystemHealthSample::count());

        $this->getJson("{$this->api}/system/health")->assertOk();
        $this->getJson("{$this->api}/system/health")->assertOk();

        $this->assertSame(2, SystemHealthSample::count());

        $history = $this->getJson("{$this->api}/system/health/history?hours=24")
            ->assertOk()
            ->assertJsonPath('meta.hours', 24)
            ->json('data');

        $this->assertCount(2, $history);
        $this->assertIsInt($history[0]['dbLatencyMs']);
    }

    public function test_history_excludes_samples_outside_the_window(): void
    {
        $this->actingAsRole('super_admin');

        // `created_at` is the only timestamp on the model and is not fillable,
        // so the aged row is written and then backdated explicitly.
        SystemHealthSample::create(['status' => 'ok', 'db_latency_ms' => 5])
            ->forceFill(['created_at' => now()->subDays(3)])->save();
        SystemHealthSample::create(['status' => 'ok', 'db_latency_ms' => 6]);

        $this->getJson("{$this->api}/system/health/history?hours=24")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson("{$this->api}/system/health/history?hours=168")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_history_window_is_validated(): void
    {
        $this->actingAsRole('super_admin');

        $this->getJson("{$this->api}/system/health/history?hours=0")->assertStatus(422);
        $this->getJson("{$this->api}/system/health/history?hours=999")->assertStatus(422);
    }

    public function test_health_endpoints_require_the_settings_view_permission(): void
    {
        $this->actingAsPermissionless();

        $this->getJson("{$this->api}/system/health")->assertForbidden();
        $this->getJson("{$this->api}/system/health/history")->assertForbidden();
    }

    public function test_health_endpoint_requires_authentication(): void
    {
        $this->getJson("{$this->api}/system/health")->assertUnauthorized();
    }
}
