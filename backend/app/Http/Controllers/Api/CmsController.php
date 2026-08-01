<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CmsSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CmsController extends Controller
{
    /** GET /cms — all published sections keyed by section name. */
    public function index(): JsonResponse
    {
        $data = Cache::remember('cms_all', now()->addMinutes(5), function () {
            return CmsSection::query()->orderBy('order')->get()
                ->mapWithKeys(fn ($s) => [$s->section => $this->present($s)])
                ->all();
        });

        return response()->json(['data' => $data]);
    }

    /** GET /cms/:section */
    public function show(string $section): JsonResponse
    {
        $row = CmsSection::where('section', $section)->firstOrFail();

        return response()->json(['data' => $this->present($row)]);
    }

    /** PATCH /cms/:section — update content, enabled/order flags, draft, publish. */
    public function update(Request $request, string $section): JsonResponse
    {
        $row = CmsSection::where('section', $section)->firstOrFail();

        $payload = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'data' => ['sometimes', 'array'],
            'draft' => ['sometimes', 'nullable', 'array'],
            'enabled' => ['sometimes', 'boolean'],
            'published' => ['sometimes', 'boolean'],
            'order' => ['sometimes', 'integer'],
            'scheduled_at' => ['sometimes', 'nullable', 'date'],
            'publish_draft' => ['sometimes', 'boolean'],
        ]);

        // Promote draft -> data when publishing.
        if (! empty($payload['publish_draft']) && ($payload['draft'] ?? $row->draft)) {
            $row->data = $payload['draft'] ?? $row->draft;
            $row->draft = null;
            $row->published = true;
            // The requested draft was promoted; do not write it back below.
            unset($payload['draft']);
        }
        unset($payload['publish_draft']);

        $row->fill($payload);
        $row->updated_by = $request->user()?->id;
        $row->save();

        Cache::forget('cms_all');

        return response()->json(['data' => $this->present($row->fresh())]);
    }

    private function present(CmsSection $s): array
    {
        return [
            'section' => $s->section,
            'title' => $s->title,
            'data' => $s->data ?? [],
            'draft' => $s->draft,
            'enabled' => (bool) $s->enabled,
            'published' => (bool) $s->published,
            'order' => (int) $s->order,
            'scheduledAt' => optional($s->scheduled_at)->toIso8601String(),
        ];
    }
}
