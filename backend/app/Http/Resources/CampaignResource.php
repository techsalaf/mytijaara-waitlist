<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Maps EmailCampaign -> frontend Campaign. */
class CampaignResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'status' => $this->status,
            'subject' => (string) ($this->subject ?? ''),
            'sent' => (int) $this->sent,
            'opens' => (int) $this->opens,
            'clicks' => (int) $this->clicks,
            'sentAt' => $this->sent_at ? $this->sent_at->toDateString() : '',
            'template' => $this->whenLoaded('template', fn () => $this->template?->public_id, $this->template_id ? (string) $this->template_id : ''),
        ];
    }
}
