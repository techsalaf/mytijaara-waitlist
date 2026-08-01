<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Maps WaitlistEntry -> frontend WaitlistUser (src/lib/types/index.ts). */
class WaitlistEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => (string) ($this->phone ?? ''),
            'city' => (string) ($this->city ?? ''),
            'state' => (string) ($this->state ?? ''),
            'status' => $this->status,
            'verified' => (bool) $this->verified,
            'referrals' => (int) $this->referrals,
            'referredBy' => $this->whenLoaded('referredBy', fn () => $this->referredBy?->public_id),
            'source' => $this->source,
            'device' => $this->device,
            'tags' => $this->tags ?? [],
            'notes' => $this->notes,
            'joinedAt' => optional($this->created_at)->toIso8601String(),
            'lastActive' => optional($this->last_active_at ?? $this->created_at)->toIso8601String(),
            'position' => (int) $this->position,
        ];
    }
}
