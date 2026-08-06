<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\TwoFactor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

/**
 * Gate tests for the Profile module.
 *
 * The page previously rendered a hardcoded "Adaeze Okafor", fired
 * `toast.success("Saved")` without a request, listed three invented devices and
 * six invented recovery codes. These tests pin the replacement: profile writes
 * hit the row, the password change verifies the current password and revokes
 * every other token, the sessions list is the real Sanctum token table, and 2FA
 * is a real TOTP factor that is not enforced until a valid code confirms it.
 */
class ProfileTest extends TestCase
{
    use RefreshDatabase;

    // -----------------------------------------------------------------
    // Profile
    // -----------------------------------------------------------------

    public function test_me_returns_the_profile_fields_and_permission_set(): void
    {
        $user = $this->actingAsRole('super_admin', [
            'name' => 'Rasheed A',
            'phone' => '+234 800 000 0000',
        ]);

        $this->getJson("{$this->api}/auth/me")
            ->assertOk()
            ->assertJsonPath('data.name', 'Rasheed A')
            ->assertJsonPath('data.roleSlug', 'super_admin')
            ->assertJsonPath('data.phone', '+234 800 000 0000')
            ->assertJsonPath('data.twoFactorEnabled', false)
            // Defaults, so the preferences tab never renders `undefined`.
            ->assertJsonPath('data.preferences.weeklyDigest', true)
            ->assertJsonPath('data.preferences.signupAlerts', false);

        $permissions = $this->getJson("{$this->api}/auth/me")->json('data.permissions');
        $this->assertContains('settings.view', $permissions);
        $this->assertSame($user->id, $user->fresh()->id);
    }

