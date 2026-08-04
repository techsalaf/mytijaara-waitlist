<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One recorded health probe. Written by {@see \App\Support\SystemHealth::probe()}
 * so the latency chart has real history instead of generated numbers.
 */
class SystemHealthSample extends Model
{
    /** Probes are point-in-time; there is nothing to update. */
    public const UPDATED_AT = null;

    protected $fillable = [
        'status',
        'db_latency_ms',
        'cache_latency_ms',
        'storage_latency_ms',
        'queue_pending',
        'queue_failed',
        'errors_last_hour',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'db_latency_ms' => 'integer',
        'cache_latency_ms' => 'integer',
        'storage_latency_ms' => 'integer',
        'queue_pending' => 'integer',
        'queue_failed' => 'integer',
        'errors_last_hour' => 'integer',
    ];
}
