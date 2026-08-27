<?php

namespace Tests\Feature;

use App\Models\DataRoomAuditLog;
use App\Models\DataRoomSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\BuildsDataRoom;
use Tests\TestCase;

/**
 * Visitor authentication gates.
 *
 * The enumeration assertions are the ones that matter most: every rejection
 * path has to return byte-identical JSON and the same status, or the endpoint
 * becomes an oracle for "which investors hold access to this round".
 */
class DataRoomAuthenticationTest extends TestCase
{
    use BuildsDataRoom, RefreshDatabase;

    private const FAILURE = 'We could not verify those details. Please check the email address and access code you were sent.';

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('dataroom:auth:ip:127.0.0.1');
    }

    private function authenticate(array $payload = []): \Illuminate\Testing\TestResponse
    {
        return $this->postJson($this->api.'/dataroom/authenticate', $payload + [
            'email' => 'amina@examplevc.com',
            'code' => 'MTJ-8F4K-92QX',
        ]);
    }

    // -- happy path --------------------------------------------------------

    public function test_a_valid_email_and_code_issues_a_session_token(): void
    {
        [$grant] = $this->grantWithCode();

        $response = $this->authenticate()->assertOk();

        $token = $response->json('data.token');
        $this->assertIsString($token);
        $this->assertSame(64, strlen($token));

        // Only the digest is persisted, so a database dump cannot be replayed.
        $this->assertDatabaseHas('dataroom_sessions', [
            'access_grant_id' => $grant->id,
            'token_hash' => hash('sha256', $token),
        ]);
        $this->assertDatabaseMissing('dataroom_sessions', ['token_hash' => $token]);

        $response->assertJsonPath('data.visitor.email', 'amina@examplevc.com');
        $response->assertJsonStructure(['data' => ['session' => ['idleExpiresAt', 'absoluteExpiresAt', 'idleTimeoutMinutes']]]);

        // Usage is counted at authentication, which is what makes max_uses real.
        $this->assertSame(1, $grant->fresh()->current_uses);
        $this->assertNotNull($grant->fresh()->last_accessed_at);

        $this->assertDatabaseHas('dataroom_audit_logs', [
            'access_grant_id' => $grant->id,
            'action' => 'authenticated',
        ]);
    }

    public function test_the_response_is_never_cached_and_never_returns_the_code_hash(): void
    {
        $this->grantWithCode();

        $response = $this->authenticate()->assertOk();

        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->assertStringNotContainsString('access_code_hash', $response->getContent());
        $this->assertStringNotContainsString('$2y$', $response->getContent());
    }

    public function test_email_is_matched_case_insensitively_and_the_code_is_normalized(): void
    {
        $this->grantWithCode();

        $this->authenticate(['email' => '  AMINA@ExampleVC.com ', 'code' => ' mtj 8f4k 92qx '])
            ->assertOk();
    }

    // -- enumeration parity ------------------------------------------------

    /**
     * Every rejection reason must be indistinguishable from the outside. If any
     * of these diverges in status or body, an attacker can classify an address.
     *
     * @return array<string,array{0:?string,1:array<string,string>}>
     */
    public static function rejectionCases(): array
    {
        return [
            'unknown email' => [null, ['email' => 'stranger@example.com']],
            'wrong code' => [null, ['code' => 'MTJ-AAAA-AAAA']],
            'revoked grant' => ['revoked', []],
            'suspended grant' => ['suspended', []],
            'expired grant' => ['expired', []],
            'exhausted grant' => ['exhausted', []],
            'not yet started' => ['pending', []],
        ];
    }

    #[DataProvider('rejectionCases')]
    public function test_every_rejection_reason_returns_the_identical_failure(?string $state, array $payload): void
    {
        $attributes = match ($state) {
            'revoked' => ['status' => 'revoked'],
            'suspended' => ['status' => 'suspended'],
            'expired' => ['expires_at' => now()->subMinute()],
            'exhausted' => ['max_uses' => 2, 'current_uses' => 2],
            'pending' => ['starts_at' => now()->addDay()],
            default => [],
        };

        $this->grantWithCode($attributes);

        $response = $this->authenticate($payload);

        $response->assertStatus(401);
        $this->assertSame(['message' => self::FAILURE], $response->json());
    }

    public function test_a_rejected_attempt_does_not_create_a_session_or_count_a_use(): void
    {
        [$grant] = $this->grantWithCode(['status' => 'revoked']);

        $this->authenticate()->assertStatus(401);

        $this->assertDatabaseCount('dataroom_sessions', 0);
        $this->assertSame(0, $grant->fresh()->current_uses);
    }

    public function test_the_real_rejection_reason_reaches_the_audit_log(): void
    {
        $this->grantWithCode(['status' => 'suspended']);
        $this->authenticate()->assertStatus(401);

        $this->assertDatabaseHas('dataroom_audit_logs', [
            'action' => 'authentication_failed_inactive',
            'details' => 'status: suspended',
        ]);

        $this->authenticate(['email' => 'nobody@example.com'])->assertStatus(401);

        $this->assertDatabaseHas('dataroom_audit_logs', [
            'action' => 'authentication_failed',
            'details' => 'unknown email',
        ]);
    }

    public function test_a_second_grant_for_the_same_email_is_resolved_by_the_code(): void
    {
        [$old] = $this->grantWithCode(['code' => 'MTJ-AAAA-AAAA']);
        [$new] = $this->grantWithCode(['code' => 'MTJ-CCCC-CCCC']);

        // The reissued code must win, and the superseded one must still resolve
        // to its own grant rather than to whichever row is newest.
        $this->authenticate(['code' => 'MTJ-CCCC-CCCC'])->assertOk();
        $this->assertDatabaseHas('dataroom_sessions', ['access_grant_id' => $new->id]);

        $this->authenticate(['code' => 'MTJ-AAAA-AAAA'])->assertOk();
        $this->assertDatabaseHas('dataroom_sessions', ['access_grant_id' => $old->id]);
    }

    // -- validation and rate limiting --------------------------------------

    public function test_missing_credentials_are_rejected_by_validation(): void
    {
        $this->postJson($this->api.'/dataroom/authenticate', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'code']);
    }

    public function test_repeated_failures_lock_the_endpoint_and_report_a_retry_delay(): void
    {
        $this->grantWithCode();

        $max = app(\App\Services\DataRoom\DataRoomPolicyResolver::class)->maxFailedAttempts();

        for ($i = 0; $i < $max; $i++) {
            $this->authenticate(['code' => 'MTJ-AAAA-AAAA'])->assertStatus(401);
        }

        // The correct code is now refused too: the lockout is on the attempt
        // rate, not on the guess being wrong.
        $response = $this->authenticate()->assertStatus(429);
        $this->assertGreaterThan(0, $response->json('retryAfter'));

        $this->assertDatabaseHas('dataroom_audit_logs', [
            'action' => 'authentication_failed',
            'details' => 'rate limited',
        ]);
    }

    public function test_the_email_key_is_throttled_independently_of_the_ip(): void
    {
        $this->grantWithCode();
        $max = app(\App\Services\DataRoom\DataRoomPolicyResolver::class)->maxFailedAttempts();

        for ($i = 0; $i < $max; $i++) {
            $this->authenticate(['code' => 'MTJ-AAAA-AAAA'])->assertStatus(401);
        }

        // A fresh IP still cannot hammer the same address.
        RateLimiter::clear('dataroom:auth:ip:127.0.0.1');
        $this->assertTrue(RateLimiter::tooManyAttempts('dataroom:auth:email:'.sha1('amina@examplevc.com'), $max));
    }

    public function test_a_successful_authentication_clears_the_failure_counters(): void
    {
        $this->grantWithCode();

        $this->authenticate(['code' => 'MTJ-AAAA-AAAA'])->assertStatus(401);
        $this->authenticate()->assertOk();

        $this->assertSame(0, RateLimiter::attempts('dataroom:auth:ip:127.0.0.1'));
        $this->assertSame(0, RateLimiter::attempts('dataroom:auth:email:'.sha1('amina@examplevc.com')));
    }

    // -- the global PIN gate -----------------------------------------------

    public function test_the_pin_gate_is_advertised_without_revealing_the_pin(): void
    {
        $this->settings()->update([
            'global_pin_enabled' => true,
            'global_pin_hash' => Hash::make('open-sesame'),
        ]);

        $response = $this->getJson($this->api.'/dataroom/gate')->assertOk();

        $response->assertJsonPath('data.open', true);
        $response->assertJsonPath('data.pinRequired', true);
        $this->assertStringNotContainsString('open-sesame', $response->getContent());
        $this->assertStringNotContainsString('$2y$', $response->getContent());
    }

    public function test_a_wrong_or_absent_pin_fails_with_the_same_generic_message(): void
    {
        $this->grantWithCode();
        $this->settings()->update([
            'global_pin_enabled' => true,
            'global_pin_hash' => Hash::make('open-sesame'),
        ]);

        $this->assertSame(['message' => self::FAILURE], $this->authenticate()->assertStatus(401)->json());
        $this->assertSame(['message' => self::FAILURE], $this->authenticate(['pin' => 'wrong'])->assertStatus(401)->json());

        $this->assertDatabaseHas('dataroom_audit_logs', [
            'action' => 'authentication_failed',
            'details' => 'global pin mismatch',
        ]);
    }

    public function test_the_correct_pin_plus_valid_credentials_succeeds(): void
    {
        $this->grantWithCode();
        $this->settings()->update([
            'global_pin_enabled' => true,
            'global_pin_hash' => Hash::make('open-sesame'),
        ]);

        $this->authenticate(['pin' => 'open-sesame'])->assertOk();
    }

    public function test_a_pin_switch_with_no_hash_is_not_treated_as_a_gate(): void
    {
        $this->grantWithCode();
        // An operator toggling the switch without setting a value must not
        // accidentally leave the room open to any PIN, or closed to all.
        $this->settings()->update(['global_pin_enabled' => true, 'global_pin_hash' => null]);

        $this->getJson($this->api.'/dataroom/gate')->assertJsonPath('data.pinRequired', false);
        $this->authenticate()->assertOk();
    }

    // -- lockdown ----------------------------------------------------------

    public function test_emergency_lockdown_closes_the_gate_and_authentication(): void
    {
        $this->grantWithCode();
        $this->settings()->update(['emergency_lockdown' => true]);

        $this->getJson($this->api.'/dataroom/gate')
            ->assertOk()
            ->assertJsonPath('data.open', false)
            ->assertJsonPath('data.message', 'The data room is not currently available. Please contact your MyTijaara contact for assistance.');

        $this->authenticate()->assertStatus(403);
    }

    public function test_lockdown_also_stops_a_session_that_was_already_open(): void
    {
        [$grant] = $this->grantWithCode();
        $token = $this->sessionToken($grant);

        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertOk();

        $this->settings()->update(['emergency_lockdown' => true]);

        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertStatus(403);
    }

    public function test_the_environment_switch_overrides_the_admin_setting(): void
    {
        $this->grantWithCode();
        // DATA_ROOM_ENABLED=false takes the room offline; no admin row can
        // reopen it, which is the point of the config ceiling.
        config(['dataroom.enabled' => false]);

        $this->getJson($this->api.'/dataroom/gate')->assertJsonPath('data.open', false);
        $this->authenticate()->assertStatus(403);
    }

    // -- session lifecycle -------------------------------------------------

    public function test_an_unauthenticated_request_to_a_protected_route_is_rejected(): void
    {
        $this->getJson($this->api.'/dataroom/me')->assertStatus(401);
        $this->getJson($this->api.'/dataroom/me', ['Authorization' => 'Bearer not-a-real-token'])->assertStatus(401);
        $this->getJson($this->api.'/dataroom/me', ['Authorization' => 'Basic abc'])->assertStatus(401);
    }

    public function test_an_admin_sanctum_session_grants_nothing_in_the_data_room(): void
    {
        $this->grantWithCode();
        // The non-negotiable domain separation: an administrator is not a
        // visitor. There is no bridge from the admin guard to this one.
        $this->actingAsRole('super_admin');

        $this->getJson($this->api.'/dataroom/me')->assertStatus(401);
        $this->getJson($this->api.'/dataroom/dashboard')->assertStatus(401);
    }

    public function test_an_idle_session_expires_and_is_deleted(): void
    {
        [$grant] = $this->grantWithCode();
        $token = $this->sessionToken($grant, ['expires_at' => now()->subMinute()]);

        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertStatus(401);

        $this->assertDatabaseCount('dataroom_sessions', 0);
        $this->assertDatabaseHas('dataroom_audit_logs', ['action' => 'session_expired']);
    }

    public function test_activity_cannot_extend_a_session_past_its_absolute_ceiling(): void
    {
        [$grant] = $this->grantWithCode();
        $ceiling = now()->addMinutes(5);
        $token = $this->sessionToken($grant, ['absolute_expires_at' => $ceiling]);

        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertOk();

        // The idle clock was refreshed, but clamped to the ceiling rather than
        // pushed 30 minutes out past it.
        $session = DataRoomSession::firstOrFail();
        $this->assertTrue($session->expires_at->lessThanOrEqualTo($ceiling));

        $this->travelTo($ceiling->copy()->addSecond());
        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertStatus(401);
    }

    public function test_revoking_a_grant_kills_a_live_session_on_the_next_request(): void
    {
        [$grant] = $this->grantWithCode();
        $token = $this->sessionToken($grant);

        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertOk();

        $grant->update(['status' => 'revoked']);

        // No TTL to wait out: the middleware re-derives status from the row on
        // every request.
        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertStatus(403);
        $this->assertDatabaseCount('dataroom_sessions', 0);
    }

    public function test_an_expiring_grant_stops_working_without_any_scheduled_job(): void
    {
        [$grant] = $this->grantWithCode(['expires_at' => now()->addMinutes(10)]);
        $token = $this->sessionToken($grant, ['absolute_expires_at' => now()->addHours(8)]);

        $this->travelTo(now()->addMinutes(11));

        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertStatus(403);
        $this->assertSame('expired', $grant->fresh()->effectiveStatus());
    }

    public function test_protected_responses_carry_noindex_and_no_store_headers(): void
    {
        [$grant] = $this->grantWithCode();
        $token = $this->sessionToken($grant);

        $response = $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertOk();

        $this->assertSame('noindex, nofollow, noarchive', $response->headers->get('X-Robots-Tag'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_logout_destroys_only_the_calling_session(): void
    {
        [$grant] = $this->grantWithCode();
        $mine = $this->sessionToken($grant);
        $other = $this->sessionToken($grant);

        $this->postJson($this->api.'/dataroom/logout', [], $this->visitorHeaders($mine))->assertOk();

        $this->assertDatabaseMissing('dataroom_sessions', ['token_hash' => hash('sha256', $mine)]);
        $this->assertDatabaseHas('dataroom_sessions', ['token_hash' => hash('sha256', $other)]);
        $this->assertDatabaseHas('dataroom_audit_logs', ['action' => 'logout']);
    }

    public function test_logout_cannot_be_used_to_probe_whether_a_token_is_valid(): void
    {
        // Both answers are 200 with the same body, so the endpoint is not an
        // oracle for token validity.
        $bogus = $this->postJson($this->api.'/dataroom/logout', [], ['Authorization' => 'Bearer nope'])->assertOk();
        $none = $this->postJson($this->api.'/dataroom/logout')->assertOk();

        $this->assertSame(['data' => ['success' => true]], $bogus->json());
        $this->assertSame($bogus->json(), $none->json());
    }

    public function test_me_re_derives_the_visitor_from_the_server_side_session(): void
    {
        [$grant] = $this->grantWithCode(['organization' => 'Example Ventures']);
        $token = $this->sessionToken($grant);

        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))
            ->assertOk()
            ->assertJsonPath('data.email', 'amina@examplevc.com')
            ->assertJsonPath('data.organization', 'Example Ventures')
            ->assertJsonStructure(['data' => ['session' => ['idleExpiresAt', 'absoluteExpiresAt']]]);
    }

    public function test_no_audit_row_ever_stores_a_session_token(): void
    {
        [$grant] = $this->grantWithCode();
        $token = $this->sessionToken($grant);

        $this->getJson($this->api.'/dataroom/dashboard', $this->visitorHeaders($token))->assertOk();

        foreach (DataRoomAuditLog::all() as $log) {
            $this->assertStringNotContainsString($token, (string) $log->details);
            $this->assertStringNotContainsString(hash('sha256', $token), (string) $log->details);
        }
    }
}
