<?php

use App\Models\EmailCampaign;
use App\Models\EmailEvent;
use Database\Seeders\EmailSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Clean up mock/seeded campaigns and update email templates with pristine production HTML.
     */
    public function up(): void
    {
        // Remove fake seeded campaigns and their events
        $mockPublicIds = ['cmp_001', 'cmp_002', 'cmp_003', 'cmp_004', 'cmp_005'];
        $mockCampaignIds = EmailCampaign::withTrashed()
            ->whereIn('public_id', $mockPublicIds)
            ->pluck('id');

        if ($mockCampaignIds->isNotEmpty()) {
            EmailEvent::whereIn('campaign_id', $mockCampaignIds)->delete();
            EmailCampaign::withTrashed()->whereIn('id', $mockCampaignIds)->forceDelete();
        }

        // Remove any legacy mock campaigns by name if created by seeders
        $legacyNames = [
            'Vendor Onboarding Series',
            'Product Update — August',
            'Referral Bonus Reminder',
            'Welcome to MyTijaara',
            'Product Update Series',
        ];
        $legacyIds = EmailCampaign::withTrashed()
            ->whereIn('name', $legacyNames)
            ->where('created_by', null)
            ->pluck('id');

        if ($legacyIds->isNotEmpty()) {
            EmailEvent::whereIn('campaign_id', $legacyIds)->delete();
            EmailCampaign::withTrashed()->whereIn('id', $legacyIds)->forceDelete();
        }

        // Re-seed all 6 email templates with clean, production-ready HTML
        (new EmailSeeder())->run();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
