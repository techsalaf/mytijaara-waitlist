<?php

namespace App\Http\Controllers\Api\DataRoom;

use App\Http\Controllers\Controller;
use App\Models\DataRoomAccessGrant;
use App\Models\DataRoomAccessTemplate;
use App\Models\DataRoomAuditLog;
use App\Models\DataRoomDocument;
use App\Models\DataRoomFolder;
use App\Models\DataRoomSession;
use App\Services\DataRoom\AccessCodeGenerator;
use App\Services\DataRoom\DataRoomPolicyResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * Administrative access grant management.
 *
 * A grant is the authorization subject for the whole data room: no visitor
 * exists without one, and nothing a visitor can reach is decided anywhere other
 * than by their grant. That makes this controller the highest-value surface in
 * the feature, which is why it is gated on `data-room.manage-access` and why
 * every mutation lands in the audit trail.
 *
 * The plaintext access code is returned exactly once, from store() and
 * regenerate(). Only its bcrypt hash and last four characters are stored, so a
 * lost code is reissued, never recovered.
 */
class AdminDataRoomGrantController extends Controller
{
    /** Selectable durations. `null` means never expires. */
    private const DURATIONS = [
        '1h' => 1,
        '6h' => 6,
        '24h' => 24,
        '3d' => 72,
        '7d' => 168,
        '14d' => 336,
        '30d' => 720,
    ];

    public function __construct(
        private readonly AccessCodeGenerator $codes,
        private readonly DataRoomPolicyResolver $policy,
    ) {}

    /** GET /api/admin/dataroom/grants */
    public function index(Request $request): JsonResponse
    {
        $grants = DataRoomAccessGrant::with([
            'creator:id,name',
            'documents:id,uuid,title',
            'folders:id,name',
        ])
            ->withCount('sessions')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (DataRoomAccessGrant $g) => $this->payload($g));

