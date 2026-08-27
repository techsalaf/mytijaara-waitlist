<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class DataRoomAuditLog extends Model
{
    protected $table = 'dataroom_audit_logs';

    protected $fillable = [
        'access_grant_id',
        'user_id',
        'visitor_email',
        'action',
        'target_type',
        'target_id',
        'details',
        'ip_address',
        'user_agent',
    ];

    public function accessGrant(): BelongsTo
    {
        return $this->belongsTo(DataRoomAccessGrant::class, 'access_grant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function target(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Actions that are always recorded, whatever the audit_logging_enabled
     * setting says. Turning off audit logging is itself an audited act, as is
     * every security decision an investigator would need afterwards. An admin
     * cannot use the settings switch to work unobserved.
     */
    public const ALWAYS_LOGGED = [
        'admin_updated_settings',
        'emergency_lockdown',
        'emergency_revoked_all_sessions',
        'emergency_disabled_all_downloads',
        'emergency_disabled_all_grants',
        'authentication_failed',
        'authentication_failed_inactive',
        'access_denied',
        'download_denied',
        'admin_created_access_grant',
        'admin_revoked_access_grant',
        'admin_deleted_document',
    ];

    /**
     * Write an audit row.
     *
     * Returns null when audit logging is disabled and the action is not on the
     * always-logged list. Callers treat the return value as fire-and-forget, so
     * a null is not an error condition.
     */
    public static function record(
        ?DataRoomAccessGrant $grant,
        ?User $user,
        string $action,
        ?Model $target = null,
        ?string $details = null,
        ?\Illuminate\Http\Request $request = null
    ): ?self {
        if (! DataRoomSetting::current()->audit_logging_enabled && ! in_array($action, self::ALWAYS_LOGGED, true)) {
            return null;
        }

        return self::create([
            'access_grant_id' => $grant?->id,
            'user_id' => $user?->id,
            'visitor_email' => $grant?->visitor_email ?? $user?->email,
            'action' => $action,
            'target_type' => $target ? get_class($target) : null,
            'target_id' => $target?->getKey(),
            'details' => $details,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent() ? substr($request->userAgent(), 0, 512) : null,
        ]);
    }
}
