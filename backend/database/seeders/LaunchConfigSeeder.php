<?php

namespace Database\Seeders;

use App\Models\LaunchConfig;
use Illuminate\Database\Seeder;

class LaunchConfigSeeder extends Seeder
{
    /**
     * Mirrors DEFAULT_LAUNCH_CONFIG in src/lib/launch/config.ts exactly.
     *
     * This drifted once already: the seeder still carried the retired November
     * launch date and had no `launchCelebrationDays` or `ticker` keys at all, so
     * a freshly seeded database served a config the frontend had to fill in from
     * its own defaults. src/lib/launch/config.test.ts now parses this file and
     * fails if the two ever disagree again.
     */
    public function run(): void
    {
        LaunchConfig::query()->delete();

        LaunchConfig::create([
            'data' => [
                'launchEnabled' => true,
                'countdownEnabled' => true,
                'waitlistEnabled' => true,
                'launchDateTime' => '2026-10-02T10:00:00+01:00',
                'timezone' => 'Africa/Lagos',
                'launchCelebrationDays' => 3,
                'badge' => '🚀 Launching soon',
                'launchTitle' => 'MyTijaara launches in…',
                'launchSubtitle' => 'Thousands of Nigerians are already on the waitlist. Join them before launch and be among the first to experience one app for food, shopping, deliveries, and trusted services.',
                'primaryCTA' => ['label' => 'Join the Waitlist', 'href' => '#waitlist'],
                'secondaryCTA' => ['label' => 'Learn More', 'href' => '#services'],
                'launchStatus' => 'auto',
                'ticker' => [
                    'enabled' => true,
                    'text' => '{days} to go until MyTijaara opens across Nigeria',
                    'liveText' => 'MyTijaara is live — download the app and place your first order',
                    'href' => '#waitlist',
                    'confetti' => true,
                ],
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
