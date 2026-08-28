<?php

namespace Tests\Eval;

use App\Models\DataRoomDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\Concerns\BuildsDataRoom;
use Tests\TestCase;

/**
 * Capture step of the data room eval lane.
 *
 * This produces the corpus, not the verdict. It drives the real API and writes
 * every response an outsider, a visitor or an operator can obtain to
 * evals/data-room/captures/. evals/data-room/run.php then hands each capture to
 * local Claude Code with a rubric and scores it.
 *
 * The split exists because the two halves live in different machine spaces.
 * Producing the payloads is deterministic: same request, same bytes, no model
 * involved. Judging "does this text tell an attacker which investors exist" is
 * a reading task, so it goes to the model, once, over a fixed corpus.
 *
 * Not part of the gate lane. Run it with:
 *   php artisan test --configuration=phpunit.eval.xml
 */
class DataRoomEvalCaptureTest extends TestCase
{
    use BuildsDataRoom, RefreshDatabase;

    /** Where the corpus lands. Relative to the repository root. */
    private const OUT = __DIR__.'/../../../evals/data-room/captures';

    /** @var array<string,mixed> */
    private array $captures = [];

    public function test_it_captures_every_visitor_and_operator_facing_payload(): void
    {
        $governance = $this->folder('01 Corporate Governance', 10);
        $financials = $this->folder('02 Financials & Models', 20);

        $articles = $this->document(['folder_id' => $governance->id, 'title' => 'Articles of Association']);
        $model = $this->document([
            'folder_id' => $financials->id,
            'title' => 'Financial Model',
            'description' => 'Five-year operating model. Revenue build, unit economics, hiring plan.',
            'start_here_order' => 1,
        ]);
        $capTable = $this->document([
            'folder_id' => $governance->id,
            'title' => 'Cap Table',
            'description' => 'Shareholding by class, including the ESOP pool and the SAFE conversion waterfall.',
        ]);

        [$grant, $code] = $this->grantWithCode(['organization' => 'Example Ventures']);
        $grant->folders()->attach($financials->id, ['can_download' => true]);
        $grant->documents()->attach($articles->id, ['can_download' => false, 'can_print' => false]);

        // -- what an unauthenticated stranger can see --------------------------

        $this->capture('gate.open_room', $this->getJson($this->api.'/dataroom/gate'));

        $this->settings()->update(['enabled' => false]);
        $this->capture('gate.closed_room', $this->getJson($this->api.'/dataroom/gate'));
        // A closed room must still refuse without hinting that the credential
        // itself was good, so the same valid pair is replayed against it.
        $this->capture('gate.closed_room_authenticate', $this->postJson($this->api.'/dataroom/authenticate', [
            'email' => 'amina@examplevc.com', 'code' => $code,
        ]));
        $this->settings()->update(['enabled' => true]);

        $this->settings()->update(['global_pin_enabled' => true, 'global_pin_hash' => Hash::make('open-sesame')]);
        $this->capture('gate.pin_wrong', $this->postJson($this->api.'/dataroom/authenticate', [
            'email' => 'amina@examplevc.com', 'code' => $code, 'pin' => 'not-the-pin',
        ]));
        $this->capture('gate.pin_required', $this->getJson($this->api.'/dataroom/gate'));
        $this->settings()->update(['global_pin_enabled' => false, 'global_pin_hash' => null]);

        // The rejection reasons, side by side. A judge reading them together must
        // not be able to tell which address or code exists.
        //
        // The throttle counts every one of these against the test's IP, and the
        // default ceiling is five, so the cache is cleared between groups. The
        // limiter's own response is captured deliberately below rather than being
        // allowed to leak into an unrelated case.
        $this->forgetThrottle();
        $this->capture('auth.unknown_email', $this->postJson($this->api.'/dataroom/authenticate', [
            'email' => 'stranger@example.com', 'code' => 'MTJ-AAAA-AAAA',
        ]));
        $this->capture('auth.known_email_wrong_code', $this->postJson($this->api.'/dataroom/authenticate', [
            'email' => 'amina@examplevc.com', 'code' => 'MTJ-AAAA-AAAA',
        ]));

        $revoked = $this->grantWithCode(['visitor_email' => 'revoked@fund.com', 'status' => 'revoked'])[0];
        $this->capture('auth.revoked_grant', $this->postJson($this->api.'/dataroom/authenticate', [
            'email' => $revoked->visitor_email, 'code' => 'MTJ-8F4K-92QX',
        ]));

        $expired = $this->grantWithCode(['visitor_email' => 'expired@fund.com', 'expires_at' => now()->subDay()])[0];
        $this->capture('auth.expired_grant', $this->postJson($this->api.'/dataroom/authenticate', [
            'email' => $expired->visitor_email, 'code' => 'MTJ-8F4K-92QX',
        ]));

        $suspended = $this->grantWithCode(['visitor_email' => 'suspended@fund.com', 'status' => 'suspended'])[0];
        $this->capture('auth.suspended_grant', $this->postJson($this->api.'/dataroom/authenticate', [
            'email' => $suspended->visitor_email, 'code' => 'MTJ-8F4K-92QX',
        ]));

        // Sixth attempt on the same IP. This is the lockout payload itself.
        $this->capture('auth.rate_limited', $this->postJson($this->api.'/dataroom/authenticate', [
            'email' => 'stranger@example.com', 'code' => 'MTJ-AAAA-AAAA',
        ]));

        $this->forgetThrottle();
        $this->capture('auth.validation_error', $this->postJson($this->api.'/dataroom/authenticate', []));
        $this->capture('auth.no_token', $this->getJson($this->api.'/dataroom/me'));
        $this->capture('auth.garbage_token', $this->getJson($this->api.'/dataroom/me', [
            'Authorization' => 'Bearer '.Str::random(64),
        ]));

        $this->forgetThrottle();
        // -- the authenticated visitor ----------------------------------------

        $success = $this->postJson($this->api.'/dataroom/authenticate', [
            'email' => 'amina@examplevc.com', 'code' => $code,
        ]);
        $this->capture('auth.success', $success);

        $headers = $this->visitorHeaders($success->json('data.token'));

        $this->capture('visitor.me', $this->getJson($this->api.'/dataroom/me', $headers));
        $this->capture('visitor.dashboard', $this->getJson($this->api.'/dataroom/dashboard', $headers));
        // Contains one accessible folder and one locked one, so the judge can
        // check that a locked card withholds its description.
        $this->capture('visitor.folders', $this->getJson($this->api.'/dataroom/folders', $headers));
        $this->capture('visitor.document_granted', $this->getJson($this->api."/dataroom/documents/{$model->uuid}", $headers));
        $this->capture('visitor.document_view_only', $this->getJson($this->api."/dataroom/documents/{$articles->uuid}", $headers));
        $this->capture('visitor.document_denied', $this->getJson($this->api."/dataroom/documents/{$capTable->uuid}", $headers));
        $this->capture('visitor.document_unknown', $this->getJson($this->api.'/dataroom/documents/'.Str::uuid(), $headers));
        $this->capture('visitor.download_denied', $this->getJson($this->api."/dataroom/documents/{$articles->uuid}/download", $headers));
        $this->capture('visitor.preview_missing_bytes', $this->getJson($this->api."/dataroom/documents/{$model->uuid}/preview", $headers));
        $this->capture('visitor.search_hit', $this->getJson($this->api.'/dataroom/search?q=Financial', $headers));
        $this->capture('visitor.search_withheld', $this->getJson($this->api.'/dataroom/search?q=Cap', $headers));
        $this->capture('visitor.activity', $this->getJson($this->api.'/dataroom/activity', $headers));
        $this->capture('visitor.acknowledge', $this->postJson($this->api.'/dataroom/acknowledge', [], $headers));

        // Session death, seen from the client side.
        $this->settings()->update(['emergency_lockdown' => true]);
        $this->capture('visitor.locked_down', $this->getJson($this->api.'/dataroom/dashboard', $headers));
        $this->settings()->update(['emergency_lockdown' => false]);

        $grant->update(['status' => 'suspended']);
        $this->capture('visitor.grant_suspended', $this->getJson($this->api.'/dataroom/dashboard', $headers));

        $this->captureOperatorSurface($model, $articles);

        $this->write();

        // A capture step that quietly produced nothing would make the eval pass
        // by default, so the corpus size is asserted here in the gate style.
        $this->assertGreaterThanOrEqual(50, count($this->captures));
        $this->assertFileExists(self::OUT.'/corpus.json');
    }

