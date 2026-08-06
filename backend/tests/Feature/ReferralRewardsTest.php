<?php

namespace Tests\Feature;

use App\Mail\ReferralRewardMail;
use App\Models\Referral;
use App\Models\ReferralVisit;
use App\Models\Setting;
use App\Models\WaitlistEntry;
use App\Support\RewardDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * The referrals module used to ship two dead buttons and a hardcoded "₦124k".
 * These tests lock the real behaviour: rewards are paid once, unverified
 * referrals never pay, sub-minimum referrers are held with a reason, a mail
 * failure rolls the claim back, and the endpoints are gated by the correct
 * permissions.
 */
class ReferralRewardsTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    /**
     * There is no WaitlistEntryFactory, so rows are built explicitly, matching
     * WeeklyDigestTest. `created_at` is not fillable, so it is not passed here.
     */
    private function entry(array $attributes = []): WaitlistEntry
    {
        $n = ++$this->seq;

        return WaitlistEntry::create([
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
    }

    /**
     * A converted (payable) referral. `converted_at` and `rewarded_at` are in
     * `$fillable`, so they set directly; `created_at` is not, hence saveQuietly.
     */
    private function referral(WaitlistEntry $referrer, WaitlistEntry $referred, array $attributes = []): Referral
    {
        $createdAt = $attributes['created_at'] ?? now();
        unset($attributes['created_at']);

        $referral = Referral::create([
            'referrer_id' => $referrer->id,
            'referred_id' => $referred->id,
            'code' => $referrer->referral_code,
            'converted' => true,
            'converted_at' => now(),
            'points' => 10,
            ...$attributes,
        ]);
        $referral->forceFill(['created_at' => $createdAt])->saveQuietly();

        return $referral;
    }

    /** Set the program so tests do not depend on the shipped defaults. */
    private function program(array $overrides = []): void
    {
        Setting::updateOrCreate(['group' => 'referrals'], ['data' => array_merge([
            'rewardsEnabled' => true,
            'currency' => 'NGN',
            'referrerReward' => 500,
            'referredReward' => 250,
            'minimumVerifiedForPayout' => 1,
            'bonusMilestoneRefs' => 0,
            'bonusMilestoneReward' => 0,
            'rewardNote' => '',
        ], $overrides)]);
    }

    public function test_unconverted_referrals_are_never_paid(): void
    {
        Mail::fake();
        $this->program();
        $referrer = $this->entry(['referrals' => 1]);
        $referred = $this->entry();
        // Not converted: an unverified signup can never trigger a payout.
        $this->referral($referrer, $referred, ['converted' => false, 'converted_at' => null]);

        $result = RewardDispatcher::dispatch([$referrer->public_id], null, null);

        $this->assertSame(0, $result['rewarded']);
        $this->assertSame(1, $result['skipped']);
        Mail::assertNothingSent();
        $this->assertNull($referrer->referralsMade()->first()->rewarded_at);
    }

    public function test_a_converted_referral_is_paid_once(): void
    {
        Mail::fake();
        $this->program(['minimumVerifiedForPayout' => 1]);
        $referrer = $this->entry(['referrals' => 1]);
        $this->referral($referrer, $this->entry());

        $result = RewardDispatcher::dispatch([$referrer->public_id], null, null);

        $this->assertSame(1, $result['rewarded']);
        Mail::assertSent(ReferralRewardMail::class, 1);
        $this->assertNotNull(Referral::where('referrer_id', $referrer->id)->first()->rewarded_at);
    }

    public function test_a_second_run_pays_nobody(): void
    {
        Mail::fake();
        $this->program(['minimumVerifiedForPayout' => 1]);
        $referrer = $this->entry(['referrals' => 1]);
        $this->referral($referrer, $this->entry());

        RewardDispatcher::dispatch([$referrer->public_id], null, null);
        $second = RewardDispatcher::dispatch([$referrer->public_id], null, null);

        $this->assertSame(0, $second['rewarded']);
        $this->assertSame(1, $second['skipped']);
        // Exactly one mail across both runs: idempotency via rewarded_at.
        Mail::assertSent(ReferralRewardMail::class, 1);
    }

    public function test_a_referrer_below_the_minimum_is_skipped_with_a_reason(): void
    {
        Mail::fake();
        $this->program(['minimumVerifiedForPayout' => 3]);
        $referrer = $this->entry(['referrals' => 1]);
        $this->referral($referrer, $this->entry());

        $result = RewardDispatcher::dispatch([$referrer->public_id], null, null);

        $this->assertSame(0, $result['rewarded']);
        $this->assertSame(1, $result['skipped']);
        $this->assertStringContainsString('needs 3', $result['messages'][0]);
        Mail::assertNothingSent();
    }

    public function test_the_milestone_bonus_is_added_exactly_once(): void
    {
        Mail::fake();
        // 5 refs = milestone; base 500 each + 5000 bonus paid one time.
        $this->program(['minimumVerifiedForPayout' => 1, 'referrerReward' => 500, 'bonusMilestoneRefs' => 5, 'bonusMilestoneReward' => 5000]);
        $referrer = $this->entry(['referrals' => 5]);
        for ($i = 0; $i < 5; $i++) {
            $this->referral($referrer, $this->entry());
        }

        $result = RewardDispatcher::dispatch([$referrer->public_id], null, null);

        $this->assertSame(1, $result['rewarded']);
        // 5 * 500 + 5000 = 7500.
        $this->assertStringContainsString('7,500', $result['messages'][0]);
    }

    public function test_a_mail_failure_rolls_the_claim_back(): void
    {
        // Make Mail::send throw so the claim must be undone.
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('smtp down'));
        $this->program(['minimumVerifiedForPayout' => 1]);
        $referrer = $this->entry(['referrals' => 1]);
        $this->referral($referrer, $this->entry());

        $result = RewardDispatcher::dispatch([$referrer->public_id], null, null);

        $this->assertSame(0, $result['rewarded']);
        $this->assertSame(1, $result['failed']);
        // The claim is rolled back so the run can be retried.
        $this->assertNull(Referral::where('referrer_id', $referrer->id)->first()->rewarded_at);
    }

    public function test_post_returns_422_when_nothing_was_paid_and_something_failed(): void
    {
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('smtp down'));
        $this->program(['minimumVerifiedForPayout' => 1]);
        $referrer = $this->entry(['referrals' => 1]);
        $this->referral($referrer, $this->entry());

        $this->actingAsWithPermissions(['referrals.manage']);

        $this->postJson("{$this->api}/referrals/rewards", ['ids' => [$referrer->public_id]])
            ->assertStatus(422);
    }

    public function test_post_rewards_is_gated_on_manage_not_view(): void
    {
        $this->program();
        $this->actingAsWithPermissions(['referrals.view']);

        $this->postJson("{$this->api}/referrals/rewards", ['ids' => ['wl_00001']])
            ->assertForbidden();
    }

    public function test_export_is_gated_on_export_permission(): void
    {
        $this->actingAsWithPermissions(['referrals.view']);
        $this->getJson("{$this->api}/referrals/export")->assertForbidden();

        $this->actingAsWithPermissions(['referrals.export']);
        $this->get("{$this->api}/referrals/export")->assertOk();
    }

    public function test_analytics_scopes_counts_to_the_window(): void
    {
        $this->program();
        // A visit inside 7 days and one outside it.
        ReferralVisit::create(['code' => 'CODE0001', 'ip_hash' => 'a', 'country' => 'Nigeria']);
        $old = ReferralVisit::create(['code' => 'CODE0001', 'ip_hash' => 'b', 'country' => 'Nigeria']);
        $old->forceFill(['created_at' => now()->subDays(40)])->saveQuietly();

        $this->actingAsWithPermissions(['referrals.view']);

        $this->getJson("{$this->api}/referrals/analytics?days=7")
            ->assertOk()
            ->assertJsonPath('data.periodDays', 7)
            ->assertJsonPath('data.totalVisits', 1);

        $this->getJson("{$this->api}/referrals/analytics?days=0")
            ->assertOk()
            ->assertJsonPath('data.periodDays', 0)
            ->assertJsonPath('data.totalVisits', 2);
    }

    public function test_settings_referrals_persists_and_drops_unknown_keys(): void
    {
        $this->actingAsWithPermissions(['settings.view', 'settings.edit-general']);

        $this->patchJson("{$this->api}/settings/referrals", ['referrerReward' => 750])
            ->assertOk()
            ->assertJsonPath('data.referrerReward', 750);

        // Laravel's validator returns only validated keys, so an unknown key is
        // silently dropped rather than persisted. The stored row must not carry it.
        $this->patchJson("{$this->api}/settings/referrals", ['bogusKey' => 1, 'referredReward' => 300])
            ->assertOk()
            ->assertJsonPath('data.referredReward', 300);

        $stored = Setting::where('group', 'referrals')->first()->data;
        $this->assertSame(750, $stored['referrerReward']);
        $this->assertArrayNotHasKey('bogusKey', $stored);
    }
}
