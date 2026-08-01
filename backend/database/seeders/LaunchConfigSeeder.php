<?php

namespace Database\Seeders;

use App\Models\LaunchConfig;
use Illuminate\Database\Seeder;

class LaunchConfigSeeder extends Seeder
{
    /** Mirrors DEFAULT_LAUNCH_CONFIG in src/lib/launch/config.ts exactly. */
    public function run(): void
    {
        LaunchConfig::query()->delete();

        LaunchConfig::create([
            'data' => [
                'launchEnabled' => true,
                'countdownEnabled' => true,
                'waitlistEnabled' => true,
                'launchDateTime' => '2026-11-15T10:00:00+01:00',
                'timezone' => 'Africa/Lagos',
                'badge' => '🚀 Launching soon',
                'launchTitle' => 'MyTijaara launches in…',
                'launchSubtitle' => 'Thousands of Nigerians are already on the waitlist. Join them before launch and be among the first to experience one app for food, shopping, deliveries, and trusted services.',
                'primaryCTA' => ['label' => 'Join the Waitlist', 'href' => '#waitlist'],
                'secondaryCTA' => ['label' => 'Learn More', 'href' => '#services'],
                'launchStatus' => 'auto',
                'live' => [
                    'badge' => "🎉 We're live",
                    'title' => 'MyTijaara is here.',
                    'subtitle' => 'One app for food, shopping, deliveries and trusted services. Download MyTijaara and get your first order moving.',
                    'confetti' => true,
                    'stores' => [
                        ['platform' => 'android', 'label' => 'Google Play', 'sublabel' => 'Get it on', 'href' => 'https://play.google.com/store'],
                        ['platform' => 'ios', 'label' => 'App Store', 'sublabel' => 'Download on the', 'href' => '#', 'comingSoon' => true],
                    ],
                ],
            ],
        ]);
    }
}
