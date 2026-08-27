<?php

namespace App\Http\Controllers\Api\DataRoom;

use App\Http\Controllers\Controller;
use App\Models\DataRoomAuditLog;
use App\Models\DataRoomDocument;
use App\Models\DataRoomDocumentVersion;
use App\Services\DataRoom\DocumentUploader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Administrative document management.
 *
 * Uploads go through DocumentUploader, which is the only thing in the codebase
 * allowed to decide that a set of bytes may land on the data room disk. This
 * controller never touches a client-supplied path or filename directly.
 */
class AdminDataRoomDocumentController extends Controller
{
    public function __construct(private readonly DocumentUploader $uploader) {}

    /** GET /api/admin/dataroom/documents */
    public function index(Request $request): JsonResponse
    {
        $docs = DataRoomDocument::with(['folder:id,name,slug', 'uploader:id,name'])
            ->withCount('versions')
            ->orderBy('folder_id')
            ->orderBy('sort_order')
            ->orderBy('title')
            ->get()
            ->map(fn (DataRoomDocument $d) => $this->payload($d));

        return response()->json(['data' => $docs]);
    }

    /** GET /api/admin/dataroom/documents/{id} */
    public function show(Request $request, int $id): JsonResponse
    {
        $doc = DataRoomDocument::with(['folder:id,name,slug', 'uploader:id,name', 'versions.uploader:id,name'])
            ->findOrFail($id);

        return response()->json([
            'data' => $this->payload($doc) + [
                'versions' => $doc->versions->sortByDesc('created_at')->values()->map(fn (DataRoomDocumentVersion $v) => [
                    'id' => $v->id,
                    'version' => $v->version,
                    'originalFilename' => $v->original_filename,
                    'fileSize' => (int) $v->file_size,
                    'checksum' => $v->checksum,
                    'changeNotes' => $v->change_notes,
                    'uploadedBy' => $v->uploader?->name,
                    'at' => $v->created_at?->toIso8601String(),
                ]),
            ],
        ]);
    }

