<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\VerificationReminders;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

/**
 * The server-side trigger for scheduled work, and the status feed behind
 * `/admin/cron-setup`.
 *
 * This exists because the deployment target is Namecheap shared hosting. There
 * is no supervisor, no systemd, no long-running worker; the only scheduling
 * primitive is a cPanel cron entry. Two shapes are supported and both end in the
 * same Artisan command:
 *
 *   1. `php /home/USER/api/artisan waitlist:send-verification-reminders`
 *      Preferred. No HTTP, no token, no web-server timeout.
 *   2. `curl -s "https://DOMAIN/api/v1/cron/run?token=..."`
 *      The fallback for accounts where cron cannot reach a PHP CLI binary.
 *
 * Security posture of the HTTP path, in order of importance:
 *
 *   - **The task is never taken from the request.** `?task=` is a key into the
 *     fixed `config('cron.tasks')` allowlist, so the worst a leaked URL can do is
 *     run the same reminder batch early. It can never send arbitrary mail or run
 *     an arbitrary command.
 *   - **No token configured means no endpoint.** An empty `CRON_TOKEN` returns
 *     503 for every request. Failing closed matters here: before this controller
 *     existed the route was a completely unauthenticated closure that called
 *     Artisan, so the previous state of the world was the vulnerability.
 *   - **`hash_equals`,** so a wrong token cannot be recovered a byte at a time.
 *   - The token is read from the request, never echoed back, and the admin page
 *     only ever receives the boolean `tokenConfigured`.
 */
class CronController extends Controller
{
    /**
     * GET /cron/run — token-protected trigger for the host's cron.
     *
     * Returns 200 with per-task exit codes and output. Cron on cPanel emails the
     * account owner whatever the command prints, so the body is written to be
     * readable in that email.
     */
    public function run(Request $request): JsonResponse
    {
        $configured = (string) config('cron.token', '');

        if ($configured === '') {
            return response()->json([
                'status' => 'unconfigured',
                'message' => 'CRON_TOKEN is not set on the server. See /admin/cron-setup.',
            ], 503);
        }

        // Header first so the token can stay out of access logs and Referer
        // headers; the query string is kept because cPanel's cron UI is often
        // limited to a bare `curl <url>`.
        $supplied = (string) ($request->header('X-Cron-Token') ?? $request->query('token') ?? '');

        if ($supplied === '' || ! hash_equals($configured, $supplied)) {
            Log::warning('cron trigger rejected', ['ip' => $request->ip()]);

            return response()->json(['status' => 'unauthorized'], 401);
        }

        $allowlist = (array) config('cron.tasks', []);
        $requested = (string) $request->query('task', 'all');

        if ($requested === 'all') {
            $tasks = $allowlist;
        } elseif (array_key_exists($requested, $allowlist)) {
            $tasks = [$requested => $allowlist[$requested]];
        } else {
            return response()->json([
                'status' => 'unknown_task',
                'message' => 'Unknown task. Allowed: all, '.implode(', ', array_keys($allowlist)).'.',
            ], 422);
        }

        $results = [];
        $worstExit = 0;

        foreach ($tasks as $key => $command) {
            try {
                // `--trigger=http` is what makes the run log distinguish a cron
                // HTTP hit from the Artisan scheduler.
                $exit = Artisan::call($command, $this->argumentsFor($command));
                $results[$key] = [
                    'command' => $command,
                    'exitCode' => $exit,
                    'output' => trim(Artisan::output()),
                ];
                $worstExit = max($worstExit, $exit);
            } catch (\Throwable $e) {
                Log::error('cron task threw', ['task' => $command, 'error' => $e->getMessage()]);
                $results[$key] = [
                    'command' => $command,
                    'exitCode' => 1,
                    'output' => 'Failed: '.$e->getMessage(),
                ];
                $worstExit = 1;
            }
        }

        return response()->json([
            'status' => $worstExit === 0 ? 'ok' : 'partial',
            'ranAt' => now()->toIso8601String(),
            'tasks' => $results,
        ]);
    }

    /**
     * GET /admin/cron/status — everything `/admin/cron-setup` renders.
     *
     * Behind `auth:sanctum` + `permission:settings.view`. It reports the cadence
     * and the run history but never the token itself.
     */
    public function status(): JsonResponse
    {
        return response()->json(['data' => VerificationReminders::stats()]);
    }

    /**
     * POST /admin/cron/run — "Run now" from the admin page.
     *
     * The same command with `--trigger=manual`, so a hand-triggered batch is
     * visible as such in the run log rather than masquerading as the schedule.
     */
    public function runNow(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'task' => ['nullable', 'string', 'in:'.implode(',', array_keys((array) config('cron.tasks', [])))],
        ]);

        $key = $validated['task'] ?? 'reminders';
        $command = config('cron.tasks.'.$key);

        if (! is_string($command) || $command === '') {
            return response()->json(['message' => 'Unknown task.'], 422);
        }

        $exit = Artisan::call($command, $this->argumentsFor($command, 'manual'));

        return response()->json([
            'data' => [
                'command' => $command,
                'exitCode' => $exit,
                'output' => trim(Artisan::output()),
                'stats' => VerificationReminders::stats(),
            ],
        ]);
    }

    /**
     * Only the reminder command accepts `--trigger`; passing it to a command that
     * does not define the option would throw.
     *
     * @return array<string,string>
     */
    private function argumentsFor(string $command, string $trigger = 'http'): array
    {
        return $command === 'waitlist:send-verification-reminders'
            ? ['--trigger' => $trigger]
            : [];
    }
}
