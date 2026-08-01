<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Maps EmailTemplate -> frontend EmailTemplate. */
class EmailTemplateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'category' => (string) ($this->category ?? ''),
            'updatedAt' => optional($this->updated_at)->toDateString(),
            'thumbnail' => (string) ($this->thumbnail ?? ''),
            // Extra fields the editor uses; harmless to the list view.
            'subject' => $this->subject,
            'html' => $this->html,
            'text' => $this->text,
        ];
    }
}
