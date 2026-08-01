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
