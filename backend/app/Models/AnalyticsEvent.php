<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnalyticsEvent extends Model
{
    protected $fillable = [
        'type', 'visitor_id', 'session_id', 'path', 'referrer', 'source',
        'utm_source', 'utm_medium', 'utm_campaign',
        'city', 'country', 'device', 'browser', 'ip_hash', 'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];
}
