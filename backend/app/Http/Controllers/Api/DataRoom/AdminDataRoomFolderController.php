<?php

namespace App\Http\Controllers\Api\DataRoom;

use App\Http\Controllers\Controller;
use App\Models\DataRoomAuditLog;
use App\Models\DataRoomDocument;
use App\Models\DataRoomFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Administrative folder management.
 *
 * The initial MyTijaara structure (01 Corporate Governance, 02 Financials &
 * Models, and so on) is seeded data, not code. Nothing here assumes a fixed set
 * of folders or a fixed count, so the room can grow to 06-12 and beyond without
 * a migration.
 */
class AdminDataRoomFolderController extends Controller
{
    /** GET /api/admin/dataroom/folders */
    public function index(Request $request): JsonResponse
    {
        $folders = DataRoomFolder::withCount([
            'documents',
            'documents as published_documents_count' => fn ($q) => $q->where('status', 'published'),
        ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (DataRoomFolder $f) => [
                'id' => $f->id,
                'name' => $f->name,
                'slug' => $f->slug,
                'description' => $f->description,
                'sortOrder' => (int) $f->sort_order,
                'documentsCount' => (int) $f->documents_count,
                'publishedDocumentsCount' => (int) $f->published_documents_count,
            ]);

        return response()->json(['data' => $folders]);
    }

    /** POST /api/admin/dataroom/folders */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        $folder = DataRoomFolder::create([
            'name' => $data['name'],
            'slug' => $this->uniqueSlug($data['name']),
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? (int) (DataRoomFolder::max('sort_order') + 10),
        ]);

        DataRoomAuditLog::record(null, $request->user(), 'admin_created_folder', $folder, $folder->name, $request);

        return response()->json(['data' => $folder], 201);
    }

    /** PATCH /api/admin/dataroom/folders/{id} */
    public function update(Request $request, int $id): JsonResponse
    {
        $folder = DataRoomFolder::findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        // The slug is part of how grants and links refer to a folder, so a
        // rename does not silently repoint it.
        $folder->update($data);

        DataRoomAuditLog::record(null, $request->user(), 'admin_updated_folder', $folder, implode(', ', array_keys($data)), $request);

        return response()->json(['data' => $folder]);
    }

    /**
     * DELETE /api/admin/dataroom/folders/{id}
     *
     * Refused while documents remain inside. Cascading the delete would take
     * the documents' folder-level grants with it and quietly change who can see
     * what, so the admin has to move or delete the contents first.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $folder = DataRoomFolder::findOrFail($id);
        $count = DataRoomDocument::withTrashed()->where('folder_id', $folder->id)->count();

        if ($count > 0) {
            return response()->json([
                'message' => "This category still holds {$count} document(s). Move or delete them first.",
            ], 422);
        }

        DataRoomAuditLog::record(null, $request->user(), 'admin_deleted_folder', $folder, $folder->name, $request);
        $folder->delete();

        return response()->json(['data' => ['success' => true]]);
    }

    /** POST /api/admin/dataroom/folders/reorder */
    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order' => ['required', 'array', 'min:1'],
            'order.*.id' => ['required', 'integer', 'exists:dataroom_folders,id'],
            'order.*.sort_order' => ['required', 'integer', 'min:0', 'max:9999'],
        ]);

        foreach ($data['order'] as $row) {
            DataRoomFolder::whereKey($row['id'])->update(['sort_order' => $row['sort_order']]);
        }

        DataRoomAuditLog::record(null, $request->user(), 'admin_reordered_folders', null, count($data['order']).' folders', $request);

        return response()->json(['data' => ['success' => true]]);
    }

    /** Slug uniqueness without relying on the database error to find out. */
    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'category';
        $slug = $base;
        $n = 2;

        while (DataRoomFolder::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$n++;
        }

        return $slug;
    }
}
