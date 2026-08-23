<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CampaignResource;
use App\Jobs\SendCampaignJob;
use App\Models\EmailCampaign;
use App\Models\EmailEvent;
use App\Models\EmailTemplate;
use App\Support\CampaignSegment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
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

    /**
     * POST /campaigns/:id/duplicate — copy a campaign back to draft.
     *
     * The counters and send timestamps are deliberately not copied: a duplicate
     * has sent nothing, so inheriting the original's opens would invent stats.
     */
    public function duplicate(Request $request, string $id): JsonResponse
    {
        $source = EmailCampaign::where('public_id', $id)->firstOrFail();

        $copy = EmailCampaign::create([
            'public_id' => EmailCampaign::nextPublicId(),
            'name' => Str::limit($source->name.' (copy)', 255, ''),
            'subject' => $source->subject,
            'html' => $source->html,
            'status' => 'draft',
            'template_id' => $source->template_id,
            'segment' => $source->segment,
            'scheduled_at' => null,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json(['data' => new CampaignResource($copy->load('template'))], 201);
    }

    /**
     * GET /campaigns/segments — the preset list with a live reach for each.
     *
     * The builder hardcoded these counts ("All active users (2,847)"), so the
     * figure on screen had no connection to who would actually be mailed.
     */
    public function segments(): JsonResponse
    {
        $presets = [];
        foreach (CampaignSegment::PRESETS as $value => $label) {
            $rules = CampaignSegment::rulesFor($value);
            $presets[] = [
                'value' => $value,
                'label' => $label,
                'rules' => $rules,
                'reach' => CampaignSegment::reach($rules),
            ];
        }

        // Dynamic city segments from real waitlist records
        $cities = \App\Models\WaitlistEntry::whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->orderBy('city')
            ->pluck('city');

        foreach ($cities as $city) {
            $rules = ['city' => $city];
            $presets[] = [
                'value' => 'city:' . $city,
                'label' => 'City: ' . $city,
                'rules' => $rules,
                'reach' => CampaignSegment::reach($rules),
            ];
        }

        return response()->json(['data' => $presets]);
    }

    /** POST /campaigns/:id/send — send the campaign for immediate delivery. */
    public function send(string $id): JsonResponse
    {
        $campaign = EmailCampaign::where('public_id', $id)->firstOrFail();

        if (in_array($campaign->status, ['sending', 'sent'], true)) {
            throw ValidationException::withMessages(['status' => ['Campaign has already been sent.']]);
        }

        $campaign->update(['status' => 'sending']);

        // Dispatch synchronously so it sends immediately even on shared hosting without a daemon worker
        try {
            SendCampaignJob::dispatchSync($campaign->id);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Synchronous campaign send error', [
                'campaign_id' => $campaign->id,
                'error' => $e->getMessage(),
            ]);
            $campaign->update(['status' => 'failed']);
            throw $e;
        }

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
        $data = $request->validate([
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'subject' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'html' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(['draft', 'scheduled', 'sending', 'sent'])],
            'template' => ['sometimes', 'nullable', 'string', 'max:64'],
            'segment' => ['sometimes', 'nullable', 'array'],
            // Future-dating is enforced below rather than with `after:now`,
            // because it must only apply when the status is `scheduled` (a draft
            // may legitimately keep an old timestamp).
            'scheduledAt' => ['sometimes', 'nullable', 'date'],
        ]);

        // A `scheduled` campaign with no send time never sends: the dispatcher
        // filters on `whereNotNull('scheduled_at')`. Rejecting it here is what
        // stops "Schedule for later" from silently becoming a dead draft.
        if (($data['status'] ?? null) === 'scheduled' && empty($data['scheduledAt'])) {
            throw ValidationException::withMessages([
                'scheduledAt' => ['Pick a send time for a scheduled campaign.'],
            ]);
        }

        if (! empty($data['scheduledAt']) && ($data['status'] ?? null) === 'scheduled'
            && now()->gte($data['scheduledAt'])) {
            throw ValidationException::withMessages([
                'scheduledAt' => ['The send time has to be in the future.'],
            ]);
        }

        return $data;
    }

    private function resolveTemplateId(?string $publicId): ?int
    {
        if (! $publicId) {
            return null;
        }

        return EmailTemplate::where('public_id', $publicId)->value('id');
    }
}
