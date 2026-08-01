<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            AdminUserSeeder::class,
            LaunchConfigSeeder::class,
            SettingsSeeder::class,
            CmsSectionSeeder::class,
            ContentSeeder::class,
            EmailSeeder::class,
            MediaSeeder::class,
            WaitlistSeeder::class,
        ]);
    }
}
