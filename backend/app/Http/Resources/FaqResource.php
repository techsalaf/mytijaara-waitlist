<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Maps Faq -> frontend Faq. */
class FaqResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'question' => $this->question,
            'answer' => $this->answer,
            'order' => (int) $this->order,
            'published' => (bool) $this->published,
        ];
    }
}