    /** POST /api/admin/dataroom/documents */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules() + [
            'file' => ['required', 'file', 'max:'.(int) config('dataroom.uploads.max_kb', 51200)],
            'title' => ['required', 'string', 'max:255'],
            'confidentiality_level' => ['required', 'in:public,internal,confidential,highly_confidential,restricted'],
        ]);

        try {
            $stored = $this->uploader->store($request->file('file'));
        } catch (RuntimeException $e) {
            DataRoomAuditLog::record(null, $request->user(), 'admin_upload_rejected', null, $e->getMessage(), $request);

            return response()->json(['message' => $e->getMessage()], 422);
        }

        $doc = DataRoomDocument::create([
            'folder_id' => $data['folder_id'] ?? null,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'file_path' => $stored['path'],
            'original_filename' => $stored['original_filename'],
            'file_type' => $stored['file_type'],
            'file_size' => $stored['file_size'],
            'checksum' => $stored['checksum'],
            'version' => $data['version'] ?? '1.0',
            // Draft by default. Publishing is a separate, deliberate act, which
            // is what keeps a half-checked document out of an investor's view.
            'status' => $data['status'] ?? 'draft',
            'confidentiality_level' => $data['confidentiality_level'],
            'tags' => $data['tags'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'downloads_permitted' => $data['downloads_permitted'] ?? true,
            'start_here_order' => $data['start_here_order'] ?? null,
            'uploaded_by' => $request->user()->id,
        ]);

        DataRoomDocumentVersion::create([
            'document_id' => $doc->id,
            'version' => $doc->version,
            'file_path' => $stored['path'],
            'original_filename' => $stored['original_filename'],
            'file_size' => $stored['file_size'],
            'checksum' => $stored['checksum'],
            'change_notes' => 'Initial upload',
            'uploaded_by' => $request->user()->id,
        ]);

        DataRoomAuditLog::record(
            null,
            $request->user(),
            'admin_uploaded_document',
            $doc,
            $stored['scanned'] ? 'malware scan: clean' : 'malware scan: not configured',
            $request
        );

        return response()->json([
            'data' => $this->payload($doc->load('folder')),
            'meta' => ['malwareScanned' => $stored['scanned']],
        ], 201);
    }

    /** PATCH /api/admin/dataroom/documents/{id} — metadata only, never bytes. */
    public function update(Request $request, int $id): JsonResponse
    {
        $doc = DataRoomDocument::findOrFail($id);

        $data = $request->validate($this->rules() + [
            'title' => ['sometimes', 'string', 'max:255'],
            'confidentiality_level' => ['sometimes', 'in:public,internal,confidential,highly_confidential,restricted'],
        ]);

        $before = $doc->only(array_keys($data));
        $doc->update($data);

        $changed = collect($data)
            ->reject(fn ($v, $k) => ($before[$k] ?? null) === $v)
            ->keys()
            ->implode(', ');

        DataRoomAuditLog::record(null, $request->user(), 'admin_updated_document', $doc, $changed ? "changed: {$changed}" : null, $request);

        return response()->json(['data' => $this->payload($doc->fresh('folder'))]);
    }

    /**
     * POST /api/admin/dataroom/documents/{id}/versions
     *
     * Non-destructive. The previous version row keeps pointing at its own bytes
     * on disk, so a superseded model can still be produced if a question comes
     * back about what an investor actually saw.
     */
    public function storeVersion(Request $request, int $id): JsonResponse
    {
        $doc = DataRoomDocument::findOrFail($id);

        $data = $request->validate([
            'file' => ['required', 'file', 'max:'.(int) config('dataroom.uploads.max_kb', 51200)],
            'version' => ['required', 'string', 'max:32'],
            'change_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if (DataRoomDocumentVersion::where('document_id', $doc->id)->where('version', $data['version'])->exists()) {
            return response()->json(['message' => 'That version label already exists for this document.'], 422);
        }

        try {
            $stored = $this->uploader->store($request->file('file'));
        } catch (RuntimeException $e) {
            DataRoomAuditLog::record(null, $request->user(), 'admin_upload_rejected', $doc, $e->getMessage(), $request);

            return response()->json(['message' => $e->getMessage()], 422);
        }

        $version = DataRoomDocumentVersion::create([
            'document_id' => $doc->id,
            'version' => $data['version'],
            'file_path' => $stored['path'],
            'original_filename' => $stored['original_filename'],
            'file_size' => $stored['file_size'],
            'checksum' => $stored['checksum'],
            'change_notes' => $data['change_notes'] ?? null,
            'uploaded_by' => $request->user()->id,
        ]);

        $doc->update([
            'file_path' => $stored['path'],
            'original_filename' => $stored['original_filename'],
            'file_type' => $stored['file_type'],
            'file_size' => $stored['file_size'],
            'checksum' => $stored['checksum'],
            'version' => $data['version'],
        ]);

        DataRoomAuditLog::record(null, $request->user(), 'admin_updated_document_version', $doc, "now at {$data['version']}", $request);

        return response()->json(['data' => ['id' => $version->id, 'version' => $version->version]], 201);
    }

    /**
     * GET /api/admin/dataroom/documents/{id}/preview
     *
     * Lets an admin verify what they uploaded without a public URL existing.
     * Streams from the private disk exactly like the visitor path does.
     */
    public function preview(Request $request, int $id): StreamedResponse|JsonResponse
    {
        $doc = DataRoomDocument::findOrFail($id);
        $disk = Storage::disk(config('dataroom.storage_disk', 'dataroom'));

        if (! $disk->exists($doc->file_path)) {
            return response()->json(['message' => 'The stored file for this document is missing.'], 404);
        }

        DataRoomAuditLog::record(null, $request->user(), 'admin_previewed_document', $doc, null, $request);

        return response()->stream(function () use ($disk, $doc) {
            $stream = $disk->readStream($doc->file_path);
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, 200, [
            'Content-Type' => $doc->mimeType(),
            'Content-Disposition' => 'inline; filename="'.addslashes($doc->original_filename).'"',
            'X-Robots-Tag' => 'noindex, nofollow, noarchive',
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }

    /**
     * DELETE /api/admin/dataroom/documents/{id}
     *
     * Soft delete by default, which keeps the audit trail's foreign keys and
     * the historical view counts intact. `?purge=1` additionally removes the
     * bytes and requires `data-room.delete`, enforced on the route.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $doc = DataRoomDocument::withTrashed()->findOrFail($id);
        $purge = $request->boolean('purge');

        if ($purge) {
            $disk = Storage::disk(config('dataroom.storage_disk', 'dataroom'));

            foreach (DataRoomDocumentVersion::where('document_id', $doc->id)->pluck('file_path') as $path) {
                $disk->delete($path);
            }
            $disk->delete($doc->file_path);

            DataRoomAuditLog::record(null, $request->user(), 'admin_deleted_document', $doc, 'purged bytes and record', $request);
            $doc->forceDelete();

            return response()->json(['data' => ['success' => true, 'purged' => true]]);
        }

        $doc->delete();
        DataRoomAuditLog::record(null, $request->user(), 'admin_deleted_document', $doc, 'soft deleted', $request);

        return response()->json(['data' => ['success' => true, 'purged' => false]]);
    }

    /** POST /api/admin/dataroom/documents/{id}/restore */
    public function restore(Request $request, int $id): JsonResponse
    {
        $doc = DataRoomDocument::withTrashed()->findOrFail($id);
        $doc->restore();

        DataRoomAuditLog::record(null, $request->user(), 'admin_restored_document', $doc, null, $request);

        return response()->json(['data' => $this->payload($doc->fresh('folder'))]);
    }

    // -- internals ---------------------------------------------------------

    /** Shared optional rules for store and update. */
    private function rules(): array
    {
        return [
            'description' => ['nullable', 'string', 'max:5000'],
            'folder_id' => ['nullable', 'integer', 'exists:dataroom_folders,id'],
            'version' => ['nullable', 'string', 'max:32'],
            'status' => ['sometimes', 'in:draft,published,archived,restricted,superseded'],
            'tags' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'downloads_permitted' => ['sometimes', 'boolean'],
            'start_here_order' => ['nullable', 'integer', 'min:1', 'max:99'],
        ];
    }

    /** @return array<string,mixed> */
    private function payload(DataRoomDocument $doc): array
    {
        return [
            'id' => $doc->id,
            // The uuid is what the visitor API uses. file_path is never sent.
            'uuid' => $doc->uuid,
            'title' => $doc->title,
            'description' => $doc->description,
            'folderId' => $doc->folder_id,
            'folderName' => $doc->folder?->name,
            'originalFilename' => $doc->original_filename,
            'fileType' => $doc->file_type,
            'fileSize' => (int) $doc->file_size,
            'checksum' => $doc->checksum,
            'version' => $doc->version,
            'versionsCount' => $doc->versions_count ?? null,
            'status' => $doc->status,
            'confidentialityLevel' => $doc->confidentiality_level,
            'tags' => $doc->tags,
            'sortOrder' => (int) $doc->sort_order,
            'downloadsPermitted' => (bool) $doc->downloads_permitted,
            'startHereOrder' => $doc->start_here_order,
            'viewCount' => (int) $doc->view_count,
            'downloadCount' => (int) $doc->download_count,
            'uploadedBy' => $doc->uploader?->name,
            'createdAt' => $doc->created_at?->toIso8601String(),
            'updatedAt' => $doc->updated_at?->toIso8601String(),
            'deletedAt' => $doc->deleted_at?->toIso8601String(),
        ];
    }
}
