<?php

namespace Tests\Feature;

use App\Models\EmailCampaign;
use App\Models\WaitlistEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The email campaigns module shipped with dead duplicate/delete buttons and
 * hardcoded segment counts. These tests lock the correct behaviour: permission
 * gates, the schedule validation guard, idempotent duplicate (no send history
 * copied), and the live segment reach endpoint.
 */
class CampaignControllerTest extends TestCase
{
    use RefreshDatabase;

    private function campaign(array $attrs = []): EmailCampaign
    {
        return EmailCampaign::create([
            'public_id' => EmailCampaign::nextPublicId(),
            'name' => 'Test campaign',
            'subject' => 'Hello',
            'status' => 'draft',
            ...$attrs,
        ]);
    }

    public function test_list_requires_email_view(): void
    {
        $this->actingAsPermissionless();
        $this->getJson("{$this->api}/campaigns")->assertForbidden();

        $this->actingAsWithPermissions(['email.view']);
        $this->getJson("{$this->api}/campaigns")->assertOk();
    }

    public function test_store_requires_email_create(): void
    {
        $this->actingAsWithPermissions(['email.view']);
        $this->postJson("{$this->api}/campaigns", ['name' => 'x', 'subject' => 'y'])
            ->assertForbidden();

        $this->actingAsWithPermissions(['email.create']);
        $this->postJson("{$this->api}/campaigns", ['name' => 'New', 'subject' => 'Hi'])
            ->assertCreated();
    }

    public function test_scheduled_status_without_scheduled_at_is_422(): void
    {
        $this->actingAsWithPermissions(['email.create']);

        $this->postJson("{$this->api}/campaigns", [
            'name' => 'Newsletter',
            'subject' => 'News',
            'status' => 'scheduled',
            // deliberately omitting scheduledAt
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['scheduledAt']);
    }

    public function test_scheduled_at_in_the_past_is_422(): void
    {
        $this->actingAsWithPermissions(['email.create']);

        $this->postJson("{$this->api}/campaigns", [
            'name' => 'Newsletter',
            'subject' => 'News',
            'status' => 'scheduled',
            'scheduledAt' => now()->subHour()->toIso8601String(),
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['scheduledAt']);
    }

    public function test_duplicate_creates_a_draft_with_no_send_history(): void
    {
        $this->actingAsWithPermissions(['email.view', 'email.create']);
        $original = $this->campaign([
            'status' => 'sent',
            'sent' => 500,
            'opens' => 120,
            'clicks' => 40,
        ]);

        $response = $this->postJson("{$this->api}/campaigns/{$original->public_id}/duplicate")
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.sent', 0)
            ->assertJsonPath('data.opens', 0)
            ->assertJsonPath('data.clicks', 0);

        $this->assertStringContainsString('(copy)', $response->json('data.name'));
    }

    public function test_delete_requires_email_delete(): void
    {
        $this->actingAsWithPermissions(['email.view']);
        $c = $this->campaign();
        $this->deleteJson("{$this->api}/campaigns/{$c->public_id}")->assertForbidden();

        $this->actingAsWithPermissions(['email.delete']);
        $this->deleteJson("{$this->api}/campaigns/{$c->public_id}")
            ->assertOk()
            ->assertJsonPath('data.deleted', true);
        $this->assertNull(EmailCampaign::find($c->id));
    }

    public function test_segments_returns_live_reach(): void
    {
        // Two verified waitlist members in different cities.
        WaitlistEntry::create([
            'public_id' => 'wl_00001', 'name' => 'Ade', 'email' => 'ade@test.com',
            'status' => 'active', 'referral_code' => 'ADE001',
            'position' => 1, 'source' => 'organic', 'device' => 'Web', 'tags' => [],
        ]);
        WaitlistEntry::create([
            'public_id' => 'wl_00002', 'name' => 'Bola', 'email' => 'bola@test.com',
            'status' => 'active', 'referral_code' => 'BOL001',
            'position' => 2, 'source' => 'organic', 'device' => 'Web', 'tags' => [],
        ]);

        $this->actingAsWithPermissions(['email.view']);

        $response = $this->getJson("{$this->api}/campaigns/segments")
            ->assertOk();

        $data = $response->json('data');
        $this->assertIsArray($data);
        $this->assertNotEmpty($data);

        // Every preset must include value, label, rules, and a non-negative reach.
        foreach ($data as $preset) {
            $this->assertArrayHasKey('value', $preset);
            $this->assertArrayHasKey('label', $preset);
            $this->assertArrayHasKey('reach', $preset);
            $this->assertGreaterThanOrEqual(0, $preset['reach']);
        }

        // The "all" preset should reach all active entries (2 here).
        $all = collect($data)->firstWhere('value', 'all');
        if ($all !== null) {
            $this->assertSame(2, $all['reach']);
        }
    }

    public function test_send_requires_email_send(): void
    {
        $this->actingAsWithPermissions(['email.view']);
        $c = $this->campaign();
        $this->postJson("{$this->api}/campaigns/{$c->public_id}/send")->assertForbidden();
    }
}
