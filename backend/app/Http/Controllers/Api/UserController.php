<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Mail\AdminInviteMail;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\Audit;
use App\Support\RoleMeta;
use App\Support\SmtpConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * GET /users — admin panel users.
     *
     * Search, role, status and join-date filters run in SQL so the page count
     * and the on-screen rows always agree; filtering client-side made the
     * pagination meta describe a different set than the table showed.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'max:32'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = User::query()->with('roles');

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $role = $request->string('role')->trim()->value();
        if ($role && $role !== 'all') {
            // The UI sends the display label; roles are stored by slug.
            $slug = $this->roleSlug($role, null);
            $query->whereHas('roles', fn ($q) => $q->where('name', $slug ?? $role));
        }

        $status = $request->string('status')->trim()->value();
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($from = $request->input('from')) {
            $query->where('created_at', '>=', date('Y-m-d 00:00:00', strtotime($from)));
        }
        if ($to = $request->input('to')) {
            $query->where('created_at', '<=', date('Y-m-d 23:59:59', strtotime($to)));
        }

        $perPage = min(200, max(1, (int) $request->input('per_page', 50)));
        $page = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'data' => AdminUserResource::collection($page->items()),
            'meta' => [
                'total' => $page->total(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
            ],
        ]);
    }

    /**
     * GET /users/:id — the list shape plus the access and activity facts the
     * detail page shows. `recentActivity` reads real audit rows, so a brand new
     * account correctly shows an empty timeline instead of invented history.
     */
    public function show(string $id): JsonResponse
    {
        $user = User::with('roles.permissions')->findOrFail($this->pk($id));
        $role = $user->roles->first();

        $activity = AuditLog::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn (AuditLog $row) => [
                'id' => (int) $row->id,
                'action' => (string) $row->action,
                'target' => (string) ($row->target ?? ''),
                'time' => optional($row->created_at)->diffForHumans() ?? '',
                'ip' => (string) ($row->ip ?? '—'),
            ])
            ->all();

        return response()->json(['data' => array_merge(
            (new AdminUserResource($user))->toArray(request()),
            [
                'roleSlug' => $role?->name ?? '',
                'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
                'createdAt' => optional($user->created_at)->toIso8601String(),
                'lastActiveAt' => optional($user->last_active_at)->toIso8601String(),
                'emailVerified' => $user->email_verified_at !== null,
                'phone' => $user->phone,
                'timezone' => $user->timezone,
                'avatarUrl' => $user->avatar_url,
                'recentActivity' => $activity,
            ],
        )]);
    }

    /**
     * POST /users — invite/create an admin user.
     *
     * With `invite: true` (the default for `invited` status) the account is
     * created with a random password and a real password-reset mail goes out, so
     * "Invite member" cannot succeed on screen while sending nothing.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', 'string'],
            'status' => ['nullable', Rule::in(['active', 'invited'])],
            'password' => ['nullable', 'string', 'min:8'],
            'invite' => ['nullable', 'boolean'],
        ]);

        $status = $data['status'] ?? 'invited';
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password'] ?? str()->random(32)),
            'status' => $status,
        ]);
        $user->syncRoles([$this->roleSlug($data['role'], 'support')]);

        $invite = $data['invite'] ?? ($status === 'invited');
        $sent = false;
        $inviteMessage = 'Invitation email not requested.';
        if ($invite) {
            [$sent, $inviteMessage] = $this->sendInvite($user);
        }

        Audit::record($request, 'user.created', $user->email, [
            'role' => $data['role'],
            'status' => $status,
            'invited' => $sent,
        ], User::class, (string) $user->id);

        return response()->json([
            'data' => new AdminUserResource($user->load('roles')),
            'meta' => ['invited' => $sent, 'message' => $inviteMessage],
        ], 201);
    }

    /** POST /users/:id/invite — re-send the invitation mail. */
    public function invite(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($this->pk($id));
        [$sent, $message] = $this->sendInvite($user);

        Audit::record($request, 'user.invited', $user->email, ['sent' => $sent], User::class, (string) $user->id);

        return response()->json(['data' => ['sent' => $sent, 'message' => $message]], $sent ? 200 : 422);
    }

    /** PATCH /users/:id */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($this->pk($id));

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['sometimes', 'string'],
            'status' => ['sometimes', Rule::in(['active', 'invited'])],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
        ]);

        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->fill(collect($data)->only(['name', 'email', 'status', 'phone'])->all());
        $user->save();

        if (isset($data['role'])) {
            $user->syncRoles([$this->roleSlug($data['role'], 'support')]);
        }

        Audit::record($request, 'user.updated', $user->email, collect($data)->except('password')->all(), User::class, (string) $user->id);

        return response()->json(['data' => new AdminUserResource($user->fresh('roles'))]);
    }

    /** DELETE /users/:id */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($this->pk($id));

        if ($request->user() && $request->user()->id === $user->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $email = $user->email;
        $user->delete();

        Audit::record($request, 'user.deleted', $email, [], User::class, (string) $user->id);

        return response()->json(['data' => ['deleted' => true]]);
    }

    /**
     * Send the invitation mail carrying a real password-reset token.
     *
     * @return array{0:bool,1:string}
     */
    private function sendInvite(User $user): array
    {
        SmtpConfig::apply();

        try {
            $token = Password::broker()->createToken($user);
            Mail::to($user->email)->send(new AdminInviteMail($user, $token));

            return [true, "Invitation sent to {$user->email}."];
        } catch (\Throwable $e) {
            Log::warning('admin invite failed', ['email' => $user->email, 'error' => $e->getMessage()]);

            return [false, 'Could not send the invitation: '.$e->getMessage()];
        }
    }

    /** Strip the `u_` prefix from a public id. */
    private function pk(string $id): int
    {
        return (int) preg_replace('/\D/', '', $id);
    }

    /** Accept a role slug or a display label and return the canonical slug. */
    private function roleSlug(string $role, ?string $fallback): ?string
    {
        if (Role::where('name', $role)->exists()) {
            return $role;
        }
        foreach (RoleMeta::LABELS as $slug => $label) {
            if (strcasecmp($label, $role) === 0) {
                return $slug;
            }
        }
        // Custom roles store their display copy in `roles.label`.
        $byLabel = Role::where('label', $role)->first();
        if ($byLabel) {
            return $byLabel->name;
        }

        return $fallback;
    }
}
