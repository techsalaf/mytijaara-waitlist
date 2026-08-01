<?php

namespace App\Http\Resources;

use App\Support\RoleMeta;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Maps a spatie Role -> frontend Role. */
class RoleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => 'r_'.$this->id,
            'name' => RoleMeta::label($this->name),
            'slug' => $this->name,
            'description' => RoleMeta::description($this->name),
            'users' => $this->users_count ?? $this->users()->count(),
            'permissions' => $this->permissions_count ?? $this->permissions()->count(),
            'color' => RoleMeta::color($this->name),
        ];
    }
}
