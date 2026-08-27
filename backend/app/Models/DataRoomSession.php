<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A visitor's authenticated data room session.
 *
 * Only the SHA-256 of the bearer token is stored, so a database dump cannot be
 * replayed as a live session. Two clocks run: `expires_at` is the idle timeout
 * and is pushed forward on each request, `absolute_expires_at` is fixed at
 * creation and cannot be extended by activity.
 */
class DataRoomSession extends Model
{
    protected $table = 'dataroom_sessions';

    protected $fillable = [
        'access_grant_id',
        'token_hash',
        'ip_address',
        'user_agent',
        'expires_at',
        'absolute_expires_at',
        'last_active_at',
    ];

    protected $hidden = [
        // Never serialize the token hash, even to an admin audit view.
        'token_hash',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'absolute_expires_at' => 'datetime',
            'last_active_at' => 'datetime',
        ];
    }

    /** Has either clock run out? */
    public function isExpired(): bool
    {
        return now()->greaterThan($this->expires_at)
            || now()->greaterThan($this->absolute_expires_at);
    }

    /**
     * Push the idle clock forward, never past the absolute ceiling. Returns the
     * effective expiry so a caller can surface it to the client.
     */
    public function touchActivity(int $idleMinutes): void
    {
        $next = now()->addMinutes($idleMinutes);

        if ($next->greaterThan($this->absolute_expires_at)) {
            $next = $this->absolute_expires_at;
        }

        $this->forceFill([
            'last_active_at' => now(),
            'expires_at' => $next,
        ])->save();
    }

    public function accessGrant(): BelongsTo
    {
        return $this->belongsTo(DataRoomAccessGrant::class, 'access_grant_id');
    }
}
