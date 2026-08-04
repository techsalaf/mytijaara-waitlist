<?php

namespace App\Support;

use App\Models\Setting;
use App\Models\SystemHealthSample;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Live system probes for `/admin/system-health`.
 *
 * Nothing here is cached or reported from a static status page: every number is
 * measured inside the request. The database check issues a real query, the cache
 * check round-trips a probe key, the storage check writes and deletes a real
 * file, the queue numbers read `jobs` / `failed_jobs`, and the error counts come
 * from the log files on disk.
 *
 * A probe that throws is reported as `down` with the exception message rather
 * than propagating, because a health endpoint that 500s tells an operator less
 * than one that says which dependency is broken.
 */
class SystemHealth
{
    /** Samples older than this are pruned on each probe. */
    private const RETAIN_DAYS = 7;

    /** Cap on how much of a log file is scanned, so a huge log cannot stall the request. */
    private const LOG_TAIL_BYTES = 512 * 1024;

    /** Latency at or above this many milliseconds counts as degraded, not ok. */
    private const SLOW_MS = 500;

    /** Settings row holding the incident marker uptime is measured from. */
    private const SETTINGS_GROUP = 'system_health';

    /**
     * Run every probe and record the result.
     *
     * @return array<string,mixed> the shape `src/lib/api/health.ts` declares
     */
    public static function probe(bool $record = true): array
    {
        $checks = [
            self::checkDatabase(),
            self::checkCache(),
            self::checkQueue(),
            self::checkStorage(),
            self::checkMail(),
        ];

        $errors = self::errorCounts();
        $queue = self::queueDepth();
        $storage = self::storageFacts();
        $status = self::worst(array_column($checks, 'status'));

        if ($record) {
            self::record($status, $checks, $queue, $errors);
        }

        return [
            'status' => $status,
            'checkedAt' => now()->toIso8601String(),
            'uptimeSeconds' => self::uptimeSeconds(),
            'checks' => $checks,
            'queue' => $queue,
            'errors' => $errors,
            'storage' => $storage,
        ];
    }

    /**
     * Recorded samples for the latency chart, oldest first.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function history(int $hours = 24): array
    {
        return SystemHealthSample::query()
            ->where('created_at', '>=', now()->subHours($hours))
            ->orderBy('created_at')
            ->limit(500)
            ->get()
            ->map(fn (SystemHealthSample $s) => [
                'at' => optional($s->created_at)->toIso8601String(),
                'status' => (string) $s->status,
                'dbLatencyMs' => $s->db_latency_ms,
                'cacheLatencyMs' => $s->cache_latency_ms,
                'storageLatencyMs' => $s->storage_latency_ms,
                'queuePending' => (int) $s->queue_pending,
                'queueFailed' => (int) $s->queue_failed,
                'errorsLastHour' => (int) $s->errors_last_hour,
            ])
            ->all();
    }

    /** A real round-trip to the database, timed. */
    private static function checkDatabase(): array
    {
        return self::timed('database', 'Database', function () {
            DB::select('select 1 as ok');
            $driver = DB::connection()->getDriverName();

            return "Connected over {$driver}.";
        });
    }

    /** Write, read back and forget a probe key, so a read-only cache is caught. */
    private static function checkCache(): array
    {
        return self::timed('cache', 'Cache', function () {
            $key = 'health:probe:'.Str::random(8);
            Cache::put($key, 'ok', 30);
            $read = Cache::get($key);
            Cache::forget($key);

            if ($read !== 'ok') {
                throw new \RuntimeException('Cache write succeeded but the read did not return the value.');
            }

            return 'Round-trip on the '.config('cache.default').' store.';
        });
    }

    /**
     * Queue backlog. Pending work is not an error, so a backlog degrades rather
     * than downs the check; a failed job is a real failure.
     */
    private static function checkQueue(): array
    {
        return self::timed('queue', 'Queue', function () {
            $depth = self::queueDepth();

            if ($depth['failed'] > 0) {
                return ['down', "{$depth['failed']} failed job(s) waiting to be retried."];
            }
            if ($depth['pending'] > 100) {
                return ['degraded', "{$depth['pending']} jobs pending."];
            }

            return [null, $depth['pending'] === 0 ? 'No backlog.' : "{$depth['pending']} job(s) pending."];
        });
    }

