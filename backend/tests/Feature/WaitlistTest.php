<?php

namespace Tests\Feature;

use App\Models\Referral;
use App\Models\WaitlistEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaitlistTest extends TestCase
{
    use RefreshDatabase;

    private function signup(array $overrides = []): array
    {
        return [
            'name' => 'Ada Okafor',
            'email' => 'ada@example.test',
            'city' => 'Lagos',
            'role' => 'customer',
            'source' => 'organic',
            'consent' => true,
            ...$overrides,
        ];
    }

    public function test_public_signup_creates_a_verifiable_waitlist_entry(): void
    {
        $this->postJson("{$this->api}/waitlist", $this->signup())
            ->assertCreated()
            ->assertJsonPath('data.email', 'ada@example.test')
            ->assertJsonPath('data.verified', false);

        $entry = WaitlistEntry::firstOrFail();
        $this->getJson("{$this->api}/waitlist/verify/{$entry->verification_token}")
            ->assertOk()
            ->assertJsonPath('data.verified', true);

        $this->assertNull($entry->fresh()->verification_token);
    }

    public function test_duplicate_email_is_rejected(): void
    {
        $this->postJson("{$this->api}/waitlist", $this->signup())->assertCreated();
        $this->postJson("{$this->api}/waitlist", $this->signup())
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_referral_signup_increments_referrer_and_converts_on_verification(): void
    {
        $referrer = WaitlistEntry::create([
            'public_id' => 'wl_00001', 'name' => 'Referrer', 'email' => 'referrer@example.test',
            'status' => 'active', 'referral_code' => 'REFER123', 'position' => 1,
            'source' => 'organic', 'device' => 'Web', 'tags' => [],
        ]);

        $this->postJson("{$this->api}/waitlist", $this->signup([
            'email' => 'friend@example.test', 'referralCode' => 'REFER123', 'source' => 'referral',
        ]))->assertCreated();

        $referred = WaitlistEntry::where('email', 'friend@example.test')->firstOrFail();
        $this->assertSame(1, $referrer->fresh()->referrals);
        $this->assertFalse(Referral::firstOrFail()->converted);

        $this->getJson("{$this->api}/waitlist/verify/{$referred->verification_token}")->assertOk();
        $this->assertTrue(Referral::firstOrFail()->fresh()->converted);
    }

    public function test_admin_can_list_and_update_waitlist_entries(): void
    {
        $entry = WaitlistEntry::create([
            'public_id' => 'wl_00001', 'name' => 'Ada Okafor', 'email' => 'ada@example.test',
            'status' => 'active', 'referral_code' => 'ADA12345', 'position' => 1,
            'source' => 'organic', 'device' => 'Web', 'tags' => [],
        ]);
        $this->actingAsRole('super_admin');

        $this->getJson("{$this->api}/waitlist?search=Ada")->assertOk()->assertJsonPath('meta.total', 1);
        $this->patchJson("{$this->api}/waitlist/{$entry->public_id}", ['verified' => true, 'notes' => 'Priority'])
            ->assertOk()->assertJsonPath('data.verified', true);
    }
}
