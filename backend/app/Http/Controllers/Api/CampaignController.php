<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CampaignResource;
use App\Jobs\SendCampaignJob;
use App\Models\EmailCampaign;
use App\Models\EmailEvent;
use App\Models\EmailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CampaignController extends Controller
{
    /** GET /campaigns */
    public function index(Request $request): JsonResponse
    {
        $query = EmailCampaign::query()->with('template');

        if (($status = $request->input('status')) && $status !== 'all') {
            $query->where('status', $status);
        }
        if ($search = $request->string('search')->trim()->value()) {
            $query->where('name', 'like', "%{$search}%");
        }

        $campaigns = $query->orderByDesc('created_at')->get();

        return response()->json(['data' => CampaignResource::collection($campaigns)]);
    }

    /** GET /campaigns/:id */
    public function show(string $id): JsonResponse
    {
        $campaign = EmailCampaign::with('template')->where('public_id', $id)->firstOrFail();

        return response()->json(['data' => new CampaignResource($campaign)]);
    }

    /** POST /campaigns */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $campaign = EmailCampaign::create([
            'public_id' => EmailCampaign::nextPublicId(),
            'name' => $data['name'],
            'subject' => $data['subject'],
            'html' => $data['html'] ?? null,
            'status' => $data['status'] ?? 'draft',
            'template_id' => $this->resolveTemplateId($data['template'] ?? null),
            'segment' => $data['segment'] ?? null,
            'scheduled_at' => $data['scheduledAt'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json(['data' => new CampaignResource($campaign->load('template'))], 201);
    }

    /** PATCH /campaigns/:id */
    public function update(Request $request, string $id): JsonResponse
    {
        $campaign = EmailCampaign::where('public_id', $id)->firstOrFail();
        $data = $this->validated($request, false);

        if (array_key_exists('template', $data)) {
            $data['template_id'] = $this->resolveTemplateId($data['template']);
            unset($data['template']);
        }
        if (array_key_exists('scheduledAt', $data)) {
            $data['scheduled_at'] = $data['scheduledAt'];
            unset($data['scheduledAt']);
        }

        $campaign->update($data);

        return response()->json(['data' => new CampaignResource($campaign->fresh('template'))]);
    }

    /** DELETE /campaigns/:id */
    public function destroy(string $id): JsonResponse
    {
        EmailCampaign::where('public_id', $id)->firstOrFail()->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    /** POST /campaigns/:id/send — queue the campaign for delivery. */
    public function send(string $id): JsonResponse
    {
        $campaign = EmailCampaign::where('public_id', $id)->firstOrFail();

        if (in_array($campaign->status, ['sending', 'sent'], true)) {
            throw ValidationException::withMessages(['status' => ['Campaign has already been sent.']]);
        }

        $campaign->update(['status' => 'sending']);
        SendCampaignJob::dispatch($campaign->id);

        return response()->json(['data' => new CampaignResource($campaign->fresh('template'))]);
    }

    /** GET /campaigns/:id/stats — open/click/bounce breakdown for the campaign. */
    public function stats(string $id): JsonResponse
    {
        $campaign = EmailCampaign::where('public_id', $id)->firstOrFail();

        $byType = EmailEvent::where('campaign_id', $campaign->id)
            ->selectRaw('type, COUNT(*) as c')->groupBy('type')->pluck('c', 'type');

        return response()->json(['data' => [
            'sent' => (int) $campaign->sent,
            'opens' => (int) $campaign->opens,
            'clicks' => (int) $campaign->clicks,
            'bounces' => (int) $campaign->bounces,
            'openRate' => $campaign->sent > 0 ? round($campaign->opens / $campaign->sent * 100, 1) : 0,
            'clickRate' => $campaign->sent > 0 ? round($campaign->clicks / $campaign->sent * 100, 1) : 0,
            'events' => $byType,
        ]]);
    }

    private function validated(Request $request, bool $creating = true): array
    {
        return $request->validate([
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'subject' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'html' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'scheduled', 'sending', 'sent'])],
            'template' => ['sometimes', 'nullable', 'string', 'max:64'],
            'segment' => ['sometimes', 'nullable', 'array'],
            'scheduledAt' => ['sometimes', 'nullable', 'date'],
        ]);
    }

    private function resolveTemplateId(?string $publicId): ?int
    {
        if (! $publicId) {
            return null;
        }

        return EmailTemplate::where('public_id', $publicId)->value('id');
    }
}
