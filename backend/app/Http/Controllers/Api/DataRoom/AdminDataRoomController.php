<?php

namespace App\Http\Controllers\Api\DataRoom;

use App\Http\Controllers\Controller;
use App\Models\DataRoomAccessGrant;
use App\Models\DataRoomAuditLog;
use App\Models\DataRoomDocument;
use App\Models\DataRoomDocumentView;
use App\Models\DataRoomFolder;
use App\Models\DataRoomSession;
use App\Models\DataRoomSetting;
use App\Services\DataRoom\DataRoomPolicyResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Administrative overview, analytics, audit trail, settings and the emergency
 * controls for the data room.
 *
 * Every route reaching this controller has already passed Sanctum plus a
 * `permission:data-room.*` gate. The permissions live in their own Spatie group
 * so no existing role picks up data room access as a side effect of an
 * unrelated permission, and `data-room.manage-settings` / `data-room.delete`
 * are withheld from the ordinary `admin` role.
 */
class AdminDataRoomController extends Controller
{
    public function __construct(private readonly DataRoomPolicyResolver $policy) {}

    /** GET /api/admin/dataroom/overview */
    public function overview(Request $request): JsonResponse
    {
        $grants = DataRoomAccessGrant::all();

        // Status is derived, not read from the column, so the tiles agree with
        // what the authorization layer will actually decide.
        $byStatus = $grants->groupBy(fn (DataRoomAccessGrant $g) => $g->effectiveStatus())
            ->map->count();

        return response()->json([
            'data' => [
                'documents' => [
                    'total' => DataRoomDocument::count(),
                    'published' => DataRoomDocument::where('status', 'published')->count(),
                    'draft' => DataRoomDocument::where('status', 'draft')->count(),
                    'archived' => DataRoomDocument::whereIn('status', ['archived', 'superseded'])->count(),
                ],
                'foldersCount' => DataRoomFolder::count(),
                'grants' => [
                    'total' => $grants->count(),
                    'active' => (int) ($byStatus['active'] ?? 0),
                    'pending' => (int) ($byStatus['pending'] ?? 0),
                    'expired' => (int) ($byStatus['expired'] ?? 0),
                    'revoked' => (int) ($byStatus['revoked'] ?? 0),
                    'suspended' => (int) ($byStatus['suspended'] ?? 0),
                    'exhausted' => (int) ($byStatus['exhausted'] ?? 0),
                ],
                'engagement' => [
                    'totalViews' => (int) DataRoomDocument::sum('view_count'),
                    'totalDownloads' => (int) DataRoomDocument::sum('download_count'),
                    'activeSessions' => DataRoomSession::where('expires_at', '>', now())
                        ->where('absolute_expires_at', '>', now())
                        ->count(),
                    'last7Days' => DataRoomDocumentView::where('created_at', '>=', now()->subDays(7))->count(),
                ],
                'storage' => [
                    'bytes' => (int) DataRoomDocument::sum('file_size'),
                ],
                'policy' => $this->policySnapshot(),
            ],
        ]);
    }

