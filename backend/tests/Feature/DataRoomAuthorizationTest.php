<?php

namespace Tests\Feature;

use App\Models\DataRoomDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Concerns\BuildsDataRoom;
use Tests\TestCase;

/**
 * Authorization gates on the visitor side.
 *
 * The rule under test throughout: the frontend lock is cosmetic, and the server
 * decides. Every case here reaches for a document the grant was not given and
 * asserts the server refuses regardless of what the client asks for.
 */
class DataRoomAuthorizationTest extends TestCase
{
    use BuildsDataRoom, RefreshDatabase;

    // -- read access -------------------------------------------------------

    public function test_a_single_document_grant_opens_that_document_and_nothing_else(): void
    {
        $folder = $this->folder();
        $mine = $this->document(['folder_id' => $folder->id, 'title' => 'Financial Model']);
        $theirs = $this->document(['folder_id' => $folder->id, 'title' => 'Cap Table']);

        [$grant] = $this->grantWithCode();
        $grant->documents()->attach($mine->id, ['can_download' => true, 'can_print' => false]);

        $headers = $this->visitorHeaders($this->sessionToken($grant));

        $this->getJson($this->api."/dataroom/documents/{$mine->uuid}", $headers)
            ->assertOk()
            ->assertJsonPath('data.title', 'Financial Model');

        // Same folder, one row apart, and still refused. A document grant does
        // not widen to its folder.
        $this->getJson($this->api."/dataroom/documents/{$theirs->uuid}", $headers)->assertStatus(404);
    }

    public function test_a_folder_grant_opens_documents_added_to_it_later(): void
    {
        $folder = $this->folder();
        [$grant] = $this->grantWithCode();
        $grant->folders()->attach($folder->id, ['can_download' => true]);

        // Created after the grant was issued, which is the whole point of
        // scoping a template by category rather than by document id.
        $late = $this->document(['folder_id' => $folder->id, 'title' => 'Board Minutes']);

        $this->getJson($this->api."/dataroom/documents/{$late->uuid}", $this->visitorHeaders($this->sessionToken($grant)))
            ->assertOk();
    }

    public function test_all_documents_access_opens_every_published_document(): void
    {
        $a = $this->document(['folder_id' => $this->folder()->id]);
        $b = $this->document(['title' => 'Loose Document', 'folder_id' => null]);

        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $headers = $this->visitorHeaders($this->sessionToken($grant));

        $this->getJson($this->api."/dataroom/documents/{$a->uuid}", $headers)->assertOk();
        $this->getJson($this->api."/dataroom/documents/{$b->uuid}", $headers)->assertOk();
    }

