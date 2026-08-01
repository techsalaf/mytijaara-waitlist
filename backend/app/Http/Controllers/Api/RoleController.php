<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoleResource;
use App\Support\RoleMeta;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /** GET /roles — all roles with user + permission counts. */
    public function index(): JsonResponse
    {
        $roles = Role::query()->withCount(['users', 'permissions'])->orderBy('id')->get();

        return response()->json(['data' => RoleResource::collection($roles)]);
    }

    /** GET /roles/:id — a role plus the permissions it holds. */
    public function show(string $id): JsonResponse
    {
        $role = Role::with('permissions')->findOrFail($this->pk($id));

        return response()->json(['data' => array_merge(
            (new RoleResource($role->loadCount(['users', 'permissions'])))->toArray(request()),
            ['grantedPermissions' => $role->permissions->pluck('name')->all()]
        )]);
    }

    /** GET /permissions — the grouped permission catalogue for the RBAC matrix. */
    public function permissionGroups(): JsonResponse
    {
        $groups = [];
        foreach (RoleSeeder::GROUPS as $group => $items) {
            $groups[] = [
                'group' => $group,
                'label' => Str::title(str_replace('_', ' ', $group)),
                'permissions' => array_map(fn ($item) => [
                    'key' => "{$group}.{$item}",
                    'label' => Str::title(str_replace('-', ' ', $item)),
                ], $items),
            ];
        }

        return response()->json(['data' => $groups]);
    }

    /** POST /roles */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:120'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
        ]);

        $slug = $data['slug'] ?? Str::slug($data['name'], '_');
        $role = Role::firstOrCreate(['name' => $slug, 'guard_name' => 'web']);
        $role->syncPermissions($this->validPermissions($data['permissions'] ?? []));

        return response()->json(['data' => new RoleResource($role->loadCount(['users', 'permissions']))], 201);
    }

    /** PATCH /roles/:id — update the granted permission set. */
    public function update(Request $request, string $id): JsonResponse
    {
        $role = Role::findOrFail($this->pk($id));

        $data = $request->validate([
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string'],
        ]);

        if (isset($data['permissions'])) {
            $role->syncPermissions($this->validPermissions($data['permissions']));
        }

        return response()->json(['data' => new RoleResource($role->loadCount(['users', 'permissions']))]);
    }

    /** DELETE /roles/:id — refuses to delete the seeded base roles. */
    public function destroy(string $id): JsonResponse
    {
        $role = Role::findOrFail($this->pk($id));

        if (array_key_exists($role->name, RoleMeta::LABELS)) {
            return response()->json(['message' => 'Built-in roles cannot be deleted.'], 422);
        }

        $role->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    private function validPermissions(array $names): array
    {
        return Permission::whereIn('name', $names)->pluck('name')->all();
    }

    private function pk(string $id): int
    {
        return (int) preg_replace('/\D/', '', $id);
    }
}