        return response()->json(['data' => $grants]);
    }

    /** GET /api/admin/dataroom/grants/{id} — including that visitor's trail. */
    public function show(Request $request, int $id): JsonResponse
    {
        $grant = DataRoomAccessGrant::with([
            'creator:id,name',
            'documents:id,uuid,title,file_type',
            'folders:id,name',
        ])->findOrFail($id);

        $history = DataRoomAuditLog::where('access_grant_id', $grant->id)
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (DataRoomAuditLog $log) => [
                'action' => $log->action,
                'details' => $log->details,
                'targetTitle' => $log->target_type === DataRoomDocument::class
                    ? DataRoomDocument::withTrashed()->find($log->target_id)?->title
                    : null,
                'ipAddress' => $log->ip_address,
                'at' => $log->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => $this->payload($grant) + [
                'history' => $history,
                'activeSessions' => DataRoomSession::where('access_grant_id', $grant->id)
                    ->where('expires_at', '>', now())
                    ->where('absolute_expires_at', '>', now())
                    ->get(['ip_address', 'user_agent', 'last_active_at', 'expires_at', 'absolute_expires_at']),
            ],
        ]);
    }

    /**
     * POST /api/admin/dataroom/grants
     *
     * Step 4 of the creation wizard commits here. The response carries the
     * plaintext code for the sharing screen and is the only time it exists
     * outside the visitor's inbox.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'visitor_name' => ['required', 'string', 'max:255'],
            'visitor_email' => ['required', 'email:rfc', 'max:255'],
            'organization' => ['nullable', 'string', 'max:255'],
            'role_title' => ['nullable', 'string', 'max:255'],
            'template_id' => ['nullable', 'integer', 'exists:dataroom_access_templates,id'],
            'duration' => ['nullable', 'in:1h,6h,24h,3d,7d,14d,30d,custom,never'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'starts_at' => ['nullable', 'date'],
            'confirm_never_expires' => ['nullable', 'boolean'],
            'max_uses' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'all_documents_access' => ['sometimes', 'boolean'],
            'downloads_permitted' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'document_ids' => ['nullable', 'array'],
            'document_ids.*' => ['integer', 'exists:dataroom_documents,id'],
            'folder_ids' => ['nullable', 'array'],
            'folder_ids.*' => ['integer', 'exists:dataroom_folders,id'],
            'document_permissions' => ['nullable', 'array'],
            'document_permissions.*.document_id' => ['required', 'integer'],
            'document_permissions.*.can_download' => ['sometimes', 'boolean'],
            'document_permissions.*.can_print' => ['sometimes', 'boolean'],
            'folder_permissions' => ['nullable', 'array'],
            'folder_permissions.*.folder_id' => ['required', 'integer'],
            'folder_permissions.*.can_download' => ['sometimes', 'boolean'],
        ]);

        $template = isset($data['template_id']) ? DataRoomAccessTemplate::find($data['template_id']) : null;

        // A template seeds the scope; anything sent explicitly overrides it, so
        // the wizard's review step is always what actually gets saved.
        if ($template) {
            $data['all_documents_access'] ??= $template->all_documents_access;
            $data['downloads_permitted'] ??= $template->downloads_permitted;
            $data['document_ids'] ??= $template->document_ids ?? [];
            $data['folder_ids'] ??= $template->folder_ids ?? [];
        }

        $expiry = $this->resolveExpiry($data, $template);

        if ($expiry instanceof JsonResponse) {
            return $expiry;
        }

        // Ids named only in the permission matrix count as scope here too, or the
        // wizard would refuse a payload that syncScope() would have granted.
        $scoped = ($data['all_documents_access'] ?? false)
            || ! empty($data['document_ids'])
            || ! empty($data['folder_ids'])
            || ! empty($data['document_permissions'])
            || ! empty($data['folder_permissions']);

        if (! $scoped) {
            return response()->json([
                'message' => 'A grant must include at least one document or category, or full access.',
            ], 422);
        }

        $plaintext = $this->codes->generate();

        $grant = DataRoomAccessGrant::create([
            'visitor_name' => $data['visitor_name'],
            'visitor_email' => strtolower(trim($data['visitor_email'])),
            'organization' => $data['organization'] ?? null,
            'role_title' => $data['role_title'] ?? 'Investor',
            'access_code_hash' => Hash::make($plaintext),
            'code_hint' => $this->codes->hint($plaintext),
            'starts_at' => isset($data['starts_at']) ? Carbon::parse($data['starts_at']) : now(),
            'expires_at' => $expiry,
            'max_uses' => $data['max_uses'] ?? null,
            'current_uses' => 0,
            // Pending until its start time arrives; effectiveStatus() derives
            // that from the clock, so no scheduler is involved.
            'status' => 'active',
            'all_documents_access' => $data['all_documents_access'] ?? false,
            'downloads_permitted' => $data['downloads_permitted'] ?? true,
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $this->syncScope($grant, $data);

        DataRoomAuditLog::record(
            $grant,
            $request->user(),
            'admin_created_access_grant',
            $grant,
            'expires: '.($expiry?->toIso8601String() ?? 'never').($template ? "; template: {$template->name}" : ''),
            $request
        );

        return response()->json([
            'data' => [
                'grant' => $this->payload($grant->fresh(['documents', 'folders', 'creator'])),
                // Shown once. Not recoverable afterwards; use regenerate().
                'accessCode' => $plaintext,
            ],
        ], 201);
    }

    /** PATCH /api/admin/dataroom/grants/{id} — profile, scope and permissions. */
    public function update(Request $request, int $id): JsonResponse
    {
        $grant = DataRoomAccessGrant::findOrFail($id);

        $data = $request->validate([
            'visitor_name' => ['sometimes', 'string', 'max:255'],
            'organization' => ['nullable', 'string', 'max:255'],
            'role_title' => ['sometimes', 'string', 'max:255'],
            'max_uses' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'all_documents_access' => ['sometimes', 'boolean'],
            'downloads_permitted' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'document_ids' => ['nullable', 'array'],
            'document_ids.*' => ['integer', 'exists:dataroom_documents,id'],
            'folder_ids' => ['nullable', 'array'],
            'folder_ids.*' => ['integer', 'exists:dataroom_folders,id'],
            'document_permissions' => ['nullable', 'array'],
            'document_permissions.*.document_id' => ['required', 'integer'],
            'document_permissions.*.can_download' => ['sometimes', 'boolean'],
            'document_permissions.*.can_print' => ['sometimes', 'boolean'],
            'folder_permissions' => ['nullable', 'array'],
            'folder_permissions.*.folder_id' => ['required', 'integer'],
            'folder_permissions.*.can_download' => ['sometimes', 'boolean'],
        ]);

        // The email is immutable. It is half the credential, so changing it
        // would hand an existing code to a different mailbox.
        $grant->update(collect($data)->only([
            'visitor_name', 'organization', 'role_title', 'max_uses',
            'all_documents_access', 'downloads_permitted', 'notes',
        ])->all());

        if (array_key_exists('document_ids', $data) || array_key_exists('folder_ids', $data)
            || array_key_exists('document_permissions', $data) || array_key_exists('folder_permissions', $data)) {
            $this->syncScope($grant, $data);
        }

        DataRoomAuditLog::record($grant, $request->user(), 'admin_updated_access_grant', $grant, implode(', ', array_keys($data)), $request);

        return response()->json(['data' => $this->payload($grant->fresh(['documents', 'folders', 'creator']))]);
    }

    /**
     * POST /api/admin/dataroom/grants/{id}/status
     *
     * activate / suspend / revoke. Revoking and suspending both destroy live
     * sessions immediately, so an investor mid-session loses access on their
     * next request rather than at the end of a TTL.
     */
    public function status(Request $request, int $id): JsonResponse
    {
        $grant = DataRoomAccessGrant::findOrFail($id);

        $data = $request->validate([
            'status' => ['required', 'in:active,suspended,revoked'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        // Revocation is terminal. Reissuing means a new grant, not a resurrected
        // one, so a revoked code can never come back to life.
        if ($grant->status === 'revoked' && $data['status'] !== 'revoked') {
            return response()->json([
                'message' => 'A revoked grant cannot be reactivated. Issue a new grant instead.',
            ], 422);
        }

        $grant->update(['status' => $data['status']]);
        $killed = 0;

        if (in_array($data['status'], ['suspended', 'revoked'], true)) {
            $killed = DataRoomSession::where('access_grant_id', $grant->id)->delete();
        }

        $action = $data['status'] === 'revoked' ? 'admin_revoked_access_grant' : 'admin_changed_grant_status';
        DataRoomAuditLog::record($grant, $request->user(), $action, $grant, trim("{$data['status']}; sessions killed: {$killed}; ".($data['reason'] ?? ''), '; '), $request);

        return response()->json([
            'data' => ['grant' => $this->payload($grant->fresh()), 'sessionsDestroyed' => $killed],
        ]);
    }

    /** POST /api/admin/dataroom/grants/{id}/extend */
    public function extend(Request $request, int $id): JsonResponse
    {
        $grant = DataRoomAccessGrant::findOrFail($id);

        $data = $request->validate([
            'duration' => ['nullable', 'in:1h,6h,24h,3d,7d,14d,30d,custom,never'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'confirm_never_expires' => ['nullable', 'boolean'],
        ]);

        if ($grant->status === 'revoked') {
            return response()->json(['message' => 'A revoked grant cannot be extended.'], 422);
        }

        $expiry = $this->resolveExpiry($data, null);

        if ($expiry instanceof JsonResponse) {
            return $expiry;
        }

        $was = $grant->expires_at?->toIso8601String() ?? 'never';

        // An extension revives an already-expired grant, which is the point:
        // effectiveStatus() recomputes from the new date with no further action.
        $grant->update(['expires_at' => $expiry, 'status' => 'active']);

        DataRoomAuditLog::record($grant, $request->user(), 'admin_extended_access_grant', $grant, "{$was} -> ".($expiry?->toIso8601String() ?? 'never'), $request);

        return response()->json(['data' => $this->payload($grant->fresh())]);
    }

    /**
     * POST /api/admin/dataroom/grants/{id}/regenerate
     *
     * Issues a new code for the same visitor and scope, invalidating the old one
     * and every session opened with it. This is the answer to "I lost the code",
     * because the old one genuinely cannot be read back.
     */
    public function regenerate(Request $request, int $id): JsonResponse
    {
        $grant = DataRoomAccessGrant::findOrFail($id);

        if ($grant->status === 'revoked') {
            return response()->json(['message' => 'A revoked grant cannot be reissued. Create a new grant instead.'], 422);
        }

        $plaintext = $this->codes->generate();

        $grant->update([
            'access_code_hash' => Hash::make($plaintext),
            'code_hint' => $this->codes->hint($plaintext),
            // Usage resets with the credential, otherwise a grant capped at
            // 3 uses would arrive already exhausted.
            'current_uses' => 0,
            'status' => 'active',
        ]);

        $killed = DataRoomSession::where('access_grant_id', $grant->id)->delete();

        DataRoomAuditLog::record($grant, $request->user(), 'admin_regenerated_access_code', $grant, "sessions killed: {$killed}", $request);

        return response()->json([
            'data' => [
                'grant' => $this->payload($grant->fresh()),
                'accessCode' => $plaintext,
                'sessionsDestroyed' => $killed,
            ],
        ]);
    }

    /** DELETE /api/admin/dataroom/grants/{id} — soft delete, keeps the trail. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $grant = DataRoomAccessGrant::findOrFail($id);

        DataRoomSession::where('access_grant_id', $grant->id)->delete();
        $grant->update(['status' => 'revoked']);
        $grant->delete();

        DataRoomAuditLog::record($grant, $request->user(), 'admin_revoked_access_grant', $grant, 'archived', $request);

        return response()->json(['data' => ['success' => true]]);
    }

    /**
     * GET /api/admin/dataroom/permission-matrix
     *
     * Documents down the side, grants across the top. Computed from the same
     * pivot rows the authorizer reads, so what an admin sees here is what the
     * server will actually enforce, not a parallel view that can drift.
     */
    public function matrix(Request $request): JsonResponse
    {
        $documents = DataRoomDocument::orderBy('folder_id')->orderBy('sort_order')->orderBy('title')
            ->get(['id', 'uuid', 'title', 'folder_id', 'status', 'downloads_permitted']);

        $grants = DataRoomAccessGrant::with(['documents:id', 'folders:id'])
            ->orderByDesc('created_at')
            ->get();

        $folders = DataRoomFolder::orderBy('sort_order')->get(['id', 'name']);

        $rows = $documents->map(function (DataRoomDocument $doc) use ($grants) {
            $cells = $grants->map(function (DataRoomAccessGrant $grant) use ($doc) {
                $docPivot = $grant->documents->firstWhere('id', $doc->id)?->pivot;
                $folderPivot = $doc->folder_id
                    ? $grant->folders->firstWhere('id', $doc->folder_id)?->pivot
                    : null;

                $via = match (true) {
                    $grant->all_documents_access => 'all',
                    $docPivot !== null => 'document',
                    $folderPivot !== null => 'folder',
                    default => null,
                };

                $canView = $via !== null && $doc->status === 'published' && $grant->isActive();

                $canDownload = $canView
                    && $this->policy->downloadsEnabled()
                    && $grant->downloads_permitted
                    && $doc->downloads_permitted
                    && match ($via) {
                        'all' => true,
                        'document' => (bool) $docPivot->can_download,
                        'folder' => (bool) $folderPivot->can_download,
                        default => false,
                    };

                return [
                    'grantId' => $grant->id,
                    'via' => $via,
                    'canView' => $canView,
                    'canDownload' => $canDownload,
                    'canPrint' => $via === 'document' ? (bool) $docPivot->can_print : false,
                ];
            });

            return [
                'documentId' => $doc->id,
                'uuid' => $doc->uuid,
                'title' => $doc->title,
                'folderId' => $doc->folder_id,
                'status' => $doc->status,
                'cells' => $cells->values(),
            ];
        });

        return response()->json([
            'data' => [
                'folders' => $folders,
                'grants' => $grants->map(fn (DataRoomAccessGrant $g) => [
                    'id' => $g->id,
                    'visitorName' => $g->visitor_name,
                    'visitorEmail' => $g->visitor_email,
                    'organization' => $g->organization,
                    'status' => $g->effectiveStatus(),
                    'allDocumentsAccess' => (bool) $g->all_documents_access,
                ])->values(),
                'rows' => $rows->values(),
            ],
        ]);
    }

    /** GET /api/admin/dataroom/durations — the wizard's duration options. */
    public function durations(): JsonResponse
    {
        return response()->json([
            'data' => [
                'options' => array_merge(array_keys(self::DURATIONS), ['custom', 'never']),
                'default' => $this->policy->settings()->default_access_duration_days.'d',
                'defaultDurationDays' => $this->policy->settings()->default_access_duration_days,
            ],
        ]);
    }

    // -- internals ---------------------------------------------------------

    /**
     * Turn a duration choice into a concrete timestamp, or null for a grant
     * that never expires.
     *
     * "Never" is the one option that needs an explicit confirmation flag,
     * because a permanent credential to a data room is a decision, not a
     * default.
     */
    private function resolveExpiry(array $data, ?DataRoomAccessTemplate $template): Carbon|JsonResponse|null
    {
        $duration = $data['duration'] ?? null;

        if ($duration === 'never') {
            if (empty($data['confirm_never_expires'])) {
                return response()->json([
                    'message' => 'A grant that never expires requires explicit confirmation.',
                    'errors' => ['confirm_never_expires' => ['Confirm that this access should never expire.']],
                ], 422);
            }

            return null;
        }

        if ($duration === 'custom' || (! $duration && ! empty($data['expires_at']))) {
            if (empty($data['expires_at'])) {
                return response()->json([
                    'message' => 'A custom duration needs an expiry date.',
                    'errors' => ['expires_at' => ['Provide the expiry date and time.']],
                ], 422);
            }

            return Carbon::parse($data['expires_at']);
        }

        if ($duration && isset(self::DURATIONS[$duration])) {
            return now()->addHours(self::DURATIONS[$duration]);
        }

        if ($template?->default_duration_days) {
            return now()->addDays($template->default_duration_days);
        }

        return now()->addDays((int) $this->policy->settings()->default_access_duration_days);
    }

    /**
     * Write the grant's document and folder scope, including the per-resource
     * download and print overrides from the permission matrix.
     */
    private function syncScope(DataRoomAccessGrant $grant, array $data): void
    {
        $docPerms = collect($data['document_permissions'] ?? [])->keyBy('document_id');
        $folderPerms = collect($data['folder_permissions'] ?? [])->keyBy('folder_id');

        // Ids named only in the permission list still count as granted, so the
        // matrix UI can be the single input.
        $docIds = collect($data['document_ids'] ?? [])->merge($docPerms->keys())->unique()->values();
        $folderIds = collect($data['folder_ids'] ?? [])->merge($folderPerms->keys())->unique()->values();

        $grant->documents()->sync(
            $docIds->mapWithKeys(fn ($id) => [(int) $id => [
                // Defaults inherit the grant-level switch rather than assuming
                // yes, so a download-restricted grant stays restricted.
                'can_download' => (bool) ($docPerms[$id]['can_download'] ?? $grant->downloads_permitted),
                'can_print' => (bool) ($docPerms[$id]['can_print'] ?? false),
            ]])->all()
        );

        $grant->folders()->sync(
            $folderIds->mapWithKeys(fn ($id) => [(int) $id => [
                'can_download' => (bool) ($folderPerms[$id]['can_download'] ?? $grant->downloads_permitted),
            ]])->all()
        );
    }

    /** @return array<string,mixed> */
    private function payload(DataRoomAccessGrant $grant): array
    {
        return [
            'id' => $grant->id,
            'uuid' => $grant->uuid,
            'visitorName' => $grant->visitor_name,
            'visitorEmail' => $grant->visitor_email,
            'organization' => $grant->organization,
            'roleTitle' => $grant->role_title,
            // Last four characters only. The full code is unrecoverable.
            'codeHint' => $grant->code_hint,
            'startsAt' => $grant->starts_at?->toIso8601String(),
            'expiresAt' => $grant->expires_at?->toIso8601String(),
            'neverExpires' => $grant->expires_at === null,
            'maxUses' => $grant->max_uses,
            'currentUses' => (int) $grant->current_uses,
            'storedStatus' => $grant->status,
            // What the authorization layer will actually decide right now.
            'status' => $grant->effectiveStatus(),
            'allDocumentsAccess' => (bool) $grant->all_documents_access,
            'downloadsPermitted' => (bool) $grant->downloads_permitted,
            'notes' => $grant->notes,
            'documents' => $grant->relationLoaded('documents')
                ? $grant->documents->map(fn ($d) => [
                    'id' => $d->id,
                    'uuid' => $d->uuid,
                    'title' => $d->title,
                    'canDownload' => (bool) $d->pivot->can_download,
                    'canPrint' => (bool) $d->pivot->can_print,
                ])->values()
                : null,
            'folders' => $grant->relationLoaded('folders')
                ? $grant->folders->map(fn ($f) => [
                    'id' => $f->id,
                    'name' => $f->name,
                    'canDownload' => (bool) $f->pivot->can_download,
                ])->values()
                : null,
            'sessionsCount' => $grant->sessions_count ?? null,
            'createdBy' => $grant->creator?->name,
            'lastAccessedAt' => $grant->last_accessed_at?->toIso8601String(),
            'acknowledgedAt' => $grant->acknowledged_at?->toIso8601String(),
            'createdAt' => $grant->created_at?->toIso8601String(),
        ];
    }
}
