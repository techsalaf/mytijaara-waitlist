<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Permission groups mirror src/lib/mock-data.ts `permissionGroups`.
     * Total = 42, which matches the "Super Admin — 42 permissions" mock.
     */
    public const GROUPS = [
        'waitlist' => ['view', 'create', 'edit', 'delete', 'export', 'bulk-actions'],
        'referrals' => ['view', 'manage', 'adjust-points', 'export'],
        'cms' => ['view', 'edit-hero', 'edit-features', 'edit-testimonials', 'edit-faqs', 'edit-footer', 'publish'],
        'media' => ['view', 'upload', 'delete', 'manage-folders'],
        'email' => ['view', 'create', 'send', 'schedule', 'delete', 'manage-templates'],
        'analytics' => ['view', 'export'],
        'users' => ['view', 'invite', 'edit', 'delete'],
        'roles' => ['view', 'create', 'edit', 'delete', 'assign'],
        'settings' => ['view', 'edit-general', 'edit-integrations', 'edit-api-keys'],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $all = [];
        foreach (self::GROUPS as $group => $items) {
            foreach ($items as $item) {
                $name = "{$group}.{$item}";
                Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
                $all[] = $name;
            }
        }

        // Role => permission set. Counts match the mock `roles` array.
        $superAdmin = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions($all); // 42

        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions(array_values(array_filter($all, fn ($p) => ! in_array($p, [
            'settings.edit-api-keys', 'roles.delete', 'roles.create',
            'users.delete', 'referrals.adjust-points',
            'settings.edit-integrations', 'media.manage-folders',
            'email.delete', 'waitlist.delete', 'cms.publish',
        ], true)))); // 32

        $marketing = Role::firstOrCreate(['name' => 'marketing', 'guard_name' => 'web']);
        $marketing->syncPermissions([
            'waitlist.view', 'waitlist.export',
            'referrals.view', 'referrals.manage', 'referrals.adjust-points', 'referrals.export',
            'email.view', 'email.create', 'email.send', 'email.schedule', 'email.delete', 'email.manage-templates',
            'analytics.view', 'analytics.export',
            'cms.view', 'cms.edit-testimonials',
            'media.view', 'media.upload',
        ]); // 18

        $contentEditor = Role::firstOrCreate(['name' => 'content_editor', 'guard_name' => 'web']);
        $contentEditor->syncPermissions([
            'cms.view', 'cms.edit-hero', 'cms.edit-features', 'cms.edit-testimonials',
            'cms.edit-faqs', 'cms.edit-footer', 'cms.publish',
            'media.view', 'media.upload', 'media.delete', 'media.manage-folders',
            'analytics.view',
        ]); // 12

        $analyst = Role::firstOrCreate(['name' => 'analyst', 'guard_name' => 'web']);
        $analyst->syncPermissions([
            'analytics.view', 'analytics.export',
            'waitlist.view', 'referrals.view', 'email.view', 'cms.view', 'media.view', 'users.view',
        ]); // 8

        $support = Role::firstOrCreate(['name' => 'support', 'guard_name' => 'web']);
        $support->syncPermissions([
            'users.view', 'waitlist.view', 'waitlist.edit', 'referrals.view', 'analytics.view', 'media.view',
        ]); // 6
    }
}
