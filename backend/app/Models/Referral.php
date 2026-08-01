<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Referral extends Model
{
    protected $fillable = [
        'referrer_id', 'referred_id', 'code', 'converted', 'converted_at', 'points',
    ];

    protected $casts = [
        'converted' => 'boolean',
        'converted_at' => 'datetime',
        'points' => 'integer',
    ];

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(WaitlistEntry::class, 'referrer_id');
    }

    public function referred(): BelongsTo
    {
        return $this->belongsTo(WaitlistEntry::class, 'referred_id');
    }
}
