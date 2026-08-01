<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Maps Testimonial -> frontend Testimonial. */
class TestimonialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'name' => $this->name,
            'role' => $this->role,
            'quote' => $this->quote,
            'rating' => (int) $this->rating,
            'published' => (bool) $this->published,
            'avatar' => (string) ($this->avatar ?? ''),
        ];
    }
}
