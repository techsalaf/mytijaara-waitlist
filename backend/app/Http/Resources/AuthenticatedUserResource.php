<?php

namespace App\Http\Resources;

use App\Support\RoleMeta;
use App\Support\TwoFactor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The signed-in admin, as `/auth/me` returns them.
 *
 * Wider than AdminUserResource on purpose: the sidebar gates on `permissions`,
 * the Profile tab edits the personal fields, and the Security and 2FA tabs need
 * to know whether a second factor is actually confirmed. None of that belongs on
 * the list resource used by `/users`.
 */
class AuthenticatedUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $role = $this->roles->first();
        $roleSlug = $role?->name ?? 'support';

        return [
            'id' => 'u_'.$this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $role?->label ?: RoleMeta::label($roleSlug),
            'roleSlug' => $roleSlug,
            'permissions' => $this->getAllPermissions()->pluck('name')->values()->all(),
            'status' => $this->status ?? 'active',
            'lastActive' => $this->last_active_at ? $this->last_active_at->diffForHumans() : '—',
            'avatar' => RoleMeta::initials($this->name),
            'phone' => $this->phone,
            'timezone' => $this->timezone,
            'location' => $this->location,
            'bio' => $this->bio,
            'avatarUrl' => $this->avatar_url,
            'preferences' => $this->resolvedPreferences(),
            'twoFactorEnabled' => $this->hasTwoFactorEnabled(),
            // A pending enrolment has a secret but no confirmation; the 2FA tab
            // uses this to offer "finish setup" instead of "start setup".
            'twoFactorPending' => $this->two_factor_secret !== null && $this->two_factor_confirmed_at === null,
            'recoveryCodesRemaining' => TwoFactor::remainingRecoveryCodes($this->resource),
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