    /**
     * GET /api/admin/dataroom/analytics
     *
     * Engagement signals, presented as counts only. No inference about
     * investment intent is made or implied here; a visitor reading a document
     * twice is a fact, not a signal of interest, and the API does not pretend
     * otherwise.
     */
    public function analytics(Request $request): JsonResponse
    {
        $since = now()->subDays((int) $request->integer('days', 30) ?: 30);

        $mostViewed = DataRoomDocument::orderByDesc('view_count')
            ->limit(10)
            ->get(['id', 'uuid', 'title', 'view_count', 'download_count'])
            ->map(fn (DataRoomDocument $d) => [
                'uuid' => $d->uuid,
                'title' => $d->title,
                'views' => (int) $d->view_count,
                'downloads' => (int) $d->download_count,
            ]);

        $perVisitor = DataRoomDocumentView::query()
            ->where('dataroom_document_views.created_at', '>=', $since)
            ->join('dataroom_access_grants', 'dataroom_access_grants.id', '=', 'dataroom_document_views.access_grant_id')
            ->groupBy('dataroom_access_grants.id', 'dataroom_access_grants.visitor_name', 'dataroom_access_grants.visitor_email', 'dataroom_access_grants.organization')
            ->select([
                'dataroom_access_grants.id',
                'dataroom_access_grants.visitor_name',
                'dataroom_access_grants.visitor_email',
                'dataroom_access_grants.organization',
                DB::raw('COUNT(*) as interactions'),
                DB::raw("SUM(CASE WHEN dataroom_document_views.action_type = 'download' THEN 1 ELSE 0 END) as downloads"),
                DB::raw('COUNT(DISTINCT dataroom_document_views.document_id) as distinct_documents'),
                DB::raw('MAX(dataroom_document_views.created_at) as last_activity_at'),
            ])
            ->orderByDesc('interactions')
            ->limit(25)
            ->get()
            ->map(fn ($row) => [
                'grantId' => (int) $row->id,
                'visitorName' => $row->visitor_name,
                'visitorEmail' => $row->visitor_email,
                'organization' => $row->organization,
                'interactions' => (int) $row->interactions,
                'downloads' => (int) $row->downloads,
                'distinctDocuments' => (int) $row->distinct_documents,
                'lastActivityAt' => $row->last_activity_at,
            ]);

        $daily = DataRoomDocumentView::query()
            ->where('created_at', '>=', $since)
            ->groupBy('day', 'action_type')
            ->select([
                DB::raw('DATE(created_at) as day'),
                'action_type',
                DB::raw('COUNT(*) as total'),
            ])
            ->orderBy('day')
            ->get()
            ->groupBy('day')
            ->map(fn ($rows, $day) => [
                'day' => (string) $day,
                'view' => (int) ($rows->firstWhere('action_type', 'view')->total ?? 0),
                'preview' => (int) ($rows->firstWhere('action_type', 'preview')->total ?? 0),
                'download' => (int) ($rows->firstWhere('action_type', 'download')->total ?? 0),
            ])
            ->values();

        return response()->json([
            'data' => [
                'sinceDays' => (int) $request->integer('days', 30) ?: 30,
                'mostViewed' => $mostViewed,
                'visitorEngagement' => $perVisitor,
                'daily' => $daily,
            ],
        ]);
    }

