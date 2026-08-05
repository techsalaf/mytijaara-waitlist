<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Referral extends Model
{
    protected $fillable = [
        'referrer_id', 'referred_id', 'code', 'converted', 'converted_at', 'points',
        // Reward columns exist so "Send rewards" is idempotent: a referral with
        // `rewarded_at` set is skipped instead of paid twice.
        'rewarded_at', 'rewarded_by', 'reward_note',
    ];

    protected $casts = [
        'converted' => 'boolean',
        'converted_at' => 'datetime',
        'rewarded_at' => 'datetime',
        'points' => 'integer',
    ];

    /** Converted (the referred user verified) but not yet paid. */
    public function scopePendingReward($query)
    {
        return $query->where('converted', true)->whereNull('rewarded_at');
    }

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(WaitlistEntry::class, 'referrer_id');
    }

    public function referred(): BelongsTo
    {
        return $this->belongsTo(WaitlistEntry::class, 'referred_id');
    }
}
