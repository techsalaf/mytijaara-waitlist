<?php

namespace Tests\Feature;

use App\Models\EmailCampaign;
use App\Models\Referral;
use App\Models\WaitlistEntry;
use App\Support\WeeklyDigest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WeeklyDigestTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    /**
     * There is no WaitlistEntryFactory, so rows are built explicitly. `created_at`
     * is passed in because every assertion here is about which window a row falls
     * into, and it is applied with `forceFill` after the insert: it is not in
     * `$fillable`, so `create()` would silently drop it and stamp `now()`.
     */
    private function entry(array $attributes = []): WaitlistEntry
    {
        $n = ++$this->seq;
        $createdAt = $attributes['created_at'] ?? null;
        unset($attributes['created_at']);

        $entry = WaitlistEntry::create([
            'public_id' => 'wl_'.str_pad((string) $n, 5, '0', STR_PAD_LEFT),
            'name' => "Member {$n}",
            'email' => "member{$n}@example.test",
            'status' => 'active',
            'referral_code' => 'CODE'.str_pad((string) $n, 4, '0', STR_PAD_LEFT),
            'position' => $n,
            'source' => 'organic',
            'device' => 'Web',
            'tags' => [],
            ...$attributes,
        ]);

        if ($createdAt !== null) {
            $entry->forceFill(['created_at' => $createdAt])->saveQuietly();
        }

        return $entry;
    }

    /** Same reason as `entry()`: `Referral::$fillable` has no `created_at`. */
    private function referral(WaitlistEntry $referrer, WaitlistEntry $referred, mixed $createdAt): Referral
    {
        $referral = Referral::create([
            'referrer_id' => $referrer->id,
            'referred_id' => $referred->id,
            'code' => $referrer->referral_code,
        ]);
        $referral->forceFill(['created_at' => $createdAt])->saveQuietly();

        return $referral;
    }

    public function test_metrics_count_only_the_selected_window(): void
    {
        $this->entry(['created_at' => now()->subDays(2), 'city' => 'Ibadan']);
        $this->entry(['created_at' => now()->subDays(3), 'city' => 'Ibadan']);
        // Inside the previous 7-day window, so it is `previousSignups`, not `signups`.
        $this->entry(['created_at' => now()->subDays(10), 'city' => 'Lagos']);
        // Older than both windows: counts towards `total` only.
        $this->entry(['created_at' => now()->subDays(60), 'city' => 'Kano']);

        $m = WeeklyDigest::metrics(7);

        $this->assertSame(7, $m['days']);
        $this->assertSame(2, $m['signups']);
        $this->assertSame(1, $m['previousSignups']);
        $this->assertSame(4, $m['total']);
        $this->assertSame(100.0, $m['growth']);
        $this->assertSame([['city' => 'Ibadan', 'signups' => 2]], $m['topCities']);
    }

    public function test_verified_rate_is_a_share_of_the_window_not_of_everything(): void
    {
        $this->entry(['created_at' => now()->subDay(), 'verified' => true]);
        $this->entry(['created_at' => now()->subDay(), 'verified' => false]);
        $this->entry(['created_at' => now()->subDay(), 'verified' => false]);
        $this->entry(['created_at' => now()->subDays(40), 'verified' => true]);

        $m = WeeklyDigest::metrics(7);

        $this->assertSame(3, $m['signups']);
        $this->assertSame(1, $m['verified']);
        $this->assertSame(33.3, $m['verifiedRate']);
    }

    public function test_growth_is_zero_when_both_windows_are_empty(): void
    {
        $m = WeeklyDigest::metrics(7);

        $this->assertSame(0, $m['signups']);
        $this->assertSame(0.0, $m['growth']);
        $this->assertSame(0.0, $m['verifiedRate']);
        $this->assertSame([], $m['topCities']);
        $this->assertSame([], $m['topReferrers']);
    }

    public function test_referred_signups_count_entries_with_a_referrer(): void
    {
        $referrer = $this->entry(['created_at' => now()->subDays(20)]);
        $this->entry(['created_at' => now()->subDay(), 'referred_by_id' => $referrer->id]);
        $this->entry(['created_at' => now()->subDay()]);

        $this->assertSame(1, WeeklyDigest::metrics(7)['referredSignups']);
    }

    /**
     * The regression this guards: ranking by the lifetime `referrals` column would
     * put a referrer who did all their work last month at the top of this week's
     * digest.
     */
    public function test_top_referrers_rank_by_conversions_inside_the_window(): void
    {
        $recent = $this->entry(['name' => 'Recent Referrer', 'referrals' => 1]);
        $historic = $this->entry(['name' => 'Historic Referrer', 'referrals' => 50]);

        $a = $this->entry();
        $b = $this->entry();
        $this->referral($recent, $a, now()->subDay());
        $this->referral($historic, $b, now()->subDays(45));

        $top = WeeklyDigest::metrics(7)['topReferrers'];

        $this->assertCount(1, $top);
        $this->assertSame('Recent Referrer', $top[0]['name']);
        $this->assertSame(1, $top[0]['referrals']);
    }

    public function test_window_is_clamped_to_the_supported_range(): void
    {
        $this->assertSame(1, WeeklyDigest::metrics(0)['days']);
        $this->assertSame(1, WeeklyDigest::metrics(-30)['days']);
        $this->assertSame(90, WeeklyDigest::metrics(3650)['days']);
    }

    public function test_rendered_body_carries_the_numbers_and_an_unsubscribe_token(): void
    {
        $this->entry(['created_at' => now()->subDay(), 'city' => 'Ibadan']);
        $m = WeeklyDigest::metrics(7);
        $html = WeeklyDigest::html($m);

        $this->assertStringContainsString('Ibadan', $html);
        $this->assertStringContainsString('1 new signups in the last 7 days', $html);
        // `CampaignMail` swaps this literal token for the recipient's real URL at
        // send time, so it has to survive Blade rendering un-substituted.
        $this->assertStringContainsString('{{unsubscribe}}', $html);
    }

    public function test_rendered_body_states_its_empty_sections_instead_of_rendering_blank_tables(): void
    {
        $html = WeeklyDigest::html(WeeklyDigest::metrics(7));

        $this->assertStringContainsString('No signups with a city recorded in this window.', $html);
        $this->assertStringContainsString('Nobody referred a friend in this window.', $html);
    }

    public function test_preview_endpoint_returns_numbers_and_body_without_writing(): void
    {
        $this->entry(['created_at' => now()->subDay(), 'city' => 'Lagos']);
        $this->actingAsWithPermissions(['analytics.view']);

        $this->getJson("{$this->api}/analytics/digest?days=7")
            ->assertOk()
            ->assertJsonPath('data.metrics.signups', 1)
            ->assertJsonPath('data.metrics.days', 7);

        $this->assertSame(0, EmailCampaign::count());
    }

    public function test_preview_is_gated_on_analytics_view(): void
    {
        $this->actingAsPermissionless();

        $this->getJson("{$this->api}/analytics/digest")->assertForbidden();
    }

    public function test_post_saves_a_draft_campaign_with_a_real_body(): void
    {
        $this->entry(['created_at' => now()->subDay(), 'city' => 'Ibadan']);
        $this->actingAsWithPermissions(['email.create']);

        $response = $this->postJson("{$this->api}/analytics/digest", ['days' => 7])
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.metrics.signups', 1);

        $campaign = EmailCampaign::firstOrFail();
        $this->assertSame($campaign->public_id, $response->json('data.campaignId'));
        // The old button posted `html: ""`. An empty body is the failure mode.
        $this->assertNotSame('', (string) $campaign->html);
        $this->assertStringContainsString('Ibadan', (string) $campaign->html);
        $this->assertStringContainsString('1 new signups', $campaign->subject);
    }

    public function test_post_records_an_audit_entry(): void
    {
        $this->actingAsWithPermissions(['email.create']);

        $this->postJson("{$this->api}/analytics/digest", ['days' => 7])->assertCreated();

        $this->assertDatabaseHas('audit_logs', ['action' => 'digest.created']);
    }

    /**
     * Reading analytics does not imply being allowed to create a campaign, so the
     * write side is gated separately.
     */
    public function test_post_is_gated_on_email_create_not_analytics_view(): void
    {
        $this->actingAsWithPermissions(['analytics.view']);

        $this->postJson("{$this->api}/analytics/digest", ['days' => 7])->assertForbidden();
        $this->assertSame(0, EmailCampaign::count());
    }

    public function test_two_digests_in_a_row_get_distinct_campaign_ids(): void
    {
        $this->actingAsWithPermissions(['email.create']);

        $first = $this->postJson("{$this->api}/analytics/digest", ['days' => 7])->assertCreated();
        $second = $this->postJson("{$this->api}/analytics/digest", ['days' => 7])->assertCreated();

        $this->assertNotSame(
            $first->json('data.campaignId'),
            $second->json('data.campaignId'),
        );
        $this->assertSame(2, EmailCampaign::count());
    }
}
