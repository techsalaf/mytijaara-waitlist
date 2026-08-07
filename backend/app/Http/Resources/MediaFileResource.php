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
            // Regenerate URL from the stored path at request-time so it is
            // always correct regardless of what APP_URL was when the row was
            // inserted. Seeded rows have an empty path and a direct URL (CDN /
            // picsum seed) so we keep those as-is.
            'url' => $this->path
                ? \Illuminate\Support\Facades\Storage::disk($this->disk ?: 'public')->url($this->path)
                : $this->url,
            'alt' => $this->alt,
        ];
    }
}
