<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Maps MediaFile -> frontend MediaFile. */
class MediaFileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'name' => $this->name,
            'type' => $this->type,
            'size' => (int) $this->size,
            'folder' => (string) ($this->folder ?? 'Uncategorized'),
            'uploadedAt' => optional($this->created_at)->toIso8601String(),
            'dimensions' => (string) ($this->dimensions ?? ''),
            'url' => $this->url,
            'alt' => $this->alt,
        ];
    }
}
