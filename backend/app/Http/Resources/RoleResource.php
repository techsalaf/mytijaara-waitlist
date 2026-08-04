<?php

namespace App\Http\Resources;

use App\Support\RoleMeta;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Maps a spatie Role -> frontend Role.
 *
 * Display copy prefers the columns an admin typed (`label`, `description`,
 * `color`, added by 2026_08_04_090002) and only falls back to `RoleMeta` for the
 * seeded roles, which have no stored copy.
 */
class RoleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => 'r_'.$this->id,
            'name' => $this->label ?: RoleMeta::label($this->name),
            'slug' => $this->name,
            'description' => $this->description ?? RoleMeta::description($this->name),
            'users' => $this->users_count ?? $this->users()->count(),
            'permissions' => $this->permissions_count ?? $this->permissions()->count(),
            'color' => $this->color ?: RoleMeta::color($this->name),
            'builtIn' => array_key_exists($this->name, RoleMeta::LABELS),
        ];
    }
}
