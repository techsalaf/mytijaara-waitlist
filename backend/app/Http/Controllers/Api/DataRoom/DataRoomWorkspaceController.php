<?php

namespace App\Http\Controllers\Api\DataRoom;

use App\Http\Controllers\Controller;
use App\Models\DataRoomAccessGrant;
use App\Models\DataRoomAuditLog;
use App\Models\DataRoomDocument;
use App\Models\DataRoomDocumentView;
use App\Models\DataRoomFolder;
use App\Services\DataRoom\DataRoomAuthorizer;
use App\Services\DataRoom\DataRoomPolicyResolver;
use App\Services\DataRoom\PdfWatermarker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Visitor-facing data room workspace.
 *
 * Every method here reads the access grant from request attributes, which the
 * DataRoomAuthenticate middleware set after validating the session token. No
 * method trusts an id, uuid, or flag supplied by the client for authorization.
 */
class DataRoomWorkspaceController extends Controller
{
    public function __construct(
        private readonly DataRoomAuthorizer $authorizer,
        private readonly PdfWatermarker $watermarker,
        private readonly DataRoomPolicyResolver $policy,
    ) {}

    /** GET /api/dataroom/dashboard */
    public function dashboard(Request $request): JsonResponse
    {
        $grant = $this->grant($request);
        $counts = $this->authorizer->counts($grant);

        DataRoomAuditLog::record($grant, null, 'viewed_dashboard', null, null, $request);

        return response()->json([
            'data' => [
                'categoriesCount' => DataRoomFolder::count(),
                'totalDocuments' => $counts['total'],
                'accessibleDocuments' => $counts['accessible'],
                'restrictedDocuments' => $counts['restricted'],
                'startHere' => $this->authorizer
                    ->accessibleDocumentsQuery($grant)
                    ->orderBy('start_here_order')
                    ->orderBy('title')
                    ->whereNotNull('start_here_order')
                    ->limit(5)
                    ->get()
                    ->map(fn (DataRoomDocument $d) => [
                        'uuid' => $d->uuid,
                        'title' => $d->title,
                        'description' => $d->description,
                        'fileType' => $d->file_type,
                    ])->values(),
                'visitor' => $this->visitorPayload($grant),
            ],
        ]);
    }

    /** GET /api/dataroom/folders */
    public function folders(Request $request): JsonResponse
    {
        $grant = $this->grant($request);

        $folders = DataRoomFolder::with(['documents' => fn ($q) => $q
            ->where('status', 'published')
            ->orderBy('sort_order')
            ->orderBy('title')])
            ->orderBy('sort_order')
            ->get();

        $allowedDocIds = $this->authorizer->allowedDocumentIds($grant);
        $allowedFolderIds = $this->authorizer->allowedFolderIds($grant);
        $downloadMap = $this->authorizer->downloadPermissionMap($grant);
        $all = $grant->all_documents_access;

        $payload = $folders->map(function (DataRoomFolder $folder) use ($grant, $all, $allowedDocIds, $allowedFolderIds, $downloadMap) {
            $folderAccessible = $all || in_array($folder->id, $allowedFolderIds, true);

            $documents = $folder->documents->map(function (DataRoomDocument $doc) use ($grant, $folderAccessible, $allowedDocIds, $downloadMap) {
                $accessible = $folderAccessible || in_array($doc->id, $allowedDocIds, true);

                return $this->documentCard($doc, $grant, $accessible, $downloadMap);
            });

            // A folder with no accessible documents is still listed so the
            // visitor understands the shape of the room, but its description is
            // withheld unless they can see inside it.
            return [
                'id' => $folder->id,
                'name' => $folder->name,
                'slug' => $folder->slug,
                'description' => $folderAccessible || $documents->contains(fn ($d) => $d['accessible'])
                    ? $folder->description
                    : null,
                'accessible' => $folderAccessible,
                'accessibleCount' => $documents->where('accessible', true)->count(),
                'documents' => $documents->values(),
            ];
        });

        DataRoomAuditLog::record($grant, null, 'viewed_folders', null, null, $request);

        return response()->json(['data' => $payload]);
    }

    /** GET /api/dataroom/search?q= */
    public function search(Request $request): JsonResponse
    {
        $grant = $this->grant($request);
        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json(['data' => []]);
        }

        $downloadMap = $this->authorizer->downloadPermissionMap($grant);

        $docs = $this->authorizer->accessibleDocumentsQuery($grant)
            ->where(fn ($q) => $q
                ->where('title', 'like', "%{$query}%")
                ->orWhere('description', 'like', "%{$query}%")
                ->orWhere('tags', 'like', "%{$query}%"))
            ->with('folder')
            ->limit(50)
            ->get()
            ->map(fn (DataRoomDocument $doc) => $this->documentCard($doc, $grant, true, $downloadMap) + [
                'folderName' => $doc->folder?->name,
            ]);

