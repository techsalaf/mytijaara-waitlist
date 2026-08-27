<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataRoomSetting extends Model
{
    protected $table = 'dataroom_settings';

    protected $fillable = [
        'enabled',
        'global_pin_enabled',
        'global_pin_hash',
        'default_access_duration_days',
        'session_timeout_minutes',
        'max_failed_attempts',
        'downloads_enabled',
        'watermark_enabled',
        'audit_logging_enabled',
        'emergency_lockdown',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'global_pin_enabled' => 'boolean',
            'default_access_duration_days' => 'integer',
            'session_timeout_minutes' => 'integer',
            'max_failed_attempts' => 'integer',
            'downloads_enabled' => 'boolean',
            'watermark_enabled' => 'boolean',
            'audit_logging_enabled' => 'boolean',
            'emergency_lockdown' => 'boolean',
        ];
    }

    public static function current(): self
    {
        return self::firstOrCreate([], [
            'enabled' => true,
            'global_pin_enabled' => false,
            'default_access_duration_days' => 14,
            'session_timeout_minutes' => 30,
            'max_failed_attempts' => 5,
            'downloads_enabled' => true,
            'watermark_enabled' => true,
            'audit_logging_enabled' => true,
            'emergency_lockdown' => false,
        ]);
    }
}
