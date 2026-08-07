<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoleResource;
use App\Support\Audit;
use App\Support\RoleMeta;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /** GET /roles — all roles with user + permission counts. */
    public function index(): JsonResponse
    {
        // withCount('users') calls Role::users() which does a guard→model lookup via
        // config('auth.guards.<guard>.provider'). In HTTP context the sanctum guard has
        // provider:null, so the lookup returns null and Laravel throws. Bypass the
        // polymorphic relationship entirely and count model_has_roles directly.
        $roles = Role::query()
            ->withCount('permissions')
            ->addSelect([
                'users_count' => DB::table('model_has_roles')
                    ->selectRaw('count(*)')
                    ->whereColumn('role_id', 'roles.id'),
            ])
            ->orderBy('id')
            ->get();

        return response()->json(['data' => RoleResource::collection($roles)]);
    }

    /** GET /roles/:id — a role plus the permissions it holds. */
    public function show(string $id): JsonResponse
    {
        $role = Role::with('permissions')->findOrFail($this->pk($id));
        $role->loadCount('permissions');
        $role->users_count = (int) DB::table('model_has_roles')
            ->where('role_id', $role->id)
            ->count();

        return response()->json(['data' => array_merge(
            (new RoleResource($role))->toArray(request()),
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

    /**
     * POST /roles
     *
     * `name` is the display copy an admin typed; it is stored in `label` and the
     * slug derived from it becomes the spatie role name the `permission:`
     * middleware checks. Keeping them separate means renaming a role never
     * breaks a route gate.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'color' => ['nullable', 'string', 'max:32'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string'],
        ]);

        $slug = $data['slug'] ?? Str::slug($data['name'], '_');
        $role = Role::firstOrCreate(['name' => $slug, 'guard_name' => 'web']);
        $role->forceFill([
            'label' => $data['name'],
            'description' => $data['description'] ?? null,
            'color' => $data['color'] ?? null,
        ])->save();
        $role->syncPermissions($this->validPermissions($data['permissions'] ?? []));

        Audit::record($request, 'role.created', $data['name'], [
            'slug' => $slug,
            'permissions' => count($data['permissions'] ?? []),
        ], Role::class, (string) $role->id);

        $role->loadCount('permissions');
        $role->users_count = (int) DB::table('model_has_roles')->where('role_id', $role->id)->count();

        return response()->json(['data' => new RoleResource($role)], 201);
    }

    /**
     * PATCH /roles/:id — display copy and/or the granted permission set.
     *
     * The slug (`roles.name`) is deliberately immutable: it is what the
     * `permission:` middleware and every `hasRole()` check reference.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $role = Role::findOrFail($this->pk($id));

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'color' => ['sometimes', 'nullable', 'string', 'max:32'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string'],
        ]);

        $changes = [];

        foreach (['name' => 'label', 'description' => 'description', 'color' => 'color'] as $field => $column) {
            if (array_key_exists($field, $data)) {
                $changes[$field] = $data[$field];
                $role->forceFill([$column => $data[$field]]);
            }
        }
        $role->save();

        if (isset($data['permissions'])) {
            $role->syncPermissions($this->validPermissions($data['permissions']));
            $changes['permissions'] = count($data['permissions']);
        }

        Audit::record($request, 'role.updated', $role->label ?: $role->name, $changes, Role::class, (string) $role->id);

        $role->loadCount('permissions');
        $role->users_count = (int) DB::table('model_has_roles')->where('role_id', $role->id)->count();

        return response()->json(['data' => new RoleResource($role)]);
    }

    /** DELETE /roles/:id — refuses to delete the seeded base roles. */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $role = Role::findOrFail($this->pk($id));

        if (array_key_exists($role->name, RoleMeta::LABELS)) {
            return response()->json(['message' => 'Built-in roles cannot be deleted.'], 422);
        }

        $label = $role->label ?: $role->name;
        $roleId = (string) $role->id;
        $role->delete();

        Audit::record($request, 'role.deleted', $label, ['slug' => $role->name], Role::class, $roleId);

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