    /**
     * GET /api/admin/dataroom/audit-logs
     *
     * Filterable on date, visitor, organization, document, action, and outcome.
     * Read-only: there is no endpoint that edits or deletes a data room audit
     * row, so the trail cannot be groomed after the fact through the API.
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'grant_id' => ['nullable', 'integer'],
            'email' => ['nullable', 'string', 'max:255'],
            'organization' => ['nullable', 'string', 'max:255'],
            'document_id' => ['nullable', 'integer'],
            'action' => ['nullable', 'string', 'max:64'],
            'outcome' => ['nullable', 'in:success,failure'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:200'],
        ]);

        $query = DataRoomAuditLog::with(['accessGrant:id,visitor_name,visitor_email,organization', 'user:id,name,email'])
            ->orderByDesc('created_at');

        if (! empty($filters['from'])) {
            $query->where('created_at', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->where('created_at', '<=', $filters['to']);
        }
        if (! empty($filters['grant_id'])) {
            $query->where('access_grant_id', $filters['grant_id']);
        }
        if (! empty($filters['email'])) {
            $query->where('visitor_email', 'like', '%'.$filters['email'].'%');
        }
        if (! empty($filters['organization'])) {
            $query->whereHas('accessGrant', fn ($q) => $q->where('organization', 'like', '%'.$filters['organization'].'%'));
        }
        if (! empty($filters['document_id'])) {
            $query->where('target_type', DataRoomDocument::class)->where('target_id', $filters['document_id']);
        }
        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }
        if (! empty($filters['outcome'])) {
            // Denials and failures are the only "failure" outcomes recorded.
            $failureActions = ['authentication_failed', 'authentication_failed_inactive', 'access_denied', 'download_denied'];
            $filters['outcome'] === 'failure'
                ? $query->whereIn('action', $failureActions)
                : $query->whereNotIn('action', $failureActions);
        }

        $logs = $query->paginate($filters['per_page'] ?? 50);

        $logs->getCollection()->transform(fn (DataRoomAuditLog $log) => [
            'id' => $log->id,
            'action' => $log->action,
            'visitorEmail' => $log->visitor_email,
            'visitorName' => $log->accessGrant?->visitor_name,
            'organization' => $log->accessGrant?->organization,
            'adminUser' => $log->user?->name,
            'targetType' => $log->target_type ? class_basename($log->target_type) : null,
            'targetId' => $log->target_id,
            'targetTitle' => $log->target_type === DataRoomDocument::class
                ? DataRoomDocument::withTrashed()->find($log->target_id)?->title
                : null,
            'details' => $log->details,
            'ipAddress' => $log->ip_address,
            'userAgent' => $log->user_agent,
            'at' => $log->created_at?->toIso8601String(),
        ]);

        return response()->json($logs);
    }

    /** GET /api/admin/dataroom/settings */
    public function settings(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->policySnapshot()]);
    }

    /**
     * PATCH /api/admin/dataroom/settings
     *
     * Gated on `data-room.manage-settings`, which the plain `admin` role does
     * not hold. Only super_admin can move the security policy.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'global_pin_enabled' => ['sometimes', 'boolean'],
            'global_pin' => ['nullable', 'string', 'min:6', 'max:64'],
            'default_access_duration_days' => ['sometimes', 'integer', 'min:1', 'max:3650'],
            'session_timeout_minutes' => ['sometimes', 'integer', 'min:5', 'max:1440'],
            'max_failed_attempts' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'downloads_enabled' => ['sometimes', 'boolean'],
            'watermark_enabled' => ['sometimes', 'boolean'],
            'audit_logging_enabled' => ['sometimes', 'boolean'],
        ]);

        $settings = DataRoomSetting::current();
        $before = $settings->only(array_keys($data));

        $patch = $data;

        if (! empty($data['global_pin'])) {
            $patch['global_pin_hash'] = Hash::make($data['global_pin']);
        }
        unset($patch['global_pin']);

        // Turning the PIN gate off clears the hash rather than leaving a stale
        // secret at rest for a switch nobody is watching.
        if (array_key_exists('global_pin_enabled', $patch) && ! $patch['global_pin_enabled']) {
            $patch['global_pin_hash'] = null;
        }

        $settings->update($patch);

        $changed = collect($data)
            ->except('global_pin')
            ->map(fn ($v, $k) => $k.': '.var_export($before[$k] ?? null, true).' -> '.var_export($v, true))
            ->values()
            ->implode('; ');

        if (! empty($data['global_pin'])) {
            $changed = trim($changed.'; global_pin: rotated', '; ');
        }

        // On the always-logged list, so an admin cannot disable audit logging
        // without that act itself being recorded.
        DataRoomAuditLog::record(null, $request->user(), 'admin_updated_settings', $settings, $changed ?: null, $request);

        return response()->json(['data' => $this->policySnapshot()]);
    }

    /**
     * POST /api/admin/dataroom/emergency
     *
     * The four break-glass actions. Each requires the caller to echo back the
     * literal confirmation phrase, so a misrouted click or a replayed request
     * cannot lock the room by accident.
     */
    public function emergency(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'in:lock_room,unlock_room,revoke_all_sessions,disable_all_downloads,enable_all_downloads,disable_all_grants'],
            'confirmation' => ['required', 'string'],
        ]);

        $expected = [
            'lock_room' => 'LOCK DATA ROOM',
            'unlock_room' => 'UNLOCK DATA ROOM',
            'revoke_all_sessions' => 'REVOKE ALL SESSIONS',
            'disable_all_downloads' => 'DISABLE ALL DOWNLOADS',
            'enable_all_downloads' => 'ENABLE ALL DOWNLOADS',
            'disable_all_grants' => 'DISABLE ALL ACCESS GRANTS',
        ][$data['action']];

        if (! hash_equals($expected, trim($data['confirmation']))) {
            return response()->json([
                'message' => "This action requires the confirmation phrase \"{$expected}\".",
            ], 422);
        }

        $settings = DataRoomSetting::current();
        $result = [];

        switch ($data['action']) {
            case 'lock_room':
                $settings->update(['emergency_lockdown' => true]);
                // Sessions go too. Lockdown that leaves live sessions running
                // is not a lockdown.
                $result['sessionsDestroyed'] = DataRoomSession::query()->delete();
                DataRoomAuditLog::record(null, $request->user(), 'emergency_lockdown', $settings, 'room locked', $request);
                break;

            case 'unlock_room':
                $settings->update(['emergency_lockdown' => false]);
                DataRoomAuditLog::record(null, $request->user(), 'emergency_lockdown', $settings, 'room unlocked', $request);
                break;

            case 'revoke_all_sessions':
                $result['sessionsDestroyed'] = DataRoomSession::query()->delete();
                DataRoomAuditLog::record(null, $request->user(), 'emergency_revoked_all_sessions', null, "{$result['sessionsDestroyed']} sessions", $request);
                break;

            case 'disable_all_downloads':
                $settings->update(['downloads_enabled' => false]);
                DataRoomAuditLog::record(null, $request->user(), 'emergency_disabled_all_downloads', $settings, null, $request);
                break;

            case 'enable_all_downloads':
                $settings->update(['downloads_enabled' => true]);
                DataRoomAuditLog::record(null, $request->user(), 'emergency_disabled_all_downloads', $settings, 're-enabled', $request);
                break;

            case 'disable_all_grants':
                // Suspended, not revoked: this is reversible per grant, which
                // matters when the trigger turns out to be a false alarm.
                $result['grantsSuspended'] = DataRoomAccessGrant::where('status', 'active')->update(['status' => 'suspended']);
                $result['sessionsDestroyed'] = DataRoomSession::query()->delete();
                DataRoomAuditLog::record(null, $request->user(), 'emergency_disabled_all_grants', null, "{$result['grantsSuspended']} grants suspended", $request);
                break;
        }

        return response()->json(['data' => $result + ['policy' => $this->policySnapshot()]]);
    }

    // -- internals ---------------------------------------------------------

    /**
     * What the settings screen renders. Never includes the PIN hash; the UI
     * only needs to know whether a PIN is configured.
     *
     * @return array<string,mixed>
     */
    private function policySnapshot(): array
    {
        $settings = DataRoomSetting::current();

        return [
            'enabled' => $settings->enabled,
            'openToVisitors' => $this->policy->isOpen(),
            'globalPinEnabled' => $settings->global_pin_enabled,
            'globalPinConfigured' => $this->policy->pinRequired(),
            'defaultAccessDurationDays' => $settings->default_access_duration_days,
            'sessionTimeoutMinutes' => $settings->session_timeout_minutes,
            'effectiveIdleTimeoutMinutes' => $this->policy->idleTimeoutMinutes(),
            'effectiveAbsoluteTtlMinutes' => $this->policy->absoluteTtlMinutes(),
            'maxFailedAttempts' => $settings->max_failed_attempts,
            'effectiveMaxFailedAttempts' => $this->policy->maxFailedAttempts(),
            'downloadsEnabled' => $settings->downloads_enabled,
            'watermarkEnabled' => $settings->watermark_enabled,
            'effectiveWatermarkEnabled' => $this->policy->watermarkEnabled(),
            'auditLoggingEnabled' => $settings->audit_logging_enabled,
            'emergencyLockdown' => $settings->emergency_lockdown,
            // Read-only, from config/dataroom.php. Surfaced so an admin can see
            // when the environment is overriding what they set here.
            'environment' => [
                'enabled' => (bool) config('dataroom.enabled', true),
                'pinPinnedByEnvironment' => filled(config('dataroom.master_pin_hash')),
                'watermarkEnabled' => (bool) config('dataroom.watermark_enabled', true),
                'idleTimeoutCeilingMinutes' => (int) config('dataroom.idle_timeout', 30),
                'absoluteTtlMinutes' => (int) config('dataroom.session_ttl', 480),
                'malwareScanning' => (bool) config('dataroom.antivirus.enabled', false),
                'storageDisk' => (string) config('dataroom.storage_disk', 'dataroom'),
            ],
        ];
    }
}
