<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    /** 8 settings groups from docs/API_CONTRACT.md §12. */
    public const GROUPS = [
        'company' => [
            'name' => 'MyTijaara',
            'legalName' => 'MyTijaara Technologies Ltd',
            'email' => 'hello@mytijaara.com',
            'phone' => '+234 800 000 0000',
            'address' => 'Lagos, Nigeria',
        ],
        'branding' => [
            'primaryColor' => '#004A28',
            'accentColor' => '#D4A017',
            'logo' => '',
            'favicon' => '',
        ],
        'seo' => [
            'title' => 'MyTijaara — One app for food, shopping, deliveries and trusted services',
            'description' => 'Join the MyTijaara waitlist.',
            'keywords' => 'nigeria, super app, food, groceries, pharmacy, artisans',
            'ogImage' => '',
        ],
        'social' => [
            'twitter' => 'https://twitter.com/mytijaara',
            'instagram' => 'https://instagram.com/mytijaara',
            'facebook' => 'https://facebook.com/mytijaara',
            'tiktok' => 'https://tiktok.com/@mytijaara',
        ],
        'smtp' => [
            'host' => '',
            'port' => 587,
            'username' => '',
            'encryption' => 'tls',
            'fromName' => 'MyTijaara',
            'fromEmail' => 'noreply@mytijaara.com',
        ],
        'integrations' => [
            'googleAnalytics' => '',
            'metaPixel' => '',
            'resendApiKey' => '',
        ],
        'api_keys' => [
            'keys' => [],
        ],
        'system' => [
            'maintenanceMode' => false,
            'timezone' => 'Africa/Lagos',
            'dateFormat' => 'd M Y',
        ],
    ];

    public function run(): void
    {
        foreach (self::GROUPS as $group => $data) {
            Setting::firstOrCreate(['group' => $group], ['data' => $data]);
        }
    }
}
