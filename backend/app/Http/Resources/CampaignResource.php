<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Maps EmailCampaign -> frontend Campaign. */
class CampaignResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $sent = (int) $this->sent;

        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'status' => $this->status,
            'subject' => (string) ($this->subject ?? ''),
            'html' => (string) ($this->html ?? ''),
            'sent' => $sent,
            'opens' => (int) $this->opens,
            'clicks' => (int) $this->clicks,
            'bounces' => (int) $this->bounces,
            'recipients' => (int) $this->recipients,
            // Computed server-side so every screen shows the same rate instead of
            // each one dividing by its own denominator.
            'openRate' => $sent > 0 ? round($this->opens / $sent * 100, 1) : 0.0,
            'clickRate' => $sent > 0 ? round($this->clicks / $sent * 100, 1) : 0.0,
            'sentAt' => $this->sent_at ? $this->sent_at->toDateString() : '',
            // The scheduled list read `sentAt`, which is always empty for a
            // scheduled campaign, so every row printed "Not scheduled".
            'scheduledAt' => $this->scheduled_at?->toIso8601String(),
            'segment' => is_array($this->segment) ? $this->segment : [],
            'template' => $this->whenLoaded('template', fn () => $this->template?->public_id, $this->template_id ? (string) $this->template_id : ''),
        ];
    }
}