    /**
     * Everything an operator sees at /admin/data-room.
     *
     * This half of the corpus is judged against a different question. An operator
     * is allowed to know which investors exist, so the existence-disclosure rule
     * does not apply to them. What does apply is that the admin API must not hand
     * back a credential it already issued, a hash, or a storage path, and that
     * every irreversible control says what it will break before it is pressed.
     *
     * Two authorization refusals are captured first, from the outside in: no
     * Sanctum token at all, then a token holding the wrong data room permission.
     * Both are operator-audience cases, because the caller is an administrator
     * either way.
     */
    private function captureOperatorSurface(DataRoomDocument $model, DataRoomDocument $articles): void
    {
        $admin = $this->api.'/admin/dataroom';

        $this->capture('admin.unauthenticated', $this->getJson($admin.'/overview'));

        // Reading the room does not imply issuing access to it or moving the
        // policy. This is the 403 an operator with `data-room.view` actually sees.
        $this->actingAsWithPermissions(['data-room.view']);
        $this->capture('admin.forbidden_write_settings', $this->patchJson($admin.'/settings', ['downloads_enabled' => false]));
        $this->capture('admin.forbidden_list_grants', $this->getJson($admin.'/grants'));

        $this->actingAsWithPermissions([
            'data-room.view', 'data-room.upload', 'data-room.manage-documents',
            'data-room.manage-access', 'data-room.view-activity', 'data-room.manage-settings',
        ]);

        $this->capture('admin.overview', $this->getJson($admin.'/overview'));
        $this->capture('admin.analytics', $this->getJson($admin.'/analytics'));
        $this->capture('admin.audit_logs', $this->getJson($admin.'/audit-logs'));
        $this->capture('admin.settings', $this->getJson($admin.'/settings'));
        $this->capture('admin.folders', $this->getJson($admin.'/folders'));
        $this->capture('admin.documents', $this->getJson($admin.'/documents'));
        $this->capture('admin.document_show', $this->getJson($admin.'/documents/'.$model->id));
        $this->capture('admin.templates', $this->getJson($admin.'/templates'));
        $this->capture('admin.durations', $this->getJson($admin.'/grants/durations'));

        // The settings write. A PATCH that echoed nine unchanged fields back would
        // also be a nine-field audit row, so only the changed one is sent.
        $this->capture('admin.settings_patched', $this->patchJson($admin.'/settings', [
            'session_timeout_minutes' => 20,
        ]));
        // The PIN is write-only. This is the response that must not contain it.
        $this->capture('admin.settings_pin_set', $this->patchJson($admin.'/settings', [
            'global_pin_enabled' => true, 'global_pin' => 'open-sesame-2',
        ]));
        $this->patchJson($admin.'/settings', ['global_pin_enabled' => false]);

        // -- the grant lifecycle, which is a credential lifecycle --------------

        $this->capture('admin.grant_validation_error', $this->postJson($admin.'/grants', []));
        $this->capture('admin.grant_unscoped', $this->postJson($admin.'/grants', [
            'visitor_name' => 'Tunde Okafor',
            'visitor_email' => 'tunde@strategic.example',
            'duration' => '14d',
        ]));

        // The one response in the whole API that legitimately carries a plaintext
        // access code: the act of minting it for the operator who asked.
        $created = $this->postJson($admin.'/grants', [
            'visitor_name' => 'Tunde Okafor',
            'visitor_email' => 'Tunde@Strategic.Example',
            'organization' => 'Strategic Partner Ltd',
            'duration' => '14d',
            'document_ids' => [$articles->id],
            'document_permissions' => [
                ['document_id' => $articles->id, 'can_download' => false, 'can_print' => true],
            ],
        ]);
        $this->capture('admin.grant_created', $created);

        $newId = $created->json('data.grant.id');

        // Every read-back afterwards. The code is gone from all of them; only the
        // last four characters survive, as a hint for "which code did I send".
        $this->capture('admin.grant_show', $this->getJson($admin.'/grants/'.$newId));
        $this->capture('admin.grants_list', $this->getJson($admin.'/grants'));
        $this->capture('admin.permission_matrix', $this->getJson($admin.'/permission-matrix'));

        $this->capture('admin.grant_extended', $this->postJson($admin.'/grants/'.$newId.'/extend', ['duration' => '30d']));
        $this->capture('admin.grant_regenerated', $this->postJson($admin.'/grants/'.$newId.'/regenerate', []));
        $this->capture('admin.grant_suspended', $this->postJson($admin.'/grants/'.$newId.'/status', [
            'status' => 'suspended', 'reason' => 'Diligence paused at the visitor\'s request.',
        ]));
        $this->capture('admin.grant_revoked', $this->postJson($admin.'/grants/'.$newId.'/status', [
            'status' => 'revoked', 'reason' => 'Round closed.',
        ]));
        // Revocation is terminal in both directions: it cannot be undone and the
        // dead code cannot be reissued.
        $this->capture('admin.grant_reactivation_refused', $this->postJson($admin.'/grants/'.$newId.'/status', ['status' => 'active']));
        $this->capture('admin.grant_regenerate_refused', $this->postJson($admin.'/grants/'.$newId.'/regenerate', []));

        // -- the emergency controls -------------------------------------------

        $this->capture('admin.emergency_wrong_phrase', $this->postJson($admin.'/emergency', [
            'action' => 'lock_room', 'confirmation' => 'lock data room',
        ]));
        $this->capture('admin.emergency_locked', $this->postJson($admin.'/emergency', [
            'action' => 'lock_room', 'confirmation' => 'LOCK DATA ROOM',
        ]));
        $this->capture('admin.emergency_unlocked', $this->postJson($admin.'/emergency', [
            'action' => 'unlock_room', 'confirmation' => 'UNLOCK DATA ROOM',
        ]));
        $this->capture('admin.emergency_grants_suspended', $this->postJson($admin.'/emergency', [
            'action' => 'disable_all_grants', 'confirmation' => 'DISABLE ALL ACCESS GRANTS',
        ]));
    }

