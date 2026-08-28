<?php

namespace Tests\Feature;

use App\Models\DataRoomAccessGrant;
use App\Models\DataRoomAuditLog;
use App\Models\DataRoomDocument;
use App\Models\DataRoomDocumentVersion;
use App\Models\DataRoomSetting;
use App\Services\DataRoom\DataRoomAuthorizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\BuildsDataRoom;
use Tests\TestCase;

/**
 * The administrative side of the data room.
 *
 * Two things are under test here. First, that the per-endpoint RBAC gates are
 * genuinely separate: being able to read the room does not imply being able to
 * issue access to it, and the ordinary `admin` role cannot move the security
 * policy. Second, that the grant lifecycle behaves like a credential rather than
 * a record: the plaintext code exists exactly once, revocation is terminal, and
 * every mutation lands in a trail that has no edit or delete endpoint.
 */
class DataRoomAdminApiTest extends TestCase
{
    use BuildsDataRoom, RefreshDatabase;

    private string $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = $this->api.'/admin/dataroom';
    }

    // -- RBAC --------------------------------------------------------------

    /**
     * Endpoint => permission that opens it. Every other permission in the group
     * must be refused, which is what proves the gates are per-endpoint and not
     * one coarse `data-room.*`.
     *
     * @return array<string,array{0:string,1:string,2:string}>
     */
    public static function gatedEndpoints(): array
    {
        return [
            'overview' => ['get', '/overview', 'data-room.view'],
            'analytics' => ['get', '/analytics', 'data-room.view-activity'],
            'audit logs' => ['get', '/audit-logs', 'data-room.view-activity'],
            'read settings' => ['get', '/settings', 'data-room.view'],
            'write settings' => ['patch', '/settings', 'data-room.manage-settings'],
            'emergency' => ['post', '/emergency', 'data-room.manage-settings'],
            'list folders' => ['get', '/folders', 'data-room.view'],
            'create folder' => ['post', '/folders', 'data-room.manage-documents'],
            'list documents' => ['get', '/documents', 'data-room.view'],
            'upload document' => ['post', '/documents', 'data-room.upload'],
            'list grants' => ['get', '/grants', 'data-room.manage-access'],
            'create grant' => ['post', '/grants', 'data-room.manage-access'],
            'permission matrix' => ['get', '/permission-matrix', 'data-room.manage-access'],
            'templates' => ['get', '/templates', 'data-room.manage-access'],
        ];
    }

    #[DataProvider('gatedEndpoints')]
    public function test_each_endpoint_admits_only_its_own_permission(string $verb, string $path, string $permission): void
    {
        // Holding the right permission gets past the gate. A 422 is a pass here:
        // validation runs after authorization, so the request was authorized.
        $this->actingAsWithPermissions([$permission]);
        $this->assertNotSame(403, $this->json($verb, $this->admin.$path)->status(), "{$permission} was refused {$verb} {$path}.");

        // Every other data room permission is refused.
        foreach (['view', 'upload', 'manage-documents', 'manage-access', 'view-activity', 'manage-settings', 'delete'] as $other) {
            $name = 'data-room.'.$other;

            if ($name === $permission) {
                continue;
            }

            $this->actingAsWithPermissions([$name]);
            $this->json($verb, $this->admin.$path)->assertStatus(403);
        }
    }

    public function test_an_unauthenticated_caller_reaches_no_admin_endpoint(): void
    {
        foreach (['/overview', '/settings', '/grants', '/documents', '/folders', '/permission-matrix'] as $path) {
            $this->getJson($this->admin.$path)->assertStatus(401);
        }
    }

    public function test_a_data_room_visitor_token_is_not_an_admin_credential(): void
    {
        [$grant] = $this->grantWithCode();
        $headers = $this->visitorHeaders($this->sessionToken($grant));

        // The other half of the domain separation: a visitor bearer token is
        // meaningless to the Sanctum guard.
        $this->getJson($this->admin.'/overview', $headers)->assertStatus(401);
        $this->getJson($this->admin.'/grants', $headers)->assertStatus(401);
    }

    public function test_the_ordinary_admin_role_cannot_move_the_security_policy(): void
    {
        $this->actingAsRole('admin');

        // Day-to-day diligence work is open to them.
        $this->getJson($this->admin.'/overview')->assertOk();
        $this->getJson($this->admin.'/grants')->assertOk();

        // The security policy and hard deletes are not.
        $this->patchJson($this->admin.'/settings', ['downloads_enabled' => false])->assertStatus(403);
        $this->postJson($this->admin.'/emergency', ['action' => 'lock_room', 'confirmation' => 'LOCK DATA ROOM'])->assertStatus(403);

        $doc = $this->document();
        $this->deleteJson($this->admin."/documents/{$doc->id}?purge=1")->assertStatus(403);
    }

    public function test_super_admin_holds_the_whole_group(): void
    {
        $this->actingAsRole('super_admin');

        $this->getJson($this->admin.'/overview')->assertOk();
        $this->getJson($this->admin.'/analytics')->assertOk();
        $this->patchJson($this->admin.'/settings', ['downloads_enabled' => true])->assertOk();
    }

    // -- caching and indexing posture --------------------------------------

    /**
     * Every admin payload is unstorable and unindexable.
     *
     * These responses carry visitor names, email addresses, organizations, grant
     * scope and document metadata. Symfony's default for a JSON response is
     * `no-cache, private`, which still permits a shared cache to store the body,
     * so the group needs its own posture. Asserted on a refusal as well as on a
     * success, because a 401 and a 403 are the responses a proxy is most likely
     * to be willing to keep.
     */
    public function test_every_admin_response_is_unstorable_and_unindexable(): void
    {
        $paths = ['/overview', '/settings', '/grants', '/documents', '/folders', '/permission-matrix', '/audit-logs'];

        foreach ($paths as $path) {
            $this->assertPosture($this->getJson($this->admin.$path)->assertStatus(401), 'unauthenticated '.$path);
        }

        $this->actingAsRole('admin');
        $this->assertPosture($this->patchJson($this->admin.'/settings', ['downloads_enabled' => false])->assertStatus(403), 'forbidden write');

        $this->actingAsRole('super_admin');
        foreach ($paths as $path) {
            $this->assertPosture($this->getJson($this->admin.$path)->assertOk(), $path);
        }

        $this->assertPosture(
            $this->postJson($this->admin.'/grants', $this->grantPayload())->assertStatus(201),
            'grant creation'
        );
    }

    public function test_a_streamed_admin_response_keeps_its_own_cache_header(): void
    {
        Storage::fake('dataroom');
        config(['dataroom.storage_disk' => 'dataroom']);
        $this->actingAsRole('super_admin');

        $id = $this->post($this->admin.'/documents', [
            'file' => $this->pdfUpload(),
            'title' => 'Financial Model',
            'confidentiality_level' => 'confidential',
        ], ['Accept' => 'application/json'])->assertStatus(201)->json('data.id');

        // The preview controller sets this deliberately on the bytes it sends.
        // Overwriting a controller's own choice from middleware would be the wrong
        // precedence, so the middleware only fills a gap.
        $response = $this->get($this->admin."/documents/{$id}/preview")->assertOk();

        // Symfony re-serializes the directives in its own order, so the value is
        // read directive by directive rather than compared as a string. What is
        // being pinned is that `max-age=0` survived, which is the controller's
        // choice and not the middleware's default.
        $this->assertTrue($response->headers->hasCacheControlDirective('no-store'));
        $this->assertTrue($response->headers->hasCacheControlDirective('private'));
        $this->assertSame('0', (string) $response->headers->getCacheControlDirective('max-age'));
        $this->assertSame('noindex, nofollow, noarchive', $response->headers->get('X-Robots-Tag'));
    }

    private function assertPosture(TestResponse $response, string $label): void
    {
        $cacheControl = (string) $response->headers->get('Cache-Control');

        $this->assertStringContainsString('no-store', $cacheControl, $label);
        $this->assertStringContainsString('private', $cacheControl, $label);
        $this->assertSame('noindex, nofollow, noarchive', $response->headers->get('X-Robots-Tag'), $label);
    }

    // -- grant creation ----------------------------------------------------

    /** @return array<string,mixed> */
    private function grantPayload(array $overrides = []): array
    {
        return $overrides + [
            'visitor_name' => 'Amina Yusuf',
            'visitor_email' => 'Amina@ExampleVC.com',
            'organization' => 'Example Ventures',
            'duration' => '14d',
            'all_documents_access' => true,
        ];
    }

    public function test_creating_a_grant_returns_the_plaintext_code_exactly_once(): void
    {
        $this->actingAsRole('super_admin');

        $response = $this->postJson($this->admin.'/grants', $this->grantPayload())->assertStatus(201);

        $code = $response->json('data.accessCode');
        $this->assertMatchesRegularExpression('/^MTJ-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $code);

        $grant = DataRoomAccessGrant::firstOrFail();

        // Only the bcrypt digest is at rest, and the code itself opens the room.
        $this->assertTrue(Hash::check($code, $grant->access_code_hash));
        $this->assertSame(substr($code, -4), $grant->code_hint);
        // Email is normalized on the way in, or the visitor's own address would
        // not match at authentication.
        $this->assertSame('amina@examplevc.com', $grant->visitor_email);

        // Reading the grant back never reproduces it.
        $detail = $this->getJson($this->admin."/grants/{$grant->id}")->assertOk();
        $this->assertStringNotContainsString($code, $detail->getContent());
        $this->assertStringNotContainsString('access_code_hash', $detail->getContent());
        $this->assertStringNotContainsString('$2y$', $detail->getContent());

        $this->assertStringNotContainsString($code, (string) $this->getJson($this->admin.'/grants')->getContent());
    }

    public function test_the_issued_code_actually_authenticates_the_visitor(): void
    {
        $this->actingAsRole('super_admin');
        $doc = $this->document();

        $code = $this->postJson($this->admin.'/grants', $this->grantPayload())
            ->assertStatus(201)
            ->json('data.accessCode');

        // End to end: the wizard's output is a working credential, which is the
        // only proof that hashing and normalization agree on both sides.
        $token = $this->postJson($this->api.'/dataroom/authenticate', [
            'email' => 'amina@examplevc.com',
            'code' => $code,
        ])->assertOk()->json('data.token');

        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $this->visitorHeaders($token))->assertOk();
    }

    public function test_a_grant_with_no_scope_at_all_is_refused(): void
    {
        $this->actingAsRole('super_admin');

        $this->postJson($this->admin.'/grants', $this->grantPayload(['all_documents_access' => false]))
            ->assertStatus(422)
            ->assertJsonPath('message', 'A grant must include at least one document or category, or full access.');

        $this->assertDatabaseCount('dataroom_access_grants', 0);
    }

    public function test_a_never_expiring_grant_requires_explicit_confirmation(): void
    {
        $this->actingAsRole('super_admin');

        $this->postJson($this->admin.'/grants', $this->grantPayload(['duration' => 'never']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['confirm_never_expires']);

        $this->assertDatabaseCount('dataroom_access_grants', 0);

        $this->postJson($this->admin.'/grants', $this->grantPayload([
            'duration' => 'never',
            'confirm_never_expires' => true,
        ]))->assertStatus(201)->assertJsonPath('data.grant.neverExpires', true);

        $this->assertNull(DataRoomAccessGrant::firstOrFail()->expires_at);
    }

    public function test_a_custom_duration_without_a_date_is_refused(): void
    {
        $this->actingAsRole('super_admin');

        $this->postJson($this->admin.'/grants', $this->grantPayload(['duration' => 'custom']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['expires_at']);
    }

    public function test_a_past_expiry_cannot_be_set_at_creation(): void
    {
        $this->actingAsRole('super_admin');

        // A grant born expired is a support ticket, not a security hole, but the
        // validator is the cheapest place to catch it.
        $this->postJson($this->admin.'/grants', $this->grantPayload([
            'duration' => 'custom',
            'expires_at' => now()->subDay()->toIso8601String(),
        ]))->assertStatus(422)->assertJsonValidationErrors(['expires_at']);
    }

    public function test_a_single_document_grant_records_exactly_that_scope(): void
    {
        $this->actingAsRole('super_admin');
        $folder = $this->folder();
        $mine = $this->document(['folder_id' => $folder->id, 'title' => 'Financial Model']);
        $theirs = $this->document(['folder_id' => $folder->id, 'title' => 'Cap Table']);

        $this->postJson($this->admin.'/grants', $this->grantPayload([
            'all_documents_access' => false,
            'document_permissions' => [
                ['document_id' => $mine->id, 'can_download' => true, 'can_print' => false],
            ],
        ]))->assertStatus(201);

        $grant = DataRoomAccessGrant::firstOrFail();

        // Named in the permission list only, and still granted: the matrix is
        // allowed to be the single input to the wizard.
        $this->assertSame([$mine->id], $grant->documents()->pluck('dataroom_documents.id')->all());
        $this->assertDatabaseMissing('dataroom_access_grant_documents', ['document_id' => $theirs->id]);
        $this->assertSame([], $grant->folders()->pluck('dataroom_folders.id')->all());
    }

    // -- grant lifecycle ---------------------------------------------------

    public function test_the_visitor_email_cannot_be_changed_on_an_existing_grant(): void
    {
        $this->actingAsRole('super_admin');
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);

        $this->patchJson($this->admin."/grants/{$grant->id}", [
            'visitor_name' => 'Amina Y.',
            'visitor_email' => 'attacker@example.com',
        ])->assertOk();

        // The email is half the credential. Changing it would hand a live code
        // to a different mailbox, so update() ignores the field entirely.
        $this->assertSame('amina@examplevc.com', $grant->fresh()->visitor_email);
        $this->assertSame('Amina Y.', $grant->fresh()->visitor_name);
    }

    public function test_regenerating_a_code_kills_every_session_and_resets_usage(): void
    {
        $this->actingAsRole('super_admin');
        [$grant, $old] = $this->grantWithCode(['all_documents_access' => true, 'max_uses' => 3]);

        $live = $this->sessionToken($grant);
        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($live))->assertOk();

        // Now spend the last permitted use, which is the state an operator is in
        // when they reissue: the grant is exhausted and the session still open.
        // The probe is left to the DB, because a request would trip the
        // middleware's own cleanup and destroy the session before regenerate ran.
        $grant->update(['current_uses' => 3]);
        $this->assertSame('exhausted', $grant->fresh()->effectiveStatus());

        $response = $this->postJson($this->admin."/grants/{$grant->id}/regenerate")->assertOk();
        $new = $response->json('data.accessCode');

        $this->assertNotSame($old, $new);
        $this->assertSame(1, $response->json('data.sessionsDestroyed'));
        $this->assertDatabaseCount('dataroom_sessions', 0);

        // The old token is dead immediately, not at the end of its TTL.
        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($live))->assertStatus(401);

        // Usage resets with the credential, or a grant capped at 3 uses would
        // arrive at its new owner already exhausted.
        $this->assertSame(0, (int) $grant->fresh()->current_uses);

        $this->postJson($this->api.'/dataroom/authenticate', ['email' => 'amina@examplevc.com', 'code' => $old])
            ->assertStatus(401);
        $this->postJson($this->api.'/dataroom/authenticate', ['email' => 'amina@examplevc.com', 'code' => $new])
            ->assertOk();
    }

    public function test_suspending_a_grant_destroys_its_sessions(): void
    {
        $this->actingAsRole('super_admin');
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $token = $this->sessionToken($grant);

        $this->postJson($this->admin."/grants/{$grant->id}/status", ['status' => 'suspended', 'reason' => 'diligence paused'])
            ->assertOk()
            ->assertJsonPath('data.sessionsDestroyed', 1)
            ->assertJsonPath('data.grant.status', 'suspended');

        // 401, not 403: the suspension already deleted the session row, so the
        // token resolves to nothing rather than to a dead grant.
        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertStatus(401);
        $this->assertDatabaseCount('dataroom_sessions', 0);

        // Reversible, unlike revocation.
        $this->postJson($this->admin."/grants/{$grant->id}/status", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.grant.status', 'active');
    }

    public function test_revocation_is_terminal(): void
    {
        $this->actingAsRole('super_admin');
        [$grant, $code] = $this->grantWithCode(['all_documents_access' => true]);
        $this->sessionToken($grant);

        $this->postJson($this->admin."/grants/{$grant->id}/status", ['status' => 'revoked'])->assertOk();
        $this->assertDatabaseCount('dataroom_sessions', 0);

        // Reactivating, extending or reissuing a revoked grant are all refused.
        // The answer to "we revoked the wrong investor" is a new grant, so a
        // revoked code can never come back to life.
        $this->postJson($this->admin."/grants/{$grant->id}/status", ['status' => 'active'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'A revoked grant cannot be reactivated. Issue a new grant instead.');

        $this->postJson($this->admin."/grants/{$grant->id}/extend", ['duration' => '7d'])->assertStatus(422);
        $this->postJson($this->admin."/grants/{$grant->id}/regenerate")->assertStatus(422);

        $this->assertSame('revoked', $grant->fresh()->effectiveStatus());
        $this->postJson($this->api.'/dataroom/authenticate', ['email' => 'amina@examplevc.com', 'code' => $code])
            ->assertStatus(401);
    }

    public function test_extending_an_expired_grant_brings_it_back_with_no_scheduler(): void
    {
        $this->actingAsRole('super_admin');
        [$grant, $code] = $this->grantWithCode(['all_documents_access' => true, 'expires_at' => now()->subDay()]);

        $this->assertSame('expired', $grant->effectiveStatus());
        $this->postJson($this->api.'/dataroom/authenticate', ['email' => 'amina@examplevc.com', 'code' => $code])
            ->assertStatus(401);

        $this->postJson($this->admin."/grants/{$grant->id}/extend", ['duration' => '7d'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        // effectiveStatus() recomputes from the new date; nothing had to run.
        $this->postJson($this->api.'/dataroom/authenticate', ['email' => 'amina@examplevc.com', 'code' => $code])
            ->assertOk();
    }

    public function test_an_exhausted_grant_is_reported_as_exhausted_not_active(): void
    {
        $this->actingAsRole('super_admin');
        [$grant] = $this->grantWithCode(['all_documents_access' => true, 'max_uses' => 1]);
        $grant->update(['current_uses' => 1]);

        $this->getJson($this->admin."/grants/{$grant->id}")
            ->assertOk()
            // The stored column still says active. The derived status is what the
            // authorization layer will act on, so both are surfaced.
            ->assertJsonPath('data.storedStatus', 'active')
            ->assertJsonPath('data.status', 'exhausted');
    }

    public function test_deleting_a_grant_archives_it_and_keeps_the_trail(): void
    {
        $this->actingAsRole('super_admin');
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $this->sessionToken($grant);

        $this->deleteJson($this->admin."/grants/{$grant->id}")->assertOk();

        $this->assertDatabaseCount('dataroom_sessions', 0);
        $this->assertSoftDeleted('dataroom_access_grants', ['id' => $grant->id]);
        $this->assertDatabaseHas('dataroom_audit_logs', [
            'access_grant_id' => $grant->id,
            'action' => 'admin_revoked_access_grant',
            'details' => 'archived',
        ]);
    }

    // -- settings ----------------------------------------------------------

    public function test_the_settings_payload_never_carries_the_pin_hash(): void
    {
        $this->actingAsRole('super_admin');
        $this->settings()->update(['global_pin_enabled' => true, 'global_pin_hash' => Hash::make('open-sesame')]);

        $body = $this->getJson($this->admin.'/settings')->assertOk()->getContent();

        $this->assertStringNotContainsString('open-sesame', $body);
        $this->assertStringNotContainsString('$2y$', $body);
        $this->assertStringNotContainsString('global_pin_hash', $body);
        // The screen only needs to know a PIN is configured.
        $this->assertTrue($this->getJson($this->admin.'/settings')->json('data.globalPinConfigured'));
    }

    public function test_setting_a_pin_stores_only_its_hash(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson($this->admin.'/settings', [
            'global_pin_enabled' => true,
            'global_pin' => 'open-sesame',
        ])->assertOk()->assertJsonPath('data.globalPinConfigured', true);

        $hash = DataRoomSetting::current()->global_pin_hash;
        $this->assertNotSame('open-sesame', $hash);
        $this->assertTrue(Hash::check('open-sesame', $hash));

        // The plaintext is not echoed back into the audit trail either.
        $log = DataRoomAuditLog::where('action', 'admin_updated_settings')->firstOrFail();
        $this->assertStringContainsString('global_pin: rotated', (string) $log->details);

        foreach (DataRoomAuditLog::all() as $entry) {
            $this->assertStringNotContainsString('open-sesame', (string) $entry->details);
        }
    }

    public function test_turning_the_pin_gate_off_clears_the_stored_secret(): void
    {
        $this->actingAsRole('super_admin');
        $this->settings()->update(['global_pin_enabled' => true, 'global_pin_hash' => Hash::make('open-sesame')]);

        $this->patchJson($this->admin.'/settings', ['global_pin_enabled' => false])->assertOk();

        // A disabled switch must not leave a live secret at rest that nobody is
        // watching, and that a later re-enable would silently resurrect.
        $this->assertNull(DataRoomSetting::current()->global_pin_hash);
    }

    public function test_a_short_pin_is_refused(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson($this->admin.'/settings', ['global_pin_enabled' => true, 'global_pin' => '123'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['global_pin']);
    }

    public function test_disabling_audit_logging_is_itself_audited(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson($this->admin.'/settings', ['audit_logging_enabled' => false])->assertOk();

        // On the always-logged list. An admin cannot use the switch to work
        // unobserved, because flipping it is the first thing recorded.
        $this->assertDatabaseHas('dataroom_audit_logs', ['action' => 'admin_updated_settings']);

        // And the next settings change is still recorded while logging is off.
        $before = DataRoomAuditLog::count();
        $this->patchJson($this->admin.'/settings', ['downloads_enabled' => false])->assertOk();
        $this->assertSame($before + 1, DataRoomAuditLog::count());

        // Routine visitor activity, by contrast, genuinely stops being logged.
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $doc = $this->document();
        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $this->visitorHeaders($this->sessionToken($grant)))->assertOk();
        $this->assertDatabaseMissing('dataroom_audit_logs', ['action' => 'viewed_document']);
    }

    public function test_the_settings_screen_shows_where_the_environment_overrides_the_admin(): void
    {
        $this->actingAsRole('super_admin');
        config(['dataroom.idle_timeout' => 10, 'dataroom.antivirus.enabled' => false]);

        $response = $this->patchJson($this->admin.'/settings', ['session_timeout_minutes' => 120])->assertOk();

        // The admin asked for 120 minutes; the config ceiling is 10. Both are
        // surfaced so the discrepancy is visible rather than mysterious.
        $response->assertJsonPath('data.sessionTimeoutMinutes', 120);
        $response->assertJsonPath('data.effectiveIdleTimeoutMinutes', 10);
        $response->assertJsonPath('data.environment.malwareScanning', false);
    }

    // -- emergency controls ------------------------------------------------

    /** @return array<string,array{0:string,1:string}> */
    public static function emergencyActions(): array
    {
        return [
            'lock room' => ['lock_room', 'LOCK DATA ROOM'],
            'revoke all sessions' => ['revoke_all_sessions', 'REVOKE ALL SESSIONS'],
            'disable all downloads' => ['disable_all_downloads', 'DISABLE ALL DOWNLOADS'],
            'disable all grants' => ['disable_all_grants', 'DISABLE ALL ACCESS GRANTS'],
        ];
    }

    #[DataProvider('emergencyActions')]
    public function test_an_emergency_action_needs_its_exact_confirmation_phrase(string $action, string $phrase): void
    {
        $this->actingAsRole('super_admin');
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $token = $this->sessionToken($grant);

        foreach (['', 'yes', strtolower($phrase), $phrase.' NOW', 'LOCK ROOM'] as $wrong) {
            $this->postJson($this->admin.'/emergency', ['action' => $action, 'confirmation' => $wrong])
                ->assertStatus(422);
        }

        // Nothing happened while the phrase was wrong.
        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertOk();
        $this->assertDatabaseCount('dataroom_sessions', 1);

        // Surrounding whitespace is forgiven; the phrase itself is not.
        $this->postJson($this->admin.'/emergency', ['action' => $action, 'confirmation' => '  '.$phrase.' '])
            ->assertOk();
    }

    public function test_locking_the_room_closes_it_and_destroys_live_sessions(): void
    {
        $this->actingAsRole('super_admin');
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $token = $this->sessionToken($grant);

        $this->postJson($this->admin.'/emergency', ['action' => 'lock_room', 'confirmation' => 'LOCK DATA ROOM'])
            ->assertOk()
            ->assertJsonPath('data.sessionsDestroyed', 1)
            ->assertJsonPath('data.policy.emergencyLockdown', true)
            ->assertJsonPath('data.policy.openToVisitors', false);

        // A lockdown that leaves live sessions running is not a lockdown. The
        // closed-room check answers before the token is even looked at, so this
        // is 403 rather than the 401 a destroyed session alone would give.
        $this->getJson($this->api.'/dataroom/me', $this->visitorHeaders($token))->assertStatus(403);
        $this->assertDatabaseCount('dataroom_sessions', 0);
        $this->getJson($this->api.'/dataroom/gate')->assertJsonPath('data.open', false);

        $this->postJson($this->admin.'/emergency', ['action' => 'unlock_room', 'confirmation' => 'UNLOCK DATA ROOM'])
            ->assertOk()
            ->assertJsonPath('data.policy.openToVisitors', true);

        $this->assertSame(2, DataRoomAuditLog::where('action', 'emergency_lockdown')->count());
    }

    public function test_disabling_all_grants_suspends_them_reversibly(): void
    {
        $this->actingAsRole('super_admin');
        [$active] = $this->grantWithCode(['all_documents_access' => true]);
        [$revoked] = $this->grantWithCode(['visitor_email' => 'b@fund.com', 'status' => 'revoked']);

        $this->postJson($this->admin.'/emergency', ['action' => 'disable_all_grants', 'confirmation' => 'DISABLE ALL ACCESS GRANTS'])
            ->assertOk()
            ->assertJsonPath('data.grantsSuspended', 1);

        // Suspended, not revoked, because the trigger is often a false alarm and
        // revocation is terminal.
        $this->assertSame('suspended', $active->fresh()->status);
        // A grant that was already revoked stays revoked; it is not resurrected
        // into a suspended state that could later be reactivated.
        $this->assertSame('revoked', $revoked->fresh()->status);
    }

    public function test_disabling_all_downloads_is_enforced_on_the_visitor_side(): void
    {
        $this->actingAsRole('super_admin');
        $doc = $this->document();
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);

        $this->postJson($this->admin.'/emergency', ['action' => 'disable_all_downloads', 'confirmation' => 'DISABLE ALL DOWNLOADS'])
            ->assertOk();

        $headers = $this->visitorHeaders($this->sessionToken($grant));
        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $headers)
            ->assertOk()
            ->assertJsonPath('data.downloadPermitted', false);
        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}/download", $headers)->assertStatus(403);
    }

    public function test_an_unknown_emergency_action_is_rejected_by_validation(): void
    {
        $this->actingAsRole('super_admin');

        $this->postJson($this->admin.'/emergency', ['action' => 'delete_everything', 'confirmation' => 'YES'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['action']);
    }

    // -- folders -----------------------------------------------------------

    public function test_a_folder_cannot_be_deleted_while_it_still_holds_documents(): void
    {
        $this->actingAsRole('super_admin');
        $folder = $this->folder();
        $doc = $this->document(['folder_id' => $folder->id]);

        // Cascading would take the folder-level grants with it and quietly
        // change who can see what.
        $this->deleteJson($this->admin."/folders/{$folder->id}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'This category still holds 1 document(s). Move or delete them first.');

        // A soft-deleted document still counts, because restoring it later would
        // otherwise land it in a folder that no longer exists.
        $doc->delete();
        $this->deleteJson($this->admin."/folders/{$folder->id}")->assertStatus(422);

        $doc->forceDelete();
        $this->deleteJson($this->admin."/folders/{$folder->id}")->assertOk();
        $this->assertDatabaseMissing('dataroom_folders', ['id' => $folder->id]);
    }

    public function test_folder_slugs_are_unique_without_relying_on_a_database_error(): void
    {
        $this->actingAsRole('super_admin');

        $first = $this->postJson($this->admin.'/folders', ['name' => '02 Financials & Models'])->assertStatus(201)->json('data.slug');
        $second = $this->postJson($this->admin.'/folders', ['name' => '02 Financials & Models'])->assertStatus(201)->json('data.slug');

        $this->assertNotSame($first, $second);
        $this->assertSame($first.'-2', $second);
    }

    public function test_the_folder_structure_is_data_not_code(): void
    {
        $this->actingAsRole('super_admin');

        // The spec names five starting categories and lists 06-12 as future
        // work. Nothing may assume a fixed set or count.
        foreach (['06 Market & Competition', '07 Legal', '12 Archive'] as $i => $name) {
            $this->postJson($this->admin.'/folders', ['name' => $name, 'sort_order' => 60 + $i])->assertStatus(201);
        }

        $this->getJson($this->admin.'/folders')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_reordering_folders_writes_the_given_order(): void
    {
        $this->actingAsRole('super_admin');
        $a = $this->folder('01 Corporate Governance', 10);
        $b = $this->folder('02 Financials & Models', 20);

        $this->postJson($this->admin.'/folders/reorder', ['order' => [
            ['id' => $a->id, 'sort_order' => 90],
            ['id' => $b->id, 'sort_order' => 10],
        ]])->assertOk();

        $names = collect($this->getJson($this->admin.'/folders')->json('data'))->pluck('name')->all();
        $this->assertSame(['02 Financials & Models', '01 Corporate Governance'], $names);
    }

    // -- documents ---------------------------------------------------------

    private function pdfUpload(string $name = 'financial-model.pdf'): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'vdr').'.pdf';
        file_put_contents($path, "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");

        return new UploadedFile($path, $name, 'application/pdf', null, true);
    }

    public function test_an_uploaded_document_starts_as_a_draft_and_records_its_first_version(): void
    {
        Storage::fake('dataroom');
        config(['dataroom.storage_disk' => 'dataroom']);
        $this->actingAsRole('super_admin');

        $folder = $this->folder();

        $response = $this->post($this->admin.'/documents', [
            'file' => $this->pdfUpload(),
            'title' => 'Financial Model',
            'folder_id' => $folder->id,
            'confidentiality_level' => 'highly_confidential',
        ], ['Accept' => 'application/json'])->assertStatus(201);

        // Publishing is a separate, deliberate act. A half-checked document must
        // not appear in an investor's view because someone uploaded it.
        $response->assertJsonPath('data.status', 'draft');
        // Reported honestly rather than claiming a scan that did not run.
        $response->assertJsonPath('meta.malwareScanned', false);

        $doc = DataRoomDocument::firstOrFail();
        $this->assertSame(64, strlen($doc->checksum));
        Storage::disk('dataroom')->assertExists($doc->file_path);
        // The generated path, not the client's filename.
        $this->assertStringNotContainsString('financial-model', $doc->file_path);
        $this->assertSame('financial-model.pdf', $doc->original_filename);

        $this->assertDatabaseHas('dataroom_document_versions', [
            'document_id' => $doc->id,
            'version' => '1.0',
            'change_notes' => 'Initial upload',
        ]);
        $this->assertDatabaseHas('dataroom_audit_logs', [
            'action' => 'admin_uploaded_document',
            'details' => 'malware scan: not configured',
        ]);

        // Invisible to a full-access visitor until it is published.
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $headers = $this->visitorHeaders($this->sessionToken($grant));
        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $headers)->assertStatus(404);

        $this->patchJson($this->admin."/documents/{$doc->id}", ['status' => 'published'])->assertOk();
        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $headers)->assertOk();
    }

    public function test_a_rejected_upload_is_audited_and_creates_no_document(): void
    {
        Storage::fake('dataroom');
        config(['dataroom.storage_disk' => 'dataroom']);
        $this->actingAsRole('super_admin');

        $path = tempnam(sys_get_temp_dir(), 'vdr');
        file_put_contents($path, "<?php system(\$_GET['c']); ?>");

        $this->post($this->admin.'/documents', [
            'file' => new UploadedFile($path, 'invoice.pdf', 'application/pdf', null, true),
            'title' => 'Invoice',
            'confidentiality_level' => 'confidential',
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'The file contents do not match its extension.');

        $this->assertDatabaseCount('dataroom_documents', 0);
        $this->assertSame([], Storage::disk('dataroom')->allFiles());
        $this->assertDatabaseHas('dataroom_audit_logs', ['action' => 'admin_upload_rejected']);
    }

    public function test_a_new_version_supersedes_the_current_bytes_without_destroying_the_old_ones(): void
    {
        Storage::fake('dataroom');
        config(['dataroom.storage_disk' => 'dataroom']);
        $this->actingAsRole('super_admin');

        $id = $this->post($this->admin.'/documents', [
            'file' => $this->pdfUpload(),
            'title' => 'Financial Model',
            'confidentiality_level' => 'confidential',
        ], ['Accept' => 'application/json'])->assertStatus(201)->json('data.id');

        $first = DataRoomDocument::findOrFail($id)->file_path;

        $this->post($this->admin."/documents/{$id}/versions", [
            'file' => $this->pdfUpload('financial-model-v2.pdf'),
            'version' => '2.0',
            'change_notes' => 'Revised Q4 assumptions.',
        ], ['Accept' => 'application/json'])->assertStatus(201);

        $doc = DataRoomDocument::findOrFail($id);
        $this->assertSame('2.0', $doc->version);
        $this->assertNotSame($first, $doc->file_path);

        // Both sets of bytes survive, so a question about what an investor
        // actually saw in v1.0 can still be answered.
        Storage::disk('dataroom')->assertExists($first);
        Storage::disk('dataroom')->assertExists($doc->file_path);
        $this->assertSame(2, DataRoomDocumentVersion::where('document_id', $id)->count());

        // A duplicate label would make the history ambiguous.
        $this->post($this->admin."/documents/{$id}/versions", [
            'file' => $this->pdfUpload(),
            'version' => '2.0',
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'That version label already exists for this document.');
    }

    public function test_a_soft_deleted_document_disappears_from_visitors_and_can_be_restored(): void
    {
        $this->actingAsRole('super_admin');
        $doc = $this->document();
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $headers = $this->visitorHeaders($this->sessionToken($grant));

        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $headers)->assertOk();

        $this->deleteJson($this->admin."/documents/{$doc->id}")
            ->assertOk()
            ->assertJsonPath('data.purged', false);

        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $headers)->assertStatus(404);
        $this->assertSoftDeleted('dataroom_documents', ['id' => $doc->id]);

        $this->postJson($this->admin."/documents/{$doc->id}/restore")->assertOk();
        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $headers)->assertOk();
    }

    public function test_purging_a_document_removes_every_version_from_disk(): void
    {
        Storage::fake('dataroom');
        config(['dataroom.storage_disk' => 'dataroom']);
        $this->actingAsRole('super_admin');

        $id = $this->post($this->admin.'/documents', [
            'file' => $this->pdfUpload(),
            'title' => 'Financial Model',
            'confidentiality_level' => 'confidential',
        ], ['Accept' => 'application/json'])->assertStatus(201)->json('data.id');

        $this->post($this->admin."/documents/{$id}/versions", [
            'file' => $this->pdfUpload(),
            'version' => '2.0',
        ], ['Accept' => 'application/json'])->assertStatus(201);

        $this->assertCount(2, Storage::disk('dataroom')->files('documents'));

        $this->deleteJson($this->admin."/documents/{$id}?purge=1")
            ->assertOk()
            ->assertJsonPath('data.purged', true);

        // Orphaned bytes on a private disk are still a disclosure risk.
        $this->assertSame([], Storage::disk('dataroom')->files('documents'));
        $this->assertDatabaseCount('dataroom_documents', 0);
        $this->assertDatabaseHas('dataroom_audit_logs', [
            'action' => 'admin_deleted_document',
            'details' => 'purged bytes and record',
        ]);
    }

    public function test_the_admin_preview_streams_from_the_private_disk(): void
    {
        Storage::fake('dataroom');
        config(['dataroom.storage_disk' => 'dataroom']);
        $this->actingAsRole('super_admin');

        $id = $this->post($this->admin.'/documents', [
            'file' => $this->pdfUpload(),
            'title' => 'Financial Model',
            'confidentiality_level' => 'confidential',
        ], ['Accept' => 'application/json'])->assertStatus(201)->json('data.id');

        $response = $this->get($this->admin."/documents/{$id}/preview")->assertOk();

        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertSame('noindex, nofollow, noarchive', $response->headers->get('X-Robots-Tag'));
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $this->assertDatabaseHas('dataroom_audit_logs', ['action' => 'admin_previewed_document']);

        // A document whose bytes are gone reports that, rather than a stack trace
        // or a path.
        $missing = $this->document();
        $this->getJson($this->admin."/documents/{$missing->id}/preview")
            ->assertStatus(404)
            ->assertJsonPath('message', 'The stored file for this document is missing.');
    }

    public function test_no_admin_document_payload_carries_the_storage_path(): void
    {
        Storage::fake('dataroom');
        config(['dataroom.storage_disk' => 'dataroom']);
        $this->actingAsRole('super_admin');

        $id = $this->post($this->admin.'/documents', [
            'file' => $this->pdfUpload(),
            'title' => 'Financial Model',
            'confidentiality_level' => 'confidential',
        ], ['Accept' => 'application/json'])->assertStatus(201)->json('data.id');

        $path = DataRoomDocument::findOrFail($id)->file_path;

        // Even an authorized admin has no reason to learn the storage layout, and
        // a leaked path in an admin bundle is a leaked path.
        foreach (['/documents', "/documents/{$id}"] as $route) {
            $body = (string) $this->getJson($this->admin.$route)->assertOk()->getContent();
            $this->assertStringNotContainsString($path, $body);
            $this->assertStringNotContainsString('file_path', $body);
        }
    }

    // -- the audit trail ---------------------------------------------------

    public function test_the_audit_trail_has_no_write_endpoint(): void
    {
        $this->actingAsRole('super_admin');
        // Issued through the API so the row is a real trail entry, not a fixture.
        $this->postJson($this->admin.'/grants', $this->grantPayload())->assertStatus(201);
        $log = DataRoomAuditLog::where('action', 'admin_created_access_grant')->firstOrFail();

        // A trail an administrator can groom is not evidence. There is no route
        // to edit or remove a row, so every verb but GET must fail to match.
        foreach ([['patch', ''], ['put', ''], ['delete', ''], ['post', ''],
            ['patch', "/{$log->id}"], ['delete', "/{$log->id}"], ['put', "/{$log->id}"]] as [$verb, $suffix]) {
            $status = $this->json($verb, $this->admin.'/audit-logs'.$suffix)->status();
            $this->assertContains($status, [404, 405], "{$verb} /audit-logs{$suffix} returned {$status}.");
        }

        $this->assertDatabaseHas('dataroom_audit_logs', ['id' => $log->id]);
    }

    public function test_the_audit_log_filters_narrow_without_dropping_rows(): void
    {
        $this->actingAsRole('super_admin');
        $doc = $this->document();

        [$mine] = $this->grantWithCode(['all_documents_access' => true, 'organization' => 'Example Ventures']);
        [$theirs] = $this->grantWithCode(['visitor_email' => 'other@fund.com', 'organization' => 'Other Capital', 'all_documents_access' => true]);

        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $this->visitorHeaders($this->sessionToken($mine)))->assertOk();
        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $this->visitorHeaders($this->sessionToken($theirs)))->assertOk();
        $this->postJson($this->api.'/dataroom/authenticate', ['email' => 'amina@examplevc.com', 'code' => 'WRONG-CODE'])->assertStatus(401);

        $count = fn (string $query) => count($this->getJson($this->admin.'/audit-logs?'.$query)->assertOk()->json('data'));

        $this->assertSame(2, $count('action=viewed_document'));
        $this->assertSame(1, $count('grant_id='.$mine->id));
        $this->assertSame(1, $count('email=other@fund.com'));
        $this->assertSame(1, $count('organization=Example'));
        $this->assertSame(2, $count('document_id='.$doc->id));

        // The failure lane is the one an operator reaches for after an incident.
        $failures = $this->getJson($this->admin.'/audit-logs?outcome=failure')->assertOk()->json('data');
        $this->assertNotEmpty($failures);
        foreach ($failures as $row) {
            $this->assertContains(
                $row['action'],
                ['authentication_failed', 'authentication_failed_inactive', 'access_denied', 'download_denied'],
                "Action {$row['action']} was filed under failures."
            );
        }

        // And the success lane is its complement, not a copy of the whole table.
        $this->assertSame(
            $count(''),
            $count('outcome=failure') + $count('outcome=success')
        );

        // A window that excludes everything returns nothing rather than everything.
        $this->assertSame(0, $count('from='.now()->addDay()->toDateString()));
        $this->assertGreaterThan(0, $count('from='.now()->subDay()->toDateString().'&to='.now()->addDay()->toDateString()));
    }

    // -- templates ---------------------------------------------------------

    public function test_a_template_seeds_a_grant_and_explicit_fields_still_win(): void
    {
        $this->actingAsRole('super_admin');
        $folder = $this->folder();
        $seeded = $this->document(['folder_id' => $folder->id, 'title' => 'Deck']);

        $template = $this->postJson($this->admin.'/templates', [
            'name' => 'Bank Partner',
            'description' => 'Governance and financials only.',
            'document_ids' => [$seeded->id],
            'downloads_permitted' => false,
            'default_duration_days' => 7,
        ])->assertStatus(201)->json('data');

        $this->assertSame([$seeded->id], $template['documentIds']);

        // Applied as-is.
        $first = $this->postJson($this->admin.'/grants', [
            'visitor_name' => 'Amina Yusuf',
            'visitor_email' => 'amina@examplevc.com',
            'template_id' => $template['id'],
        ])->assertStatus(201)->json('data.grant');

        $this->assertFalse($first['downloadsPermitted']);
        $this->assertSame([$seeded->id], DataRoomAccessGrant::findOrFail($first['id'])->documents()->pluck('dataroom_documents.id')->all());

        // Overridden at the review step.
        $second = $this->postJson($this->admin.'/grants', [
            'visitor_name' => 'Bola Ade',
            'visitor_email' => 'b@fund.com',
            'template_id' => $template['id'],
            'downloads_permitted' => true,
            'document_ids' => [],
            'folder_ids' => [$folder->id],
        ])->assertStatus(201)->json('data.grant');

        $grant = DataRoomAccessGrant::findOrFail($second['id']);
        $this->assertTrue($second['downloadsPermitted']);
        $this->assertSame([$folder->id], $grant->folders()->pluck('dataroom_folders.id')->all());
        $this->assertSame([], $grant->documents()->pluck('dataroom_documents.id')->all());
    }

    public function test_editing_or_deleting_a_template_never_moves_an_existing_grants_scope(): void
    {
        $this->actingAsRole('super_admin');
        $narrow = $this->document(['title' => 'Deck']);
        $wide = $this->document(['title' => 'Cap Table']);

        $template = $this->postJson($this->admin.'/templates', [
            'name' => 'Advisor',
            'document_ids' => [$narrow->id],
        ])->assertStatus(201)->json('data');

        $grantId = $this->postJson($this->admin.'/grants', [
            'visitor_name' => 'Amina Yusuf',
            'visitor_email' => 'amina@examplevc.com',
            'template_id' => $template['id'],
        ])->assertStatus(201)->json('data.grant.id');

        // Widening the template must not retroactively widen a credential that is
        // already in someone's inbox.
        $this->patchJson($this->admin."/templates/{$template['id']}", [
            'document_ids' => [$narrow->id, $wide->id],
            'all_documents_access' => true,
        ])->assertOk();

        $grant = DataRoomAccessGrant::findOrFail($grantId);
        $this->assertSame([$narrow->id], $grant->documents()->pluck('dataroom_documents.id')->all());
        $this->assertFalse((bool) $grant->all_documents_access);

        // And deleting it must not narrow one either.
        $this->deleteJson($this->admin."/templates/{$template['id']}")->assertOk();

        $this->assertSame([$narrow->id], $grant->fresh()->documents()->pluck('dataroom_documents.id')->all());
        $this->assertDatabaseHas('dataroom_audit_logs', ['action' => 'admin_deleted_access_template', 'details' => 'Advisor']);
    }

    public function test_a_duplicate_template_name_is_refused(): void
    {
        $this->actingAsRole('super_admin');

        $this->postJson($this->admin.'/templates', ['name' => 'VC Investor'])->assertStatus(201);
        $this->postJson($this->admin.'/templates', ['name' => 'VC Investor'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    // -- the matrix cannot drift from the authorizer ------------------------

    public function test_every_matrix_cell_matches_what_the_authorizer_decides(): void
    {
        $this->actingAsRole('super_admin');

        $governance = $this->folder('01 Corporate Governance', 10);
        $financials = $this->folder('02 Financials & Models', 20);

        $documents = [
            $this->document(['folder_id' => $governance->id, 'title' => 'Articles']),
            $this->document(['folder_id' => $governance->id, 'title' => 'Cap Table', 'downloads_permitted' => false]),
            $this->document(['folder_id' => $financials->id, 'title' => 'Financial Model']),
            $this->document(['folder_id' => $financials->id, 'title' => 'Draft Budget', 'status' => 'draft']),
            $this->document(['folder_id' => null, 'title' => 'Loose Memo']),
        ];

        // Every shape of grant the wizard can produce, so the comparison covers
        // all four `via` branches and the download vetoes.
        [$all] = $this->grantWithCode(['visitor_email' => 'all@fund.com', 'all_documents_access' => true]);
        [$byFolder] = $this->grantWithCode(['visitor_email' => 'folder@fund.com']);
        $byFolder->folders()->attach($governance->id, ['can_download' => true]);
        [$byDocument] = $this->grantWithCode(['visitor_email' => 'doc@fund.com']);
        $byDocument->documents()->attach($documents[2]->id, ['can_download' => false, 'can_print' => true]);
        [$tightened] = $this->grantWithCode(['visitor_email' => 'tight@fund.com']);
        $tightened->folders()->attach($financials->id, ['can_download' => true]);
        $tightened->documents()->attach($documents[2]->id, ['can_download' => false, 'can_print' => false]);
        [$noDownloads] = $this->grantWithCode(['visitor_email' => 'nodl@fund.com', 'all_documents_access' => true, 'downloads_permitted' => false]);
        [$suspended] = $this->grantWithCode(['visitor_email' => 'dead@fund.com', 'all_documents_access' => true, 'status' => 'suspended']);
        [$unscoped] = $this->grantWithCode(['visitor_email' => 'none@fund.com']);

        $grants = [$all, $byFolder, $byDocument, $tightened, $noDownloads, $suspended, $unscoped];
        $authorizer = app(DataRoomAuthorizer::class);

        $rows = $this->getJson($this->admin.'/permission-matrix')->assertOk()->json('data.rows');
        $this->assertCount(count($documents), $rows);

        $cells = 0;

        foreach ($rows as $row) {
            $doc = DataRoomDocument::findOrFail($row['documentId']);

            foreach ($row['cells'] as $cell) {
                $grant = collect($grants)->firstWhere('id', $cell['grantId']);
                $this->assertNotNull($grant, "Matrix names an unknown grant {$cell['grantId']}.");

                // The admin UI reads this matrix to decide what to show. If a cell
                // disagreed with the authorizer, the UI would advertise access the
                // server refuses, or hide access it actually allows.
                $this->assertSame(
                    $authorizer->canAccess($grant, $doc),
                    $cell['canView'],
                    "canView drifted for grant {$grant->id} on document {$doc->id} ({$doc->title})."
                );
                $this->assertSame(
                    $authorizer->canDownload($grant, $doc),
                    $cell['canDownload'],
                    "canDownload drifted for grant {$grant->id} on document {$doc->id} ({$doc->title})."
                );

                $cells++;
            }
        }

        // Guard against a vacuous pass: the matrix really did contain every pair.
        $this->assertSame(count($documents) * count($grants), $cells);
    }

    public function test_the_matrix_moves_with_the_global_download_switch(): void
    {
        $this->actingAsRole('super_admin');
        $doc = $this->document();
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);

        $cell = fn () => $this->getJson($this->admin.'/permission-matrix')->assertOk()->json('data.rows.0.cells.0');

        $this->assertTrue($cell()['canDownload']);

        $this->postJson($this->admin.'/emergency', [
            'action' => 'disable_all_downloads',
            'confirmation' => 'DISABLE ALL DOWNLOADS',
        ])->assertOk();

        // Same pivot rows, different answer, because the global veto is part of
        // the decision and not a separate frontend concern.
        $this->assertFalse($cell()['canDownload']);
        $this->assertSame('all', $cell()['via']);
        $this->assertTrue($cell()['canView']);
    }
}
