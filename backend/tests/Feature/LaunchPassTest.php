<?php

namespace Tests\Feature;

use App\Models\WaitlistEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LaunchPassTest extends TestCase
{
    use RefreshDatabase;

    private function signup(array $overrides = []): array
    {
        return [
            'name' => 'Rasheed Techsalaf',
            'email' => 'rasheed@example.test',
            'phone' => '08012345678',
            'city' => 'Abuja',
            'role' => 'vendor',
            'source' => 'organic',
            'consent' => true,
            'attendingNatcon' => true,
            ...$overrides,
        ];
    }

    public function test_signup_generates_launch_pass_token_and_respects_natcon_preference(): void
    {
        $response = $this->postJson("{$this->api}/waitlist", $this->signup());

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Rasheed Techsalaf')
            ->assertJsonPath('data.attendingNatcon', true);

        $entry = WaitlistEntry::firstOrFail();
        $this->assertNotNull($entry->launch_pass_token);
        $this->assertTrue($entry->attending_natcon);
        $this->assertNotEmpty($entry->launch_pass_number);
    }

    public function test_signup_defaults_attending_natcon_to_true_when_omitted(): void
    {
        $payload = $this->signup();
        unset($payload['attendingNatcon']);

        $response = $this->postJson("{$this->api}/waitlist", $payload);

        $response->assertCreated()
            ->assertJsonPath('data.attendingNatcon', true);

        $entry = WaitlistEntry::where('email', $payload['email'])->firstOrFail();
        $this->assertTrue($entry->attending_natcon);
    }

    public function test_public_launch_pass_endpoint_returns_sanitized_card_data(): void
    {
        $entry = WaitlistEntry::create([
            'public_id' => 'wl_pass_001',
            'name' => 'Aisha Bello',
            'email' => 'aisha@example.test',
            'phone' => '08099998888',
            'city' => 'Kano',
            'role' => 'customer',
            'status' => 'active',
            'referral_code' => 'AISHA2026',
            'position' => 42,
            'source' => 'organic',
            'device' => 'Web',
            'tags' => [],
            'launch_pass_token' => 'token_aisha_secret_pass',
            'attending_natcon' => true,
        ]);

        $response = $this->getJson("{$this->api}/launch-pass/token_aisha_secret_pass");

        $response->assertOk()
            ->assertJsonPath('data.name', 'Aisha Bello')
            ->assertJsonPath('data.firstName', 'Aisha')
            ->assertJsonPath('data.city', 'Kano')
            ->assertJsonPath('data.launchPassNumber', '#00042')
            ->assertJsonPath('data.referralCode', 'AISHA2026')
            ->assertJsonPath('data.attendingNatcon', true)
            ->assertJsonMissing(['email' => 'aisha@example.test'])
            ->assertJsonMissing(['phone' => '08099998888']);
    }

    public function test_attendee_preference_can_be_updated_without_authentication(): void
    {
        $entry = WaitlistEntry::create([
            'public_id' => 'wl_pass_pref_002',
            'name' => 'Chidi Obi',
            'email' => 'chidi@example.test',
            'status' => 'active',
            'referral_code' => 'CHIDI2026',
            'position' => 100,
            'source' => 'organic',
            'device' => 'Web',
            'tags' => [],
            'attending_natcon' => false,
        ]);

        $response = $this->postJson("{$this->api}/waitlist/{$entry->public_id}/natcon-preference", [
            'attending_natcon' => true,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.attendingNatcon', true);

        $this->assertTrue($entry->fresh()->attending_natcon);
    }

    public function test_launch_pass_lookup_finds_user_by_email_or_phone_or_referral(): void
    {
        $entry = WaitlistEntry::create([
            'public_id' => 'wl_pass_lookup_003',
            'name' => 'Fatima Yusuf',
            'email' => 'fatima@example.test',
            'phone' => '08123456789',
            'city' => 'Kaduna',
            'status' => 'active',
            'referral_code' => 'FATIMA99',
            'position' => 77,
            'source' => 'organic',
            'device' => 'Web',
            'tags' => [],
            'launch_pass_token' => 'fatima_token_xyz',
            'attending_natcon' => true,
        ]);

        // Lookup by email
        $this->postJson("{$this->api}/launch-pass/lookup", ['identifier' => 'fatima@example.test'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Fatima Yusuf')
            ->assertJsonPath('data.launchPassToken', 'fatima_token_xyz');

        // Lookup by phone
        $this->postJson("{$this->api}/launch-pass/lookup", ['identifier' => '08123456789'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Fatima Yusuf');

        // Lookup by phone with international format +234
        $this->postJson("{$this->api}/launch-pass/lookup", ['identifier' => '+2348123456789'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Fatima Yusuf');

        // Lookup by referral code
        $this->postJson("{$this->api}/launch-pass/lookup", ['identifier' => 'FATIMA99'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Fatima Yusuf');

        // Missing lookup returns 404
        $this->postJson("{$this->api}/launch-pass/lookup", ['identifier' => 'nonexistent@example.test'])
            ->assertNotFound();
    }

    public function test_asset_proxy_streams_public_storage_files_with_cors_headers(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');
        \Illuminate\Support\Facades\Storage::disk('public')->put('media/launchpass/test-logo.png', 'fake-png-content');

        $response = $this->get("{$this->api}/launch-pass/asset-proxy?url=https://api.mytijaara.com/storage/media/launchpass/test-logo.png");

        $response->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', '*')
            ->assertHeader('Content-Type', 'image/png');

        $this->assertSame('fake-png-content', $response->getContent());
    }
}
