<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WaitlistEntry extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'public_id', 'name', 'email', 'phone', 'city', 'state', 'role', 'interest',
        'status', 'verified', 'verified_at', 'verification_token',
        'verification_reminders_sent', 'last_verification_reminder_at',
        'last_verification_reminder_error',
        'referral_code', 'referred_by_id', 'referrals', 'position',
        'source', 'device', 'browser', 'country',
        'utm_source', 'utm_medium', 'utm_campaign', 'ip_hash',
        'tags', 'notes', 'last_active_at',
    ];

    protected $casts = [
        'verified' => 'boolean',
        'verified_at' => 'datetime',
        'last_active_at' => 'datetime',
        'tags' => 'array',
        'referrals' => 'integer',
        'position' => 'integer',
        // Reminder cadence tracking. `last_verification_reminder_at` doubles as
        // the claim marker the reminder command compare-and-swaps on, so it has
        // to come back as a Carbon instance for the guard to compare cleanly.
        'verification_reminders_sent' => 'integer',
        'last_verification_reminder_at' => 'datetime',
    ];

    public function referredBy(): BelongsTo
    {
        return $this->belongsTo(WaitlistEntry::class, 'referred_by_id');
    }

    public function referralsMade(): HasMany
    {
        return $this->hasMany(Referral::class, 'referrer_id');
    }
}
