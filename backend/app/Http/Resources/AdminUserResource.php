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
        $roleSlug = $this->roles->first()?->name ?? 'support';

        return [
            'id' => 'u_'.$this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => RoleMeta::label($roleSlug),
            'status' => $this->status ?? 'active',
            'lastActive' => $this->last_active_at ? $this->last_active_at->diffForHumans() : '—',
            'avatar' => RoleMeta::initials($this->name),
        ];
    }
}
