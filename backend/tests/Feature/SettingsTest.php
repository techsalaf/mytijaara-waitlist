<?php

namespace Tests\Feature;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Gate tests for the Settings module.
 *
 * Every Settings tab used to fire `toast.success("Saved")` without a request.
 * These pin the replacement: a save is a validated merge that lands in the
 * `settings` row, secrets go out redacted and survive a round-trip, API keys
 * are shown once and stored only as a hash, and the cache purge really flushes.
 */
class SettingsTest extends TestCase
{
    use RefreshDatabase;

    // -----------------------------------------------------------------
    // Groups
    // -----------------------------------------------------------------

    public function test_a_group_that_has_never_been_saved_returns_defaults(): void
    {
        $this->actingAsRole('super_admin');

        $this->getJson("{$this->api}/settings/company")
            ->assertOk()
            ->assertJsonPath('data.siteName', 'MyTijaara')
            ->assertJsonPath('data.launchCity', 'Ibadan')
            ->assertJsonPath('data.timezone', 'Africa/Lagos');
    }

    public function test_an_unknown_group_is_a_404(): void
    {
        $this->actingAsRole('super_admin');

        $this->getJson("{$this->api}/settings/nonsense")->assertNotFound();
    }

    public function test_saving_a_group_persists_to_the_settings_row(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/settings/company", [
            'siteName' => 'MyTijaara NG',
            'contactEmail' => 'hello@mytijaara.com',
            'launchCity' => 'Lagos',
        ])
            ->assertOk()
            ->assertJsonPath('data.siteName', 'MyTijaara NG');

        $row = Setting::where('group', 'company')->first();
        $this->assertSame('MyTijaara NG', $row->data['siteName']);
        $this->assertSame('hello@mytijaara.com', $row->data['contactEmail']);
    }

    public function test_a_partial_save_does_not_wipe_the_other_fields(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/settings/company", ['siteName' => 'First'])->assertOk();
        $this->patchJson("{$this->api}/settings/company", ['launchCity' => 'Abuja'])->assertOk();

        $row = Setting::where('group', 'company')->first();
        $this->assertSame('First', $row->data['siteName']);
        $this->assertSame('Abuja', $row->data['launchCity']);
    }

    public function test_an_unknown_key_is_discarded_rather_than_merged(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/settings/company", [
            'siteName' => 'Kept',
            'somethingInvented' => 'dropped',
        ])->assertOk();

        $this->assertArrayNotHasKey('somethingInvented', Setting::where('group', 'company')->first()->data);
    }

    public function test_invalid_values_are_rejected_with_a_field_error(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/settings/company", ['contactEmail' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('contactEmail');

        $this->patchJson("{$this->api}/settings/system", ['signupRateLimitPerHour' => 99999])
            ->assertStatus(422)
            ->assertJsonValidationErrors('signupRateLimitPerHour');
    }

    public function test_system_booleans_are_stored_as_booleans(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/settings/system", [
            'maintenanceMode' => true,
            'signupsPaused' => false,
            'weeklyDigestEnabled' => true,
            'weeklyDigestDay' => 'fri',
            'weeklyDigestRecipients' => ['ops@mytijaara.com'],
        ])->assertOk();

        $data = Setting::where('group', 'system')->first()->data;
        // A JSON column would happily keep the string "1" and break every `if`.
        $this->assertTrue($data['maintenanceMode']);
        $this->assertFalse($data['signupsPaused']);
        $this->assertSame('fri', $data['weeklyDigestDay']);
        $this->assertSame(['ops@mytijaara.com'], $data['weeklyDigestRecipients']);
    }

    public function test_digest_recipients_must_be_valid_addresses(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/settings/system", [
            'weeklyDigestRecipients' => ['ops@mytijaara.com', 'garbage'],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('weeklyDigestRecipients.1');
    }

    // -----------------------------------------------------------------
    // Secrets
    // -----------------------------------------------------------------

    public function test_the_smtp_password_is_redacted_on_read(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/settings/smtp", [
            'host' => 'smtp.mailgun.org',
            'password' => 'super-secret',
        ])->assertOk();

        $data = $this->getJson("{$this->api}/settings/smtp")->assertOk()->json('data');
        $this->assertNotSame('super-secret', $data['password']);
        $this->assertTrue($data['passwordSet']);
        // The real value is still on the row; only the response is masked.
        $this->assertSame('super-secret', Setting::where('group', 'smtp')->first()->data['password']);
    }

    public function test_posting_the_redacted_placeholder_back_does_not_destroy_the_secret(): void
    {
        $this->actingAsRole('super_admin');
        $this->patchJson("{$this->api}/settings/smtp", ['password' => 'super-secret'])->assertOk();

        $redacted = $this->getJson("{$this->api}/settings/smtp")->json('data.password');

        // This is what an untouched form field posts back.
        $this->patchJson("{$this->api}/settings/smtp", [
            'host' => 'smtp.postmark.com',
            'password' => $redacted,
        ])->assertOk();

        $row = Setting::where('group', 'smtp')->first()->data;
        $this->assertSame('smtp.postmark.com', $row['host']);
        $this->assertSame('super-secret', $row['password']);
    }

    public function test_the_resend_key_is_masked_on_read(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/settings/integrations", [
            'resendApiKey' => 're_live_abcdefgh1234',
        ])->assertOk();

        $masked = $this->getJson("{$this->api}/settings/integrations")->json('data.resendApiKey');
        $this->assertStringEndsWith('1234', $masked);
        $this->assertStringNotContainsString('abcdefgh', $masked);
    }

    // -----------------------------------------------------------------
    // API keys
    // -----------------------------------------------------------------

    public function test_generating_a_key_returns_the_plaintext_exactly_once(): void
    {
        $this->actingAsRole('super_admin');

        $body = $this->postJson("{$this->api}/settings/api-keys", ['name' => 'Production'])
            ->assertCreated()
            ->json('data');

        $plain = $body['key'];
        $this->assertStringStartsWith('mtj_', $plain);

        // Only a hash and the last four are kept, so a leaked settings row
        // cannot be replayed against the API.
        $stored = Setting::where('group', 'api_keys')->first()->data['keys'][0];
        $this->assertSame(hash('sha256', $plain), $stored['hash']);
        $this->assertArrayNotHasKey('key', $stored);

        // No endpoint can hand the plaintext back.
        $listed = $this->getJson("{$this->api}/settings/api-keys")->assertOk()->json('data');
        $this->assertCount(1, $listed);
        $this->assertStringNotContainsString($plain, json_encode($listed));
        $this->assertStringEndsWith(substr($plain, -4), $listed[0]['masked']);
        $this->assertTrue($listed[0]['active']);
    }

    public function test_a_key_name_is_required(): void
    {
        $this->actingAsRole('super_admin');

        $this->postJson("{$this->api}/settings/api-keys", ['name' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_revoking_a_key_marks_it_inactive_and_keeps_the_record(): void
    {
        $this->actingAsRole('super_admin');
        $id = $this->postJson("{$this->api}/settings/api-keys", ['name' => 'Staging'])
            ->json('data.record.id');

        $this->deleteJson("{$this->api}/settings/api-keys/{$id}")->assertOk();

        $listed = $this->getJson("{$this->api}/settings/api-keys")->json('data');
        // Kept for the audit trail, flagged inactive rather than deleted.
        $this->assertCount(1, $listed);
        $this->assertFalse($listed[0]['active']);
        $this->assertNotNull($listed[0]['revokedAt']);

        // Revoking twice is a 404, not a silent success.
        $this->deleteJson("{$this->api}/settings/api-keys/{$id}")->assertNotFound();
    }

    public function test_api_keys_cannot_be_written_through_the_group_endpoint(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/settings/api_keys", ['keys' => []])->assertStatus(422);
    }

    // -----------------------------------------------------------------
    // Cache
    // -----------------------------------------------------------------

    public function test_purging_the_cache_actually_flushes_it(): void
    {
        $this->actingAsRole('super_admin');
        Cache::put('probe', 'value', 600);
        $this->assertSame('value', Cache::get('probe'));

        $this->postJson("{$this->api}/settings/cache/purge")
            ->assertOk()
            ->assertJsonStructure(['data' => ['store', 'entriesCleared', 'purgedAt']]);

        $this->assertNull(Cache::get('probe'));
    }

    // -----------------------------------------------------------------
    // Permissions
    // -----------------------------------------------------------------

    public function test_settings_endpoints_require_authentication(): void
    {
        $this->getJson("{$this->api}/settings/company")->assertUnauthorized();
        $this->patchJson("{$this->api}/settings/company", [])->assertUnauthorized();
        $this->getJson("{$this->api}/settings/api-keys")->assertUnauthorized();
        $this->postJson("{$this->api}/settings/cache/purge")->assertUnauthorized();
    }

    public function test_reading_requires_settings_view(): void
    {
        $this->actingAsPermissionless();

        $this->getJson("{$this->api}/settings/company")->assertForbidden();
    }

    public function test_writing_requires_settings_edit_general(): void
    {
        // Read-only settings access. No seeded role has this shape, so the read
        // gate and the write gate can only be shown to be separate with one
        // built for the assertion.
        $this->actingAsWithPermissions(['settings.view']);

        $this->getJson("{$this->api}/settings/company")->assertOk();
        $this->patchJson("{$this->api}/settings/company", ['siteName' => 'Nope'])->assertForbidden();
        $this->postJson("{$this->api}/settings/api-keys", ['name' => 'Nope'])->assertForbidden();
        $this->postJson("{$this->api}/settings/cache/purge")->assertForbidden();
    }
}
