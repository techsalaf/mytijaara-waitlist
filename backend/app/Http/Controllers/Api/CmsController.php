<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CmsSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CmsController extends Controller
{
    /** Cache key for the whole public payload. Forgotten on every write. */
    public const PUBLIC_CACHE_KEY = 'cms_all';

    /**
     * GET /cms — every published section keyed by section name.
     *
     * Disabled sections are deliberately still returned, carrying
     * `enabled: false` and an empty `data` object. The frontend needs to be
     * able to tell "the administrator switched this section off" apart from
     * "this section is missing / the API is unreachable": the first must hide
     * the section, the second must fall back to the bundled defaults so the
     * page still renders. Filtering disabled rows out here made the two cases
     * indistinguishable, which is why toggling a section off used to leave the
     * hardcoded default copy on the page instead of hiding it.
     *
     * `data` is stripped for disabled sections so switching a section off can
     * never leak its content into the page, even from a consumer that forgets
     * to check the flag.
     */
    public function index(): JsonResponse
    {
        $data = Cache::remember(self::PUBLIC_CACHE_KEY, now()->addMinutes(5), function () {
            return CmsSection::query()->where('published', true)->orderBy('order')->get()
                ->mapWithKeys(fn ($s) => [$s->section => $this->presentPublic($s)])
                ->all();
        });

        return response()->json(['data' => $data]);
    }

    /** GET /cms/:section — one published section, disabled or not. */
    public function show(string $section): JsonResponse
    {
        $row = CmsSection::where('section', $section)->where('published', true)->firstOrFail();

        return response()->json(['data' => $this->presentPublic($row)]);
    }

    /** PATCH /cms/:section — update content, enabled/order flags, draft, publish. */
    public function adminIndex(): JsonResponse
    {
        return response()->json(['data' => CmsSection::query()->orderBy('order')->get()
            ->mapWithKeys(fn ($section) => [$section->section => $this->present($section, true)])
            ->all()]);
    }

    public function adminShow(string $section): JsonResponse
    {
        // Return a sensible empty structure when the section hasn't been seeded
        // yet — this avoids a 404 on fresh deployments where the CMS table exists
        // but specific sections have not yet been inserted.
        //
        // `enabled` and `published` are true here, not false, and they have to
        // match what `update()` writes when it creates the row below. The editor
        // hook (`useCmsSection`) seeds its local switches from this response and
        // sends them straight back on save, so reporting `false` created every
        // brand-new section switched off and unpublished: an administrator would
        // fill the form, see "Changes saved", see their copy again after a
        // refresh, and never see it on the public site.
        $row = CmsSection::where('section', $section)->first();
        if (! $row) {
            return response()->json(['data' => [
                'section' => $section,
                'title' => ucfirst(str_replace(['_', '-'], ' ', $section)),
                'data' => (object) [],
                'draft' => null,
                'enabled' => true,
                'published' => true,
                'order' => 0,
                'scheduledAt' => null,
            ]]);
        }

        return response()->json(['data' => $this->present($row, true)]);
    }

    public function update(Request $request, string $section): JsonResponse
    {
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

        // `adminShow()` hands the editor a synthetic empty row for a section that
        // has never been seeded, so the first save of such a section has to be
        // able to create it. Without this the editor showed a success-shaped
        // request that 404'd and silently dropped the administrator's work.
        $row = CmsSection::firstOrNew(['section' => $section]);
        if (! $row->exists) {
            $row->title = $payload['title'] ?? ucfirst(str_replace(['_', '-'], ' ', $section));
            $row->published = true;
            $row->enabled = true;
            $row->order = CmsSection::max('order') + 1;
        }

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

        Cache::forget(self::PUBLIC_CACHE_KEY);

        return response()->json(['data' => $this->present($row->fresh(), true)]);
    }

    /** Admin view: full row including the unpublished draft when asked for. */
    private function present(CmsSection $s, bool $includeDraft = false): array
    {
        return [
            'section' => $s->section,
            'title' => $s->title,
            'data' => $s->data ?? [],
            'draft' => $includeDraft ? $s->draft : null,
            'enabled' => (bool) $s->enabled,
            'published' => (bool) $s->published,
            'order' => (int) $s->order,
            'scheduledAt' => optional($s->scheduled_at)->toIso8601String(),
        ];
    }

    /**
     * Public view: never carries the draft, and carries no `data` at all when
     * the section is switched off. `enabled` is the contract the frontend uses
     * to hide the section, so it must survive the trip.
     */
    private function presentPublic(CmsSection $s): array
    {
        $enabled = (bool) $s->enabled;

        return [
            'section' => $s->section,
            'title' => $s->title,
            'data' => $enabled ? ($s->data ?? []) : [],
            'draft' => null,
            'enabled' => $enabled,
            'published' => (bool) $s->published,
            'order' => (int) $s->order,
            'scheduledAt' => optional($s->scheduled_at)->toIso8601String(),
        ];
    }
}
