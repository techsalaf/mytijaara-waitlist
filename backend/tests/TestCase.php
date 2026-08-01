<?php

namespace Tests;

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

abstract class TestCase extends BaseTestCase
{
    /** Base path for the versioned API (matches bootstrap/app.php apiPrefix). */
    protected string $api = '/api/v1';

    private bool $rolesSeeded = false;

    /** Seed the full role + permission catalogue once per test. */
    protected function seedRoles(): void
    {
        if ($this->rolesSeeded) {
            return;
        }

        $this->seed(RoleSeeder::class);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->rolesSeeded = true;
    }

    /**
     * Create an admin user, assign a seeded spatie role, and authenticate as
     * them through Sanctum. Returns the user for further assertions.
     */
    protected function actingAsRole(string $slug, array $attributes = []): User
    {
        $this->seedRoles();

        $user = User::factory()->create($attributes + ['status' => 'active']);
        $user->assignRole($slug);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        Sanctum::actingAs($user);

        return $user;
    }

    /**
     * Create an authenticated user that holds NO permissions. Any `permission:`
     * gate will reject them with 403, which is exactly what the RBAC negative
     * tests need.
     */
    protected function actingAsPermissionless(array $attributes = []): User
    {
        $this->seedRoles();

        Role::firstOrCreate(['name' => 'test_nobody', 'guard_name' => 'web']);

        $user = User::factory()->create($attributes + ['status' => 'active']);
        $user->assignRole('test_nobody');
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        Sanctum::actingAs($user);

        return $user;
    }
}
