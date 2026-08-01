<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmailTemplateResource;
use App\Models\EmailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    /** GET /templates */
    public function index(): JsonResponse
    {
        $templates = EmailTemplate::query()->orderByDesc('updated_at')->get();

        return response()->json(['data' => EmailTemplateResource::collection($templates)]);
    }

    /** GET /templates/:id */
    public function show(string $id): JsonResponse
    {
        $template = EmailTemplate::where('public_id', $id)->firstOrFail();

        return response()->json(['data' => new EmailTemplateResource($template)]);
    }

    /** POST /templates */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $template = EmailTemplate::create([
            'public_id' => $this->nextPublicId(),
            'name' => $data['name'],
            'category' => $data['category'] ?? 'newsletter',
            'subject' => $data['subject'] ?? null,
            'html' => $data['html'] ?? null,
            'text' => $data['text'] ?? null,
            'thumbnail' => $data['thumbnail'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json(['data' => new EmailTemplateResource($template)], 201);
    }

    /** PATCH /templates/:id */
    public function update(Request $request, string $id): JsonResponse
    {
        $template = EmailTemplate::where('public_id', $id)->firstOrFail();
        $template->update($this->validated($request, false));

        return response()->json(['data' => new EmailTemplateResource($template->fresh())]);
    }

    /** DELETE /templates/:id */
    public function destroy(string $id): JsonResponse
    {
        EmailTemplate::where('public_id', $id)->firstOrFail()->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    private function validated(Request $request, bool $creating = true): array
    {
        return $request->validate([
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'nullable', 'string', 'max:64'],
            'subject' => ['sometimes', 'nullable', 'string', 'max:255'],
            'html' => ['sometimes', 'nullable', 'string'],
            'text' => ['sometimes', 'nullable', 'string'],
            'thumbnail' => ['sometimes', 'nullable', 'string', 'max:512'],
        ]);
    }

    private function nextPublicId(): string
    {
        $max = EmailTemplate::withTrashed()->count() + 1;

        do {
            $id = 'tpl_'.$max++;
        } while (EmailTemplate::withTrashed()->where('public_id', $id)->exists());

        return $id;
    }
}
