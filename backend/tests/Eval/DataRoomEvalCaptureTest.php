<?php

namespace Tests\Eval;

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
 * every response an outsider or a visitor can obtain to
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

    public function test_it_captures_every_visitor_facing_payload(): void
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

        $this->write();

        // A capture step that quietly produced nothing would make the eval pass
        // by default, so the corpus size is asserted here in the gate style.
        $this->assertGreaterThanOrEqual(28, count($this->captures));
        $this->assertFileExists(self::OUT.'/corpus.json');
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
