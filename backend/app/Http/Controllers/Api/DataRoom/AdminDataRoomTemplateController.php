<?php

namespace App\Http\Controllers\Api\DataRoom;

use App\Http\Controllers\Controller;
use App\Models\DataRoomAccessTemplate;
use App\Models\DataRoomAuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Saved access templates.
 *
 * The point of a template is that "Bank Partner" means one thing, decided once,
 * rather than being reassembled from memory each time a grant is issued and
 * getting it subtly wrong. Applying a template copies its lists onto the grant,
 * so editing a template later never widens access for anyone already holding a
 * credential.
 */
class AdminDataRoomTemplateController extends Controller
{
    /** GET /api/admin/dataroom/templates */
    public function index(Request $request): JsonResponse
    {
        $templates = DataRoomAccessTemplate::with('creator:id,name')
            ->orderBy('name')
            ->get()
            ->map(fn (DataRoomAccessTemplate $t) => $this->payload($t));

        return response()->json(['data' => $templates]);
    }

    /** POST /api/admin/dataroom/templates */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules() + [
            'name' => ['required', 'string', 'max:255', 'unique:dataroom_access_templates,name'],
        ]);

        $template = DataRoomAccessTemplate::create($data + ['created_by' => $request->user()->id]);

        DataRoomAuditLog::record(null, $request->user(), 'admin_created_access_template', $template, $template->name, $request);

        return response()->json(['data' => $this->payload($template)], 201);
    }

    /** PATCH /api/admin/dataroom/templates/{id} */
    public function update(Request $request, int $id): JsonResponse
    {
        $template = DataRoomAccessTemplate::findOrFail($id);

        $data = $request->validate($this->rules() + [
            'name' => ['sometimes', 'string', 'max:255', 'unique:dataroom_access_templates,name,'.$template->id],
        ]);

        $template->update($data);

        DataRoomAuditLog::record(null, $request->user(), 'admin_updated_access_template', $template, implode(', ', array_keys($data)), $request);

        return response()->json(['data' => $this->payload($template->fresh())]);
    }

    /**
     * DELETE /api/admin/dataroom/templates/{id}
     *
     * Safe at any time. Grants issued from this template carry their own copies
     * of the document and folder lists, so nobody loses or gains access.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $template = DataRoomAccessTemplate::findOrFail($id);

        DataRoomAuditLog::record(null, $request->user(), 'admin_deleted_access_template', $template, $template->name, $request);
        $template->delete();

        return response()->json(['data' => ['success' => true]]);
    }

    // -- internals ---------------------------------------------------------

    private function rules(): array
    {
        return [
            'description' => ['nullable', 'string', 'max:2000'],
            'all_documents_access' => ['sometimes', 'boolean'],
            'downloads_permitted' => ['sometimes', 'boolean'],
            'default_duration_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'document_ids' => ['nullable', 'array'],
            'document_ids.*' => ['integer', 'exists:dataroom_documents,id'],
            'folder_ids' => ['nullable', 'array'],
            'folder_ids.*' => ['integer', 'exists:dataroom_folders,id'],
        ];
    }

    /** @return array<string,mixed> */
    private function payload(DataRoomAccessTemplate $t): array
    {
        return [
            'id' => $t->id,
            'name' => $t->name,
            'description' => $t->description,
            'allDocumentsAccess' => (bool) $t->all_documents_access,
            'downloadsPermitted' => (bool) $t->downloads_permitted,
            'defaultDurationDays' => $t->default_duration_days,
            'documentIds' => $t->document_ids ?? [],
            'folderIds' => $t->folder_ids ?? [],
            'createdBy' => $t->creator?->name,
            'createdAt' => $t->created_at?->toIso8601String(),
        ];
    }
}
