<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One execution of a scheduled task. Written by the task itself, read by
 * `/admin/cron-setup` so an administrator can tell whether the host's cron is
 * actually firing without shell access to the server.
 *
 * A row is created as `running` at the top of the command and closed out at the
 * end, so a crashed run leaves a visible `running` row with no `finished_at`
 * rather than no evidence at all.
 */
class CronRun extends Model
{
    protected $fillable = [
        'task', 'trigger', 'status', 'processed', 'succeeded', 'failed', 'skipped',
        'duration_ms', 'message', 'meta', 'started_at', 'finished_at',
    ];

    protected $casts = [
        'processed' => 'integer',
        'succeeded' => 'integer',
        'failed' => 'integer',
        'skipped' => 'integer',
        'duration_ms' => 'integer',
        'meta' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    /**
     * Open a run row. Called before any work so a fatal error mid-task still
     * leaves a trace.
     */
    public static function start(string $task, string $trigger = 'schedule'): self
    {
        return self::create([
            'task' => $task,
            'trigger' => $trigger,
            'status' => 'running',
            'started_at' => now(),
        ]);
    }

    /**
     * Close the run out. `status` is derived rather than passed so every caller
     * agrees on what "partial" means: work was done and some of it failed.
     *
     * @param  array<string,mixed>  $meta
     */
    public function finish(int $succeeded, int $failed, int $skipped, ?string $message = null, array $meta = []): self
    {
        $status = $failed > 0 ? ($succeeded > 0 ? 'partial' : 'failed') : 'success';

        $this->update([
            'status' => $status,
            'processed' => $succeeded + $failed,
            'succeeded' => $succeeded,
            'failed' => $failed,
            'skipped' => $skipped,
            'message' => $message,
            'meta' => $meta ?: null,
            'finished_at' => now(),
            'duration_ms' => $this->started_at
                ? (int) round(abs(now()->getPreciseTimestamp(3) - $this->started_at->getPreciseTimestamp(3)))
                : null,
        ]);

        return $this;
    }

    /** Mark a run that threw before it could finish. */
    public function fail(string $message): self
    {
        $this->update([
            'status' => 'failed',
            'message' => $message,
            'finished_at' => now(),
            'duration_ms' => $this->started_at
                ? (int) round(abs(now()->getPreciseTimestamp(3) - $this->started_at->getPreciseTimestamp(3)))
                : null,
        ]);

        return $this;
    }

    /**
     * Drop run rows older than `$days` for one task.
     *
     * A cron that fires hourly writes 8,760 rows a year per task and nothing ever
     * reads past the 30-day window `VerificationReminders::stats()` aggregates
     * over, so without this the table grows without bound to hold data no screen
     * displays. 90 days leaves three months of history for anyone auditing a
     * cadence question and still caps the table at a few hundred rows.
     *
     * Uses the `['task', 'created_at']` index, so it stays cheap on shared
     * hosting even when it has nothing to delete.
     *
     * @return int Rows removed.
     */
    public static function prune(string $task, int $days = 90): int
    {
        return self::where('task', $task)
            ->where('created_at', '<', now()->subDays($days))
            ->delete();
    }
}
