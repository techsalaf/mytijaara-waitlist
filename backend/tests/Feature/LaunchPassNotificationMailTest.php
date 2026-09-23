<?php

namespace Tests\Feature;

use App\Console\Commands\SendLaunchPassAnnouncements;
use App\Mail\CampaignMail;
use App\Mail\LaunchPassNotificationMail;
use App\Mail\WaitlistWelcomeMail;
use App\Models\EmailCampaign;
use App\Models\EmailEvent;
use App\Models\WaitlistEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class LaunchPassNotificationMailTest extends TestCase
{
    use RefreshDatabase;

    private function createEntry(array $attributes = []): WaitlistEntry
    {
        static $counter = 1;
        $idx = $counter++;

        return WaitlistEntry::create(array_merge([
            'public_id' => "wl_test_{$idx}",
            'name' => "User {$idx}",
            'email' => "user{$idx}@example.com",
            'phone' => '0801234567' . ($idx % 10),
            'city' => 'Lagos',
            'role' => 'customer',
            'referral_code' => 'REF' . Str::random(5),
            'status' => 'active',
            'position' => $idx,
            'verified' => true,
            'consent' => true,
        ], $attributes));
    }

    public function test_launch_pass_notification_mail_renders_pass_url_and_event_details(): void
    {
        $entry = $this->createEntry([
            'name' => 'Tunde Bakare',
            'email' => 'tunde@example.com',
            'position' => 14,
            'launch_pass_token' => 'test-token-1234567890',
        ]);

        $mail = new LaunchPassNotificationMail($entry);
        $rendered = $mail->render();

        $this->assertStringContainsString('Tunde', $rendered);
        $this->assertStringContainsString('#14', $rendered);
        $this->assertStringContainsString('/launch-pass/test-token-1234567890', $rendered);
        $this->assertStringContainsString('TAA NATCON 2026', $rendered);
        $this->assertStringContainsString('October 2, 2026', $rendered);
        $this->assertStringContainsString('Claim & Customize Your Launch Pass', $rendered);
    }

    public function test_waitlist_welcome_mail_includes_launch_pass_link_when_token_exists(): void
    {
        $entry = $this->createEntry([
            'name' => 'Fatima Yusuf',
            'email' => 'fatima@example.com',
            'position' => 8,
            'launch_pass_token' => 'welcome-token-xyz',
        ]);

        $mail = new WaitlistWelcomeMail($entry);
        $rendered = $mail->render();

        $this->assertStringContainsString('/launch-pass/welcome-token-xyz', $rendered);
        $this->assertStringContainsString('View Your Launch Pass', $rendered);
    }

    public function test_campaign_mail_substitutes_launch_pass_url_tokens(): void
    {
        $entry = $this->createEntry([
            'name' => 'Emeka Obi',
            'email' => 'emeka@example.com',
            'launch_pass_token' => 'campaign-token-abc',
        ]);

        $campaign = EmailCampaign::create([
            'public_id' => 'cmp_test01',
            'name' => 'Launch Pass Push',
            'subject' => 'Your pass is here',
            'html' => '<p>Hello {{firstName}}, grab your pass here: <a href="{{launchPassUrl}}">Launch Pass</a></p>',
            'status' => 'draft',
        ]);

        $mail = new CampaignMail($campaign, $entry);
        $rendered = $mail->render();

        $this->assertStringContainsString(urlencode('/launch-pass/campaign-token-abc'), $rendered);
    }

    public function test_send_launch_pass_announcement_command_dry_run(): void
    {
        Mail::fake();

        $this->createEntry(['launch_pass_token' => null]);
        $this->createEntry(['launch_pass_token' => null]);
        $this->createEntry(['launch_pass_token' => null]);

        $exitCode = Artisan::call('waitlist:send-launch-pass-announcement', ['--dry-run' => true]);
        $output = Artisan::output();

        $this->assertSame(0, $exitCode);
        $this->assertStringContainsString('[dry run]', $output);
        $this->assertStringContainsString('3 sent, 0 failed, 0 skipped, 3 due at start', $output);

        Mail::assertNothingSent();
        $this->assertSame(0, EmailEvent::where('type', 'launch_pass_announcement')->count());
    }

    public function test_send_launch_pass_announcement_command_delivers_and_prevents_duplicates(): void
    {
        Mail::fake();

        $entry1 = $this->createEntry([
            'email' => 'user1@example.com',
            'position' => 1,
            'launch_pass_token' => null,
        ]);

        $entry2 = $this->createEntry([
            'email' => 'user2@example.com',
            'position' => 2,
            'launch_pass_token' => 'existing-token-2',
        ]);

        // First run sends to both
        $exitCode = Artisan::call('waitlist:send-launch-pass-announcement', ['--limit' => 10]);
        $output = Artisan::output();

        $this->assertSame(0, $exitCode);
        $this->assertStringContainsString('2 sent, 0 failed, 0 skipped, 2 due at start', $output);

        Mail::assertSent(LaunchPassNotificationMail::class, 2);
        $this->assertSame(2, EmailEvent::where('type', 'launch_pass_announcement')->count());

        // Verify entry1 token was minted
        $this->assertNotNull($entry1->fresh()->launch_pass_token);

        // Second run finds 0 due because they already received it
        $exitCode2 = Artisan::call('waitlist:send-launch-pass-announcement', ['--limit' => 10]);
        $output2 = Artisan::output();

        $this->assertSame(0, $exitCode2);
        $this->assertStringContainsString('0 sent, 0 failed, 0 skipped, 0 due at start', $output2);
        Mail::assertSent(LaunchPassNotificationMail::class, 2); // Still 2, no new sends
    }
}
