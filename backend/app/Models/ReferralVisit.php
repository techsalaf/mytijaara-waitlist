<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralVisit extends Model
{
    protected $fillable = [
        'code', 'referrer_id', 'ip_hash', 'country', 'city', 'device', 'browser',
        'utm_source', 'converted',
    ];

    protected $casts = [
        'converted' => 'boolean',
    ];
}