    /** Write and delete a real file, because free space alone does not prove writability. */
    private static function checkStorage(): array
    {
        return self::timed('storage', 'Storage', function () {
            $disk = Storage::disk(config('filesystems.default'));
            $path = 'health/probe-'.Str::random(8).'.txt';
            $disk->put($path, 'ok');
            $ok = $disk->get($path) === 'ok';
            $disk->delete($path);

            if (! $ok) {
                throw new \RuntimeException('Wrote a probe file but read back different contents.');
            }

            return 'Writable on the '.config('filesystems.default').' disk.';
        });
    }

    /**
     * Mail is a dependency of the waitlist welcome and admin invite flows, so an
     * unconfigured mailer is a degraded system rather than a healthy one.
     */
    private static function checkMail(): array
    {
        return self::timed('mail', 'Email delivery', function () {
            if (! SmtpConfig::isConfigured()) {
                return ['degraded', 'SMTP is not configured; welcome and invite emails will not send.'];
            }

            $current = SmtpConfig::current();

            return [null, "Configured for {$current['host']}:{$current['port']}."];
        });
    }

    /**
     * Run a probe, time it, and turn any throwable into a `down` result.
     *
     * The callback returns either a detail string, or `[status, detail]` when it
     * wants to report degraded/down without throwing.
     */
    private static function timed(string $key, string $label, callable $probe): array
    {
        $started = microtime(true);

        try {
            $result = $probe();
            $latency = (int) round((microtime(true) - $started) * 1000);

            [$forced, $detail] = is_array($result) ? $result : [null, (string) $result];
            $status = $forced ?? ($latency >= self::SLOW_MS ? 'degraded' : 'ok');

            if ($forced === null && $latency >= self::SLOW_MS) {
                $detail .= " Responded in {$latency}ms.";
            }

            return [
                'key' => $key,
                'label' => $label,
                'status' => $status,
                'latencyMs' => $latency,
                'detail' => $detail,
            ];
        } catch (\Throwable $e) {
            return [
                'key' => $key,
                'label' => $label,
                'status' => 'down',
                // Null latency means the probe could not complete, which is
                // different from "completed slowly".
                'latencyMs' => null,
                'detail' => $e->getMessage(),
            ];
        }
    }

    /**
     * Pending and failed job counts plus the age of the oldest pending job.
     *
     * @return array{pending:int,failed:int,oldestPendingSeconds:int|null}
     */
    private static function queueDepth(): array
    {
        try {
            $pending = DB::table('jobs')->count();
            $failed = DB::table('failed_jobs')->count();
            // `available_at` is a unix timestamp on the database queue driver.
            $oldest = DB::table('jobs')->min('available_at');

            return [
                'pending' => (int) $pending,
                'failed' => (int) $failed,
                'oldestPendingSeconds' => $oldest === null ? null : max(0, time() - (int) $oldest),
            ];
        } catch (\Throwable) {
            // A non-database queue driver has no tables to read.
            return ['pending' => 0, 'failed' => 0, 'oldestPendingSeconds' => null];
        }
    }

    /**
     * Free space and writability of the configured disk.
     *
     * @return array{writable:bool,freeBytes:int|null}
     */
    private static function storageFacts(): array
    {
        $root = config('filesystems.disks.'.config('filesystems.default').'.root');
        $free = null;

        if (is_string($root) && is_dir($root)) {
            $bytes = @disk_free_space($root);
            $free = $bytes === false ? null : (int) $bytes;
        }

        return [
            'writable' => is_string($root) && is_dir($root) && is_writable($root),
            'freeBytes' => $free,
        ];
    }

