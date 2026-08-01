<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Support\RoleMeta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /** GET /users — admin panel users. */
    public function index(): JsonResponse
    {
        $users = User::query()->with('roles')->orderBy('name')->get();

        return response()->json(['data' => AdminUserResource::collection($users)]);
    }

    /** GET /users/:id */
    public function show(string $id): JsonResponse
    {
        $user = User::with('roles')->findOrFail($this->pk($id));

        return response()->json(['data' => new AdminUserResource($user)]);
    }

    /** POST /users — invite/create an admin user. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', 'string'],
            'status' => ['nullable', Rule::in(['active', 'invited'])],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password'] ?? str()->random(24)),
            'status' => $data['status'] ?? 'invited',
        ]);
        $user->syncRoles([$this->roleSlug($data['role'])]);

        return response()->json(['data' => new AdminUserResource($user->load('roles'))], 201);
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
        ]);

        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->fill(collect($data)->only(['name', 'email', 'status'])->all());
        $user->save();

        if (isset($data['role'])) {
            $user->syncRoles([$this->roleSlug($data['role'])]);
        }

        return response()->json(['data' => new AdminUserResource($user->fresh('roles'))]);
    }

    /** DELETE /users/:id */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($this->pk($id));

        if ($request->user() && $request->user()->id === $user->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $user->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    /** Strip the `u_` prefix from a public id. */
    private function pk(string $id): int
    {
        return (int) preg_replace('/\D/', '', $id);
    }

    /** Accept a role slug or a display label and return the canonical slug. */
    private function roleSlug(string $role): string
    {
        if (Role::where('name', $role)->exists()) {
            return $role;
        }
        foreach (RoleMeta::LABELS as $slug => $label) {
            if (strcasecmp($label, $role) === 0) {
                return $slug;
            }
        }

        return 'support';
    }
}