        DataRoomAuditLog::record($grant, null, 'searched_documents', null, "query={$query}", $request);

        return response()->json(['data' => $docs->values()]);
    }

    /** GET /api/dataroom/documents/{uuid} — metadata for an authorized document. */
    public function show(Request $request, string $uuid): JsonResponse
    {
        $grant = $this->grant($request);
        $doc = $this->authorizeDocument($request, $grant, $uuid, 'view');

        if ($doc instanceof JsonResponse) {
            return $doc;
        }

        $doc->increment('view_count');
        DataRoomDocumentView::create([
            'document_id' => $doc->id,
            'access_grant_id' => $grant->id,
            'action_type' => 'view',
        ]);
        DataRoomAuditLog::record($grant, null, 'viewed_document', $doc, null, $request);

        return response()->json([
            'data' => $this->documentCard($doc->load('folder'), $grant, true) + [
                'folderName' => $doc->folder?->name,
                'updatedAt' => $doc->updated_at?->toIso8601String(),
                'watermark' => $this->watermarkLines($grant),
            ],
        ]);
    }

    /**
     * GET /api/dataroom/documents/{uuid}/preview
     *
     * Streams bytes inline. PDFs are watermarked per visitor before streaming
     * when watermarking is enabled. Nothing is written to a public path and no
     * storage URL is ever handed to the client.
     */
    public function preview(Request $request, string $uuid): Response|StreamedResponse|JsonResponse
    {
        $grant = $this->grant($request);
        $doc = $this->authorizeDocument($request, $grant, $uuid, 'preview');

        if ($doc instanceof JsonResponse) {
            return $doc;
        }

        $disk = Storage::disk(config('dataroom.storage_disk', 'dataroom'));
        if (! $disk->exists($doc->file_path)) {
            return response()->json(['message' => 'This document is not currently available.'], 404);
        }

        $doc->increment('view_count');
        DataRoomDocumentView::create([
            'document_id' => $doc->id,
            'access_grant_id' => $grant->id,
            'action_type' => 'preview',
        ]);
        DataRoomAuditLog::record($grant, null, 'previewed_document', $doc, null, $request);

        $headers = [
            'Content-Type' => $doc->mimeType(),
            'Content-Disposition' => 'inline; filename="'.addslashes($doc->original_filename).'"',
            'X-Robots-Tag' => 'noindex, nofollow, noarchive',
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
        ];

        // Both the environment and the admin setting must allow watermarking;
        // DataRoomPolicyResolver::watermarkEnabled() is the single answer.
        if ($this->policy->watermarkEnabled() && $doc->isWatermarkable()) {
            $stamped = $this->watermarker->stamp(
                $disk->get($doc->file_path),
                $this->watermarkLines($grant),
            );

            if ($stamped !== null) {
                return response($stamped, 200, $headers + ['Content-Length' => (string) strlen($stamped)]);
            }
        }

        return response()->stream(function () use ($disk, $doc) {
            $stream = $disk->readStream($doc->file_path);
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, 200, $headers);
    }

    /** GET /api/dataroom/documents/{uuid}/download */
    public function download(Request $request, string $uuid): Response|StreamedResponse|JsonResponse
    {
        $grant = $this->grant($request);

        $doc = $this->authorizeDocument($request, $grant, $uuid, 'download');
        if ($doc instanceof JsonResponse) {
            return $doc;
        }

        // Download is a second, independent gate on top of read access.
        if (! $this->authorizer->canDownload($grant, $doc)) {
            DataRoomAuditLog::record($grant, null, 'download_denied', $doc, 'download not permitted', $request);

            return response()->json([
                'message' => 'Downloads are not enabled for this document.',
            ], 403);
        }

        $disk = Storage::disk(config('dataroom.storage_disk', 'dataroom'));
        if (! $disk->exists($doc->file_path)) {
            return response()->json(['message' => 'This document is not currently available.'], 404);
        }

        $doc->increment('download_count');
        DataRoomDocumentView::create([
            'document_id' => $doc->id,
            'access_grant_id' => $grant->id,
            'action_type' => 'download',
        ]);
        DataRoomAuditLog::record($grant, null, 'downloaded_document', $doc, null, $request);

        $headers = [
            'Content-Type' => $doc->mimeType(),
            'Content-Disposition' => 'attachment; filename="'.addslashes($doc->original_filename).'"',
            'X-Robots-Tag' => 'noindex, nofollow, noarchive',
            'Cache-Control' => 'private, no-store, max-age=0',
        ];

        if ($this->policy->watermarkEnabled() && $doc->isWatermarkable()) {
            $stamped = $this->watermarker->stamp($disk->get($doc->file_path), $this->watermarkLines($grant));
            if ($stamped !== null) {
                return response($stamped, 200, $headers + ['Content-Length' => (string) strlen($stamped)]);
            }
        }

        return response()->stream(function () use ($disk, $doc) {
            $stream = $disk->readStream($doc->file_path);
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, 200, $headers);
    }

    /** GET /api/dataroom/activity — the visitor's own trail, nobody else's. */
    public function activity(Request $request): JsonResponse
    {
        $grant = $this->grant($request);

        $rows = DataRoomAuditLog::where('access_grant_id', $grant->id)
            ->whereIn('action', ['authenticated', 'viewed_document', 'previewed_document', 'downloaded_document', 'logout'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (DataRoomAuditLog $log) => [
                'action' => $log->action,
                'documentTitle' => $log->target_type === DataRoomDocument::class
                    ? DataRoomDocument::withTrashed()->find($log->target_id)?->title
                    : null,
                'at' => $log->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $rows->values()]);
    }

    /** POST /api/dataroom/acknowledge — record confidentiality acknowledgement. */
    public function acknowledge(Request $request): JsonResponse
    {
        $grant = $this->grant($request);

        if (! $grant->acknowledged_at) {
            $grant->update(['acknowledged_at' => now()]);
            DataRoomAuditLog::record($grant, null, 'acknowledged_confidentiality', $grant, null, $request);
        }

        return response()->json(['data' => ['acknowledgedAt' => $grant->acknowledged_at?->toIso8601String()]]);
    }

    // -- internals ---------------------------------------------------------

    private function grant(Request $request): DataRoomAccessGrant
    {
        return $request->attributes->get('dataroom_grant');
    }

    /**
     * Resolve a document by opaque uuid and authorize it, or return the error
     * response. Unauthorized and non-existent both answer 404 so the endpoint
     * cannot be used to probe which documents exist.
     */
    private function authorizeDocument(Request $request, DataRoomAccessGrant $grant, string $uuid, string $action): DataRoomDocument|JsonResponse
    {
        $doc = DataRoomDocument::where('uuid', $uuid)->where('status', 'published')->first();

        if (! $doc) {
            DataRoomAuditLog::record($grant, null, 'access_denied', null, "unknown document uuid on {$action}", $request);

            return response()->json(['message' => 'This document is not available.'], 404);
        }

        if (! $this->authorizer->canAccess($grant, $doc)) {
            DataRoomAuditLog::record($grant, null, 'access_denied', $doc, "unauthorized {$action}", $request);

            return response()->json(['message' => 'This document is not available.'], 404);
        }

        return $doc;
    }

    /** @return array<string,mixed> */
    private function documentCard(DataRoomDocument $doc, DataRoomAccessGrant $grant, bool $accessible, ?array $downloadMap = null): array
    {
        $downloadPermitted = false;
        if ($accessible) {
            $downloadPermitted = $downloadMap !== null
                ? (bool) ($downloadMap[(int) $doc->id] ?? false)
                : $this->authorizer->canDownload($grant, $doc);
        }

        return [
            'uuid' => $doc->uuid,
            'title' => $doc->title,
            // Descriptions can themselves be confidential, so locked cards
            // expose title and type only.
            'description' => $accessible ? $doc->description : null,
            'fileType' => $doc->file_type,
            'fileSize' => $accessible ? $doc->file_size : null,
            'version' => $accessible ? $doc->version : null,
            'confidentialityLevel' => $doc->confidentiality_level,
            'accessible' => $accessible,
            'downloadPermitted' => $downloadPermitted,
            'previewSupported' => $accessible && $doc->isPreviewable(),
        ];
    }

    /** @return array<string,mixed> */
    private function visitorPayload(DataRoomAccessGrant $grant): array
    {
        return [
            'name' => $grant->visitor_name,
            'email' => $grant->visitor_email,
            'organization' => $grant->organization,
            'role' => $grant->role_title,
            'expiresAt' => $grant->expires_at?->toIso8601String(),
            'acknowledgedAt' => $grant->acknowledged_at?->toIso8601String(),
        ];
    }

    /** @return list<string> */
    private function watermarkLines(DataRoomAccessGrant $grant): array
    {
        return array_values(array_filter([
            'CONFIDENTIAL',
            'Prepared for: '.$grant->visitor_email,
            $grant->organization,
            'MyTijaara Investor Data Room',
            now()->format('j F Y'),
        ]));
    }
}