    public function test_a_grant_with_no_scope_can_read_nothing(): void
    {
        $doc = $this->document(['folder_id' => $this->folder()->id]);
        [$grant] = $this->grantWithCode();

        $headers = $this->visitorHeaders($this->sessionToken($grant));

        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $headers)->assertStatus(404);
        $this->getJson($this->api.'/dataroom/dashboard', $headers)
            ->assertOk()
            ->assertJsonPath('data.accessibleDocuments', 0)
            ->assertJsonPath('data.restrictedDocuments', 1);
    }

    // -- unpublished documents ---------------------------------------------

    public function test_unpublished_documents_are_invisible_even_with_full_access(): void
    {
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $headers = $this->visitorHeaders($this->sessionToken($grant));

        foreach (['draft', 'archived', 'restricted', 'superseded'] as $status) {
            $doc = $this->document(['status' => $status, 'title' => ucfirst($status).' Doc']);

            $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $headers)
                ->assertStatus(404);
            $this->getJson($this->api."/dataroom/documents/{$doc->uuid}/preview", $headers)
                ->assertStatus(404);
            $this->getJson($this->api."/dataroom/documents/{$doc->uuid}/download", $headers)
                ->assertStatus(404);
        }

        $this->getJson($this->api.'/dataroom/dashboard', $headers)
            ->assertJsonPath('data.totalDocuments', 0);
    }

    // -- IDOR --------------------------------------------------------------

    public function test_another_visitors_document_answers_404_not_403(): void
    {
        $doc = $this->document(['folder_id' => $this->folder()->id]);

        [$theirs] = $this->grantWithCode(['visitor_email' => 'other@fund.com']);
        $theirs->documents()->attach($doc->id, ['can_download' => true, 'can_print' => false]);

        [$mine] = $this->grantWithCode();

        // 403 would confirm the uuid names a real document. 404 keeps the two
        // cases indistinguishable.
        $response = $this->getJson(
            $this->api."/dataroom/documents/{$doc->uuid}",
            $this->visitorHeaders($this->sessionToken($mine))
        )->assertStatus(404);

        $unknown = $this->getJson(
            $this->api.'/dataroom/documents/'.Str::uuid(),
            $this->visitorHeaders($this->sessionToken($mine))
        )->assertStatus(404);

        $this->assertSame($unknown->json(), $response->json());
    }

    public function test_a_numeric_id_is_not_accepted_in_place_of_the_uuid(): void
    {
        $doc = $this->document(['folder_id' => $this->folder()->id]);
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);

        // External references are opaque uuids. Guessing sequential ids must
        // not resolve to anything.
        $this->getJson($this->api."/dataroom/documents/{$doc->id}", $this->visitorHeaders($this->sessionToken($grant)))
            ->assertStatus(404);
    }

    public function test_a_traversal_style_identifier_resolves_to_nothing(): void
    {
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $headers = $this->visitorHeaders($this->sessionToken($grant));

        foreach (['..%2F..%2Fetc%2Fpasswd', '..%2F..%2F.env', 'null%00.pdf'] as $probe) {
            $status = $this->getJson($this->api."/dataroom/documents/{$probe}", $headers)->status();
            // Either the route does not match or the lookup misses. Neither may
            // ever be a 200 with bytes attached.
            $this->assertContains($status, [404, 400], "Probe {$probe} returned {$status}.");
        }
    }

    public function test_the_document_uuid_is_the_only_identifier_exposed(): void
    {
        $doc = $this->document(['folder_id' => $this->folder()->id]);
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);

        $body = $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $this->visitorHeaders($this->sessionToken($grant)))
            ->assertOk()
            ->getContent();

        // The storage path is the one string that must never reach a client,
        // signed or otherwise.
        $this->assertStringNotContainsString($doc->file_path, $body);
        $this->assertStringNotContainsString('file_path', $body);
        $this->assertStringNotContainsString('checksum', $body);
    }

    // -- locked cards ------------------------------------------------------

    public function test_a_locked_card_exposes_the_title_and_type_only(): void
    {
        $folder = $this->folder();
        $locked = $this->document([
            'folder_id' => $folder->id,
            'title' => 'Cap Table',
            'description' => 'Shareholding by class, including the ESOP pool.',
            'version' => '2.1',
        ]);

        [$grant] = $this->grantWithCode();
        $grant->documents()->attach($this->document(['folder_id' => $folder->id, 'title' => 'Deck'])->id, ['can_download' => true]);

        $folders = $this->getJson($this->api.'/dataroom/folders', $this->visitorHeaders($this->sessionToken($grant)))
            ->assertOk()
            ->json('data');

        $card = collect($folders[0]['documents'])->firstWhere('title', 'Cap Table');

        $this->assertFalse($card['accessible']);
        // A description can itself be confidential, so it is withheld.
        $this->assertNull($card['description']);
        $this->assertNull($card['fileSize']);
        $this->assertNull($card['version']);
        $this->assertFalse($card['downloadPermitted']);
        $this->assertSame('pdf', $card['fileType']);

        $this->assertStringNotContainsString('ESOP pool', json_encode($folders));
    }

    public function test_search_never_returns_a_document_the_grant_cannot_read(): void
    {
        $folder = $this->folder();
        $this->document(['folder_id' => $folder->id, 'title' => 'Secret Cap Table']);
        $mine = $this->document(['folder_id' => $folder->id, 'title' => 'Public Deck']);

        [$grant] = $this->grantWithCode();
        $grant->documents()->attach($mine->id, ['can_download' => true]);

        $results = $this->getJson($this->api.'/dataroom/search?q=Cap', $this->visitorHeaders($this->sessionToken($grant)))
            ->assertOk()
            ->json('data');

        $this->assertSame([], $results);

        $this->getJson($this->api.'/dataroom/search?q=Deck', $this->visitorHeaders($this->sessionToken($grant)))
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    // -- download gates ----------------------------------------------------

    public function test_each_of_the_four_download_switches_can_veto_on_its_own(): void
    {
        $folder = $this->folder();

        // 1. the pivot override
        $doc = $this->document(['folder_id' => $folder->id]);
        [$grant] = $this->grantWithCode();
        $grant->documents()->attach($doc->id, ['can_download' => false, 'can_print' => false]);
        $this->assertDownloadDenied($grant, $doc);

        // 2. the document flag
        $doc2 = $this->document(['folder_id' => $folder->id, 'downloads_permitted' => false]);
        [$grant2] = $this->grantWithCode(['visitor_email' => 'b@fund.com']);
        $grant2->documents()->attach($doc2->id, ['can_download' => true, 'can_print' => false]);
        $this->assertDownloadDenied($grant2, $doc2);

        // 3. the grant flag
        $doc3 = $this->document(['folder_id' => $folder->id]);
        [$grant3] = $this->grantWithCode(['visitor_email' => 'c@fund.com', 'downloads_permitted' => false]);
        $grant3->documents()->attach($doc3->id, ['can_download' => true, 'can_print' => false]);
        $this->assertDownloadDenied($grant3, $doc3);

        // 4. the global setting, which is what "disable all downloads" flips
        $doc4 = $this->document(['folder_id' => $folder->id]);
        [$grant4] = $this->grantWithCode(['visitor_email' => 'd@fund.com']);
        $grant4->documents()->attach($doc4->id, ['can_download' => true, 'can_print' => false]);
        $this->settings()->update(['downloads_enabled' => false]);
        $this->assertDownloadDenied($grant4, $doc4);
    }

    private function assertDownloadDenied($grant, DataRoomDocument $doc): void
    {
        $headers = $this->visitorHeaders($this->sessionToken($grant));

        // Read access is unaffected: the visitor may look, not take.
        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $headers)
            ->assertOk()
            ->assertJsonPath('data.downloadPermitted', false);

        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}/download", $headers)
            ->assertStatus(403)
            ->assertJsonPath('message', 'Downloads are not enabled for this document.');

        $this->assertDatabaseHas('dataroom_audit_logs', [
            'access_grant_id' => $grant->id,
            'action' => 'download_denied',
        ]);

        $this->assertSame(0, $doc->fresh()->download_count);
    }

    public function test_a_document_pivot_overrides_the_folder_pivot(): void
    {
        $folder = $this->folder();
        $open = $this->document(['folder_id' => $folder->id, 'title' => 'Deck']);
        $tightened = $this->document(['folder_id' => $folder->id, 'title' => 'Cap Table']);

        [$grant] = $this->grantWithCode();
        $grant->folders()->attach($folder->id, ['can_download' => true]);
        // Broad folder permission, then one file pulled back.
        $grant->documents()->attach($tightened->id, ['can_download' => false, 'can_print' => false]);

        $headers = $this->visitorHeaders($this->sessionToken($grant));

        $this->getJson($this->api."/dataroom/documents/{$open->uuid}", $headers)
            ->assertJsonPath('data.downloadPermitted', true);
        $this->getJson($this->api."/dataroom/documents/{$tightened->uuid}", $headers)
            ->assertJsonPath('data.downloadPermitted', false);
        $this->getJson($this->api."/dataroom/documents/{$tightened->uuid}/download", $headers)
            ->assertStatus(403);
    }

    public function test_the_listed_download_affordance_matches_what_the_server_enforces(): void
    {
        $folder = $this->folder();
        $yes = $this->document(['folder_id' => $folder->id, 'title' => 'Deck']);
        $no = $this->document(['folder_id' => $folder->id, 'title' => 'Cap Table', 'downloads_permitted' => false]);

        [$grant] = $this->grantWithCode();
        $grant->folders()->attach($folder->id, ['can_download' => true]);

        $headers = $this->visitorHeaders($this->sessionToken($grant));
        $documents = collect($this->getJson($this->api.'/dataroom/folders', $headers)->json('data.0.documents'));

        // The list endpoint resolves permissions in bulk; a mismatch between it
        // and canDownload() would mean the UI offers a button the server refuses.
        foreach ([[$yes, true], [$no, false]] as [$doc, $expected]) {
            $card = $documents->firstWhere('uuid', $doc->uuid);
            $this->assertSame($expected, $card['downloadPermitted']);

            $this->getJson($this->api."/dataroom/documents/{$doc->uuid}/download", $headers)
                ->assertStatus($expected ? 404 : 403); // 404: authorized but no bytes on disk
        }
    }

    // -- grant state and delivery -----------------------------------------

    public function test_an_inactive_grant_loses_read_access_immediately(): void
    {
        $doc = $this->document(['folder_id' => $this->folder()->id]);
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $headers = $this->visitorHeaders($this->sessionToken($grant));

        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $headers)->assertOk();

        $grant->update(['status' => 'suspended']);

        // The middleware answers first, so the document endpoint is never
        // reached with a dead grant.
        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $headers)->assertStatus(403);
    }

    public function test_a_missing_file_on_disk_reports_unavailable_rather_than_leaking_a_path(): void
    {
        $doc = $this->document(['folder_id' => $this->folder()->id]);
        [$grant] = $this->grantWithCode(['all_documents_access' => true]);
        $headers = $this->visitorHeaders($this->sessionToken($grant));

        $response = $this->getJson($this->api."/dataroom/documents/{$doc->uuid}/preview", $headers)
            ->assertStatus(404);

        $this->assertSame(['message' => 'This document is not currently available.'], $response->json());
        $this->assertStringNotContainsString($doc->file_path, $response->getContent());
    }

    public function test_view_and_download_counts_only_move_on_an_authorized_request(): void
    {
        $doc = $this->document(['folder_id' => $this->folder()->id]);
        [$mine] = $this->grantWithCode(['all_documents_access' => true]);
        [$stranger] = $this->grantWithCode(['visitor_email' => 'x@fund.com']);

        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $this->visitorHeaders($this->sessionToken($stranger)))
            ->assertStatus(404);
        $this->assertSame(0, $doc->fresh()->view_count);

        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $this->visitorHeaders($this->sessionToken($mine)))
            ->assertOk();
        $this->assertSame(1, $doc->fresh()->view_count);

        $this->assertDatabaseHas('dataroom_document_views', [
            'document_id' => $doc->id,
            'access_grant_id' => $mine->id,
            'action_type' => 'view',
        ]);
    }

    public function test_the_activity_feed_shows_only_the_calling_visitors_trail(): void
    {
        $doc = $this->document(['folder_id' => $this->folder()->id]);

        [$mine] = $this->grantWithCode(['all_documents_access' => true]);
        [$theirs] = $this->grantWithCode(['visitor_email' => 'other@fund.com', 'all_documents_access' => true]);

        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $this->visitorHeaders($this->sessionToken($theirs)))->assertOk();

        $mineHeaders = $this->visitorHeaders($this->sessionToken($mine));
        $this->getJson($this->api."/dataroom/documents/{$doc->uuid}", $mineHeaders)->assertOk();

        $rows = $this->getJson($this->api.'/dataroom/activity', $mineHeaders)->assertOk()->json('data');

        // One row, mine. The other visitor's identical view must not appear.
        $this->assertCount(1, array_filter($rows, fn ($r) => $r['action'] === 'viewed_document'));
    }

    public function test_the_confidentiality_acknowledgement_is_recorded_once(): void
    {
        [$grant] = $this->grantWithCode();
        $headers = $this->visitorHeaders($this->sessionToken($grant));

        $this->assertNull($grant->acknowledged_at);

        $first = $this->postJson($this->api.'/dataroom/acknowledge', [], $headers)->assertOk()->json('data.acknowledgedAt');
        $this->assertNotNull($first);

        $this->travelTo(now()->addMinutes(5));

        // Re-acknowledging must not rewrite the original timestamp, which is
        // the only thing that makes it evidence.
        $second = $this->postJson($this->api.'/dataroom/acknowledge', [], $headers)->assertOk()->json('data.acknowledgedAt');
        $this->assertSame($first, $second);

        $this->assertSame(1, \App\Models\DataRoomAuditLog::where('action', 'acknowledged_confidentiality')->count());
    }
}
