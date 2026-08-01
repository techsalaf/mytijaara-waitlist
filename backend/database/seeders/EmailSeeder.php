<?php

namespace Database\Seeders;

use App\Models\EmailCampaign;
use App\Models\EmailTemplate;
use Illuminate\Database\Seeder;

class EmailSeeder extends Seeder
{
    /** Templates + campaigns mirror src/lib/mock-data.ts. */
    public function run(): void
    {
        $templates = [
            ['public_id' => 'tpl_1', 'name' => 'Welcome Email', 'category' => 'onboarding', 'thumbnail' => 'welcome', 'subject' => "You're on the list!"],
            ['public_id' => 'tpl_2', 'name' => 'Referral Bonus', 'category' => 'engagement', 'thumbnail' => 'referral', 'subject' => 'Earn ₦500 for every friend'],
            ['public_id' => 'tpl_3', 'name' => 'Early Access', 'category' => 'launch', 'thumbnail' => 'invite', 'subject' => "You're first in line"],
            ['public_id' => 'tpl_4', 'name' => 'Vendor Onboarding', 'category' => 'onboarding', 'thumbnail' => 'vendor', 'subject' => 'Grow your business with MyTijaara'],
            ['public_id' => 'tpl_5', 'name' => 'Product Update', 'category' => 'newsletter', 'thumbnail' => 'update', 'subject' => "What's new this month"],
            ['public_id' => 'tpl_6', 'name' => 'Password Reset', 'category' => 'transactional', 'thumbnail' => 'reset', 'subject' => 'Reset your password'],
        ];
        foreach ($templates as $t) {
            EmailTemplate::firstOrCreate(['public_id' => $t['public_id']], array_merge($t, [
                'html' => '<p>'.$t['name'].' body</p>',
                'text' => $t['name'].' body',
            ]));
        }

        $campaigns = [
            ['public_id' => 'cmp_001', 'name' => 'Welcome to MyTijaara', 'status' => 'sent', 'subject' => "You're on the list! Here's what's next 🎉", 'sent' => 1847, 'recipients' => 1847, 'opens' => 890, 'clicks' => 234, 'sent_at' => '2026-07-18', 'template' => 'tpl_1'],
            ['public_id' => 'cmp_002', 'name' => 'Early Access Invite — Lagos', 'status' => 'sent', 'subject' => "Lagos, you're first. Try MyTijaara today.", 'sent' => 892, 'recipients' => 892, 'opens' => 512, 'clicks' => 187, 'sent_at' => '2026-07-14', 'template' => 'tpl_3'],
            ['public_id' => 'cmp_003', 'name' => 'Referral Bonus Reminder', 'status' => 'scheduled', 'subject' => '3 friends away from your ₦5,000 bonus', 'sent' => 0, 'recipients' => 0, 'opens' => 0, 'clicks' => 0, 'scheduled_at' => '2026-07-26', 'template' => 'tpl_2'],
            ['public_id' => 'cmp_004', 'name' => 'Product Update — August', 'status' => 'draft', 'subject' => 'New: Book artisans in seconds', 'sent' => 0, 'recipients' => 0, 'opens' => 0, 'clicks' => 0, 'template' => 'tpl_5'],
            ['public_id' => 'cmp_005', 'name' => 'Vendor Onboarding Series', 'status' => 'sent', 'subject' => 'Grow your business with MyTijaara', 'sent' => 342, 'recipients' => 342, 'opens' => 198, 'clicks' => 76, 'sent_at' => '2026-07-10', 'template' => 'tpl_4'],
        ];
        foreach ($campaigns as $c) {
            $templateId = EmailTemplate::where('public_id', $c['template'])->value('id');
            EmailCampaign::firstOrCreate(['public_id' => $c['public_id']], [
                'name' => $c['name'],
                'subject' => $c['subject'],
                'html' => '<p>'.$c['name'].'</p>',
                'status' => $c['status'],
                'template_id' => $templateId,
                'recipients' => $c['recipients'],
                'sent' => $c['sent'],
                'opens' => $c['opens'],
                'clicks' => $c['clicks'],
                'bounces' => 0,
                'scheduled_at' => $c['scheduled_at'] ?? null,
                'sent_at' => $c['sent_at'] ?? null,
            ]);
        }
    }
}
