<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /** Mirrors src/lib/mock-data.ts `adminUsers`, mapped to spatie role slugs. */
    public const USERS = [
        ['name' => 'Adaeze Okafor', 'email' => 'adaeze@mytijaara.com', 'role' => 'super_admin', 'status' => 'active'],
        ['name' => 'Chidi Nwosu', 'email' => 'chidi@mytijaara.com', 'role' => 'admin', 'status' => 'active'],
        ['name' => 'Fatima Ibrahim', 'email' => 'fatima@mytijaara.com', 'role' => 'marketing', 'status' => 'active'],
        ['name' => 'Emeka Obi', 'email' => 'emeka@mytijaara.com', 'role' => 'content_editor', 'status' => 'active'],
        ['name' => 'Ngozi Adeyemi', 'email' => 'ngozi@mytijaara.com', 'role' => 'analyst', 'status' => 'active'],
        ['name' => 'Yusuf Bello', 'email' => 'yusuf@mytijaara.com', 'role' => 'support', 'status' => 'invited'],
    ];

    public function run(): void
    {
        foreach (self::USERS as $u) {
            $user = User::firstOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => Hash::make('password'),
                    'status' => $u['status'],
                    'email_verified_at' => now(),
                    'last_active_at' => now(),
                ],
            );

            if (! $user->hasRole($u['role'])) {
                $user->syncRoles([$u['role']]);
            }
        }
    }
}