    public function test_profile_update_persists_to_the_database(): void
    {
        $user = $this->actingAsRole('marketing');

        $this->patchJson("{$this->api}/auth/me", [
            'name' => 'Updated Name',
            'phone' => '+234 811 111 1111',
            'location' => 'Ibadan, Nigeria',
            'bio' => 'Building the everything app.',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonPath('data.location', 'Ibadan, Nigeria');

        // The response is not the proof; the row is.
        $fresh = $user->fresh();
        $this->assertSame('Updated Name', $fresh->name);
        $this->assertSame('Ibadan, Nigeria', $fresh->location);
        $this->assertSame('Building the everything app.', $fresh->bio);
    }

    public function test_preferences_merge_and_unknown_keys_are_dropped(): void
    {
        $user = $this->actingAsRole('marketing');

        $this->patchJson("{$this->api}/auth/me", [
            'preferences' => ['signupAlerts' => true, 'somethingElse' => true],
        ])
            ->assertOk()
            ->assertJsonPath('data.preferences.signupAlerts', true)
            // Untouched keys keep their default rather than disappearing.
            ->assertJsonPath('data.preferences.weeklyDigest', true);

        $this->assertArrayNotHasKey('somethingElse', $user->fresh()->preferences);
    }

    public function test_profile_email_must_stay_unique(): void
    {
        $this->actingAsRole('marketing');
        User::factory()->create(['email' => 'taken@mytijaara.com']);

        $this->patchJson("{$this->api}/auth/me", ['email' => 'taken@mytijaara.com'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_profile_endpoints_require_authentication(): void
    {
        $this->getJson("{$this->api}/auth/me")->assertUnauthorized();
        $this->patchJson("{$this->api}/auth/me", ['name' => 'x'])->assertUnauthorized();
        $this->getJson("{$this->api}/auth/sessions")->assertUnauthorized();
    }

    // -----------------------------------------------------------------
    // Password
    // -----------------------------------------------------------------

    public function test_password_change_requires_the_current_password(): void
    {
        $user = $this->actingAsRole('marketing', ['password' => Hash::make('correct-horse')]);

        $this->postJson("{$this->api}/auth/password", [
            'current_password' => 'wrong-one',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('current_password');

        // The stored hash is untouched after a rejected attempt.
        $this->assertTrue(Hash::check('correct-horse', $user->fresh()->password));
    }

    public function test_password_change_writes_the_new_hash(): void
    {
        $user = $this->actingAsRole('marketing', ['password' => Hash::make('correct-horse')]);

        $this->postJson("{$this->api}/auth/password", [
            'current_password' => 'correct-horse',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertOk()->assertJsonPath('data.success', true);

        $this->assertTrue(Hash::check('new-password-123', $user->fresh()->password));
    }

    public function test_password_change_revokes_other_sessions(): void
    {
        $user = $this->actingAsRole('marketing', ['password' => Hash::make('correct-horse')]);
        $user->createToken('phone');
        $user->createToken('laptop');
        $this->assertSame(2, $user->tokens()->count());

        $this->postJson("{$this->api}/auth/password", [
            'current_password' => 'correct-horse',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertOk();

        // A stolen session must not outlive the password it was taken under.
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_new_password_must_differ_from_the_current_one(): void
    {
        $this->actingAsRole('marketing', ['password' => Hash::make('correct-horse')]);

        $this->postJson("{$this->api}/auth/password", [
            'current_password' => 'correct-horse',
            'password' => 'correct-horse',
            'password_confirmation' => 'correct-horse',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    // -----------------------------------------------------------------
    // Sessions
    // -----------------------------------------------------------------

    public function test_sessions_list_reads_the_real_token_table(): void
    {
        $user = $this->actingAsRole('marketing');

        $token = $user->createToken('admin-panel');
        $token->accessToken->forceFill([
            'ip' => '102.89.34.12',
            'user_agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126.0',
        ])->save();

        $this->getJson("{$this->api}/auth/sessions")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.ip', '102.89.34.12')
            ->assertJsonPath('data.0.device', 'macOS · Chrome');
    }

    public function test_revoking_a_session_deletes_that_token(): void
    {
        $user = $this->actingAsRole('marketing');
        $id = $user->createToken('phone')->accessToken->getKey();

        $this->deleteJson("{$this->api}/auth/sessions/{$id}")->assertOk();

        $this->assertSame(0, $user->tokens()->where('id', $id)->count());
    }

    public function test_revoking_an_unknown_session_is_a_404(): void
    {
        $this->actingAsRole('marketing');

        $this->deleteJson("{$this->api}/auth/sessions/999999")->assertNotFound();
    }

    public function test_revoke_others_clears_every_token(): void
    {
        $user = $this->actingAsRole('marketing');
        $user->createToken('phone');
        $user->createToken('tablet');

        $this->postJson("{$this->api}/auth/sessions/revoke-others")
            ->assertOk()
            ->assertJsonPath('data.revoked', 2);

        $this->assertSame(0, $user->tokens()->count());
    }

    // -----------------------------------------------------------------
    // Two-factor
    // -----------------------------------------------------------------

    public function test_starting_two_factor_issues_a_secret_but_does_not_enable_it(): void
    {
        $user = $this->actingAsRole('super_admin');

        $setup = $this->postJson("{$this->api}/auth/two-factor")->assertOk()->json('data');

        $this->assertNotEmpty($setup['secret']);
        $this->assertStringContainsString('<svg', $setup['qrSvg']);
        $this->assertCount(TwoFactor::RECOVERY_CODE_COUNT, $setup['recoveryCodes']);

        // Not enforced until a real code confirms it, so an admin cannot lock
        // themselves out with a secret their authenticator never received.
        $this->assertFalse($user->fresh()->hasTwoFactorEnabled());
        $this->getJson("{$this->api}/auth/me")
            ->assertJsonPath('data.twoFactorEnabled', false)
            ->assertJsonPath('data.twoFactorPending', true);
    }

    public function test_confirming_with_a_valid_code_enables_two_factor(): void
    {
        $user = $this->actingAsRole('super_admin');
        $secret = $this->postJson("{$this->api}/auth/two-factor")->json('data.secret');

        $this->postJson("{$this->api}/auth/two-factor/confirm", [
            'code' => (new Google2FA)->getCurrentOtp($secret),
        ])->assertOk()->assertJsonPath('data.twoFactorEnabled', true);

        $this->assertTrue($user->fresh()->hasTwoFactorEnabled());
    }

    public function test_confirming_with_a_wrong_code_leaves_it_off(): void
    {
        $user = $this->actingAsRole('super_admin');
        $this->postJson("{$this->api}/auth/two-factor");

        $this->postJson("{$this->api}/auth/two-factor/confirm", ['code' => '000000'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('code');

        $this->assertFalse($user->fresh()->hasTwoFactorEnabled());
    }

    public function test_the_stored_secret_is_encrypted_at_rest(): void
    {
        $user = $this->actingAsRole('super_admin');
        $secret = $this->postJson("{$this->api}/auth/two-factor")->json('data.secret');

        // A database dump must not hand over a working second factor.
        $raw = \Illuminate\Support\Facades\DB::table('users')
            ->where('id', $user->id)
            ->value('two_factor_secret');

        $this->assertNotSame($secret, $raw);
        $this->assertSame($secret, $user->fresh()->two_factor_secret);
    }

    public function test_a_recovery_code_logs_in_once_and_is_then_consumed(): void
    {
        $user = $this->actingAsRole('super_admin');
        $setup = $this->postJson("{$this->api}/auth/two-factor")->json('data');
        TwoFactor::confirm($user->fresh(), (new Google2FA)->getCurrentOtp($setup['secret']));

        $user = $user->fresh();
        $code = $setup['recoveryCodes'][0];

        $this->assertTrue(TwoFactor::verifyChallenge($user, $code));
        // Single use: the same code must not work twice.
        $this->assertFalse(TwoFactor::verifyChallenge($user->fresh(), $code));
        $this->assertSame(
            TwoFactor::RECOVERY_CODE_COUNT - 1,
            TwoFactor::remainingRecoveryCodes($user->fresh()),
        );
    }

    public function test_login_challenges_for_a_code_when_two_factor_is_on(): void
    {
        $user = User::factory()->create([
            'email' => 'twofactor@mytijaara.com',
            'password' => Hash::make('correct-horse'),
            'status' => 'active',
        ]);
        $setup = TwoFactor::begin($user);
        TwoFactor::confirm($user->fresh(), (new Google2FA)->getCurrentOtp($setup['secret']));

        // Password alone is not enough, and the response says why.
        $this->postJson("{$this->api}/auth/login", [
            'email' => 'twofactor@mytijaara.com',
            'password' => 'correct-horse',
        ])
            ->assertStatus(202)
            ->assertJsonPath('data.twoFactorRequired', true);

        $this->postJson("{$this->api}/auth/login", [
            'email' => 'twofactor@mytijaara.com',
            'password' => 'correct-horse',
            'code' => (new Google2FA)->getCurrentOtp($user->fresh()->two_factor_secret),
        ])
            ->assertOk()
            ->assertJsonStructure(['data' => ['token', 'user']]);
    }

    public function test_disabling_two_factor_requires_the_password(): void
    {
        $user = $this->actingAsRole('super_admin', ['password' => Hash::make('correct-horse')]);
        $setup = $this->postJson("{$this->api}/auth/two-factor")->json('data');
        $this->postJson("{$this->api}/auth/two-factor/confirm", [
            'code' => (new Google2FA)->getCurrentOtp($setup['secret']),
        ])->assertOk();

        $this->deleteJson("{$this->api}/auth/two-factor", ['password' => 'nope'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
        $this->assertTrue($user->fresh()->hasTwoFactorEnabled());

        $this->deleteJson("{$this->api}/auth/two-factor", ['password' => 'correct-horse'])
            ->assertOk()
            ->assertJsonPath('data.twoFactorEnabled', false);
        $this->assertNull($user->fresh()->two_factor_secret);
    }

    public function test_recovery_codes_cannot_be_reissued_before_two_factor_is_enabled(): void
    {
        $this->actingAsRole('super_admin');

        $this->postJson("{$this->api}/auth/two-factor/recovery-codes")->assertStatus(422);
    }

    public function test_login_records_the_ip_and_user_agent_on_the_token(): void
    {
        User::factory()->create([
            'email' => 'stamp@mytijaara.com',
            'password' => Hash::make('correct-horse'),
            'status' => 'active',
        ]);

        $this->withHeaders(['User-Agent' => 'Mozilla/5.0 (iPhone) Safari/605.1'])
            ->postJson("{$this->api}/auth/login", [
                'email' => 'stamp@mytijaara.com',
                'password' => 'correct-horse',
            ])->assertOk();

        $token = User::where('email', 'stamp@mytijaara.com')->first()->tokens()->first();
        $this->assertNotNull($token->ip);
        $this->assertStringContainsString('iPhone', (string) $token->user_agent);
    }
}
