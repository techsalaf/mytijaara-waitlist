<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens, HasRoles, SoftDeletes;

    /** Defaults so a profile that has never been saved still renders real values. */
    public const PREFERENCE_DEFAULTS = [
        'weeklyDigest' => true,
        'campaignReports' => true,
        'signupAlerts' => false,
        'productUpdates' => true,
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'timezone',
        'location',
        'bio',
        'preferences',
        'avatar',
        'avatar_url',
        'status',
        'last_active_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_active_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'password' => 'hashed',
            'preferences' => 'array',
            // Encrypted at rest: a database dump must not yield a working
            // second factor or a set of usable recovery codes.
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
        ];
    }

    /** True only once the user has proved they can generate a valid code. */
    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_secret !== null && $this->two_factor_confirmed_at !== null;
    }

    /**
     * Stored preferences merged over the defaults, so a key added later reads
     * as its default instead of null on every existing row.
     *
     * Named `resolvedPreferences` rather than `preferences` so it can never be
     * mistaken for a relationship accessor on the column of the same name.
     *
     * @return array<string,bool>
     */
    public function resolvedPreferences(): array
    {
        $stored = is_array($this->preferences) ? $this->preferences : [];

        return array_merge(
            self::PREFERENCE_DEFAULTS,
            array_intersect_key($stored, self::PREFERENCE_DEFAULTS),
        );
    }
}
