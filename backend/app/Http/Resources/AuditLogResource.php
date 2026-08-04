<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Maps AuditLog -> frontend ActivityLogEntry. */
class AuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'user' => $this->actor ?? ($this->user?->name ?? 'System'),
            'action' => $this->action,
            'target' => (string) ($this->target ?? ''),
            'time' => optional($this->created_at)->diffForHumans() ?? '',
            'createdAt' => optional($this->created_at)->toIso8601String(),
            'ip' => (string) ($this->ip ?? '—'),
            'device' => (string) ($this->device ?? '—'),
            'changes' => $this->changes ?: null,
        ];
    }
}