    /**
     * ERROR-and-above lines counted from the log files on disk.
     *
     * Only the tail of each recently-touched file is scanned so a multi-gigabyte
     * log cannot stall the request. `rate` is errors per hour over 24h.
     *
     * @return array{lastHour:int,last24h:int,rate:float}
     */
    private static function errorCounts(): array
    {
        $hour = 0;
        $day = 0;
        $now = now();

        foreach (self::recentLogFiles() as $file) {
            foreach (self::tailLines($file) as $line) {
                if (! preg_match('/^\[(.*?)\].*?\.(ERROR|CRITICAL|ALERT|EMERGENCY):/', $line, $match)) {
                    continue;
                }

                try {
                    $at = Carbon::parse($match[1]);
                } catch (\Throwable) {
                    continue;
                }

                if ($at->greaterThanOrEqualTo($now->copy()->subDay())) {
                    $day++;
                    if ($at->greaterThanOrEqualTo($now->copy()->subHour())) {
                        $hour++;
                    }
                }
            }
        }

        return [
            'lastHour' => $hour,
            'last24h' => $day,
            'rate' => round($day / 24, 2),
        ];
    }

    /** @return array<int,string> log files touched in the last 24h */
    private static function recentLogFiles(): array
    {
        $dir = storage_path('logs');
        if (! is_dir($dir)) {
            return [];
        }

        $files = glob($dir.DIRECTORY_SEPARATOR.'*.log') ?: [];

        return array_values(array_filter($files, fn ($f) => is_file($f) && filemtime($f) >= time() - 86400));
    }

    /**
     * Last {@see LOG_TAIL_BYTES} of a file, split into lines.
     *
     * @return array<int,string>
     */
    private static function tailLines(string $file): array
    {
        $handle = @fopen($file, 'rb');
        if ($handle === false) {
            return [];
        }

        $size = filesize($file) ?: 0;
        if ($size > self::LOG_TAIL_BYTES) {
            fseek($handle, -self::LOG_TAIL_BYTES, SEEK_END);
            // The first line after seeking mid-file is partial; drop it.
            fgets($handle);
        }

        $lines = [];
        while (($line = fgets($handle)) !== false) {
            $lines[] = $line;
        }
        fclose($handle);

        return $lines;
    }

    /**
     * Seconds since the last observed failure.
     *
     * There is no portable way to ask a PHP-FPM host how long the app has been
     * serving, so this reports the honest thing the app can know: how long every
     * probe has come back healthy. It resets the moment a probe reports down.
     */
    private static function uptimeSeconds(): ?int
    {
        $since = self::healthySince();

        return $since === null ? null : max(0, (int) $since->diffInSeconds(now()));
    }

    /** Timestamp of the last transition back to healthy, or null before the first probe. */
    private static function healthySince(): ?Carbon
    {
        $row = Setting::where('group', self::SETTINGS_GROUP)->first();
        $value = is_array($row?->data) ? ($row->data['healthySince'] ?? null) : null;

        if (! is_string($value) || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    /** Persist the sample, prune old ones, and move the incident marker. */
    private static function record(string $status, array $checks, array $queue, array $errors): void
    {
        try {
            $byKey = collect($checks)->keyBy('key');

            SystemHealthSample::create([
                'status' => $status,
                'db_latency_ms' => $byKey['database']['latencyMs'] ?? null,
                'cache_latency_ms' => $byKey['cache']['latencyMs'] ?? null,
                'storage_latency_ms' => $byKey['storage']['latencyMs'] ?? null,
                'queue_pending' => $queue['pending'],
                'queue_failed' => $queue['failed'],
                'errors_last_hour' => $errors['lastHour'],
            ]);

            SystemHealthSample::where('created_at', '<', now()->subDays(self::RETAIN_DAYS))->delete();

            // A `down` probe restarts the clock; anything else leaves an
            // existing marker alone so uptime keeps accumulating.
            $existing = self::healthySince();
            if ($status === 'down' || $existing === null) {
                Setting::updateOrCreate(
                    ['group' => self::SETTINGS_GROUP],
                    ['data' => ['healthySince' => now()->toIso8601String()]],
                );
            }
        } catch (\Throwable) {
            // Recording is observability, not the answer. A write failure must
            // not turn a successful probe into an error response.
        }
    }

    /** Worst of a set of statuses: down beats degraded beats ok. */
    private static function worst(array $statuses): string
    {
        if (in_array('down', $statuses, true)) {
            return 'down';
        }

        return in_array('degraded', $statuses, true) ? 'degraded' : 'ok';
    }
}