    /**
     * Drop the login throttle's counters.
     *
     * The limiter is keyed on the caller's IP, which every case in this file
     * shares, so without this the fifth failure would poison the sixth capture.
     * The cache store is `array` under this config, so nothing outside the test
     * process is touched.
     */
    private function forgetThrottle(): void
    {
        Cache::flush();
    }

    /** Record a response verbatim, including the status and the headers a client sees. */
    private function capture(string $name, \Illuminate\Testing\TestResponse $response): void
    {
        $this->captures[$name] = [
            'name' => $name,
            'status' => $response->status(),
            'headers' => [
                'Cache-Control' => $response->headers->get('Cache-Control'),
                'X-Robots-Tag' => $response->headers->get('X-Robots-Tag'),
            ],
            'body' => $this->decode($response->getContent()),
        ];
    }

    private function decode(string $content): mixed
    {
        $decoded = json_decode($content, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : ['raw' => $content];
    }

    private function write(): void
    {
        if (! is_dir(self::OUT)) {
            mkdir(self::OUT, 0755, true);
        }

        foreach (glob(self::OUT.'/*.json') as $stale) {
            unlink($stale);
        }

        foreach ($this->captures as $name => $capture) {
            file_put_contents(
                self::OUT.'/'.str_replace('.', '_', $name).'.json',
                json_encode($capture, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
            );
        }

        file_put_contents(
            self::OUT.'/corpus.json',
            json_encode([
                'capturedAt' => now()->toIso8601String(),
                'cases' => array_values($this->captures),
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
        );
    }
}
