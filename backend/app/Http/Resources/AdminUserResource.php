<?php

namespace App\Http\Resources;

use App\Support\RoleMeta;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Maps User -> frontend AdminUser. */
class AdminUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $role = $this->roles->first();
        $roleSlug = $role?->name ?? 'support';

        return [
            'id' => 'u_'.$this->id,
            'name' => $this->name,
            'email' => $this->email,
            // Custom roles carry their own copy in `roles.label`; only the seeded
            // roles fall back to the RoleMeta constants.
            'role' => $role?->label ?: RoleMeta::label($roleSlug),
            'status' => $this->status ?? 'active',
            'lastActive' => $this->last_active_at ? $this->last_active_at->diffForHumans() : '—',
            'avatar' => RoleMeta::initials($this->name),
        ];
    }
}
