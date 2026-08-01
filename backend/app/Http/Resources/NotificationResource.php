<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Maps AdminNotification -> frontend Notification. */
class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'title' => $this->title,
            'body' => (string) ($this->body ?? ''),
            'type' => $this->type ?? 'info',
            'time' => optional($this->created_at)->diffForHumans() ?? '',
            'unread' => ! (bool) $this->read,
        ];
    }
}
