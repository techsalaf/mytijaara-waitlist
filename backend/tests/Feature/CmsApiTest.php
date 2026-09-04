<?php

namespace Tests\Feature;

use App\Models\CmsSection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * CMS API coverage — public endpoint, admin CRUD, draft promotion,
 * cache invalidation, and RBAC guards.
 *
 * The AdminApiTest already has two smoke-tests; these are the edge-case and
 * contract tests.
 */
class CmsApiTest extends TestCase
{
    use RefreshDatabase;

    // ─── helpers ─────────────────────────────────────────────────────────

    private function section(array $attrs = []): CmsSection
    {
        return CmsSection::create(array_merge([
            'section'   => 'hero',
            'title'     => 'Hero',
            'data'      => [],
            'enabled'   => true,
            'published' => true,
            'order'     => 1,
        ], $attrs));
    }

    // ─── public GET /cms ─────────────────────────────────────────────────

    public function test_public_cms_returns_empty_data_when_no_sections_exist(): void
    {
        $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->assertJson(['data' => []]);
    }

    public function test_public_cms_returns_published_and_enabled_sections(): void
    {
        $this->section(['section' => 'hero', 'data' => ['headline' => 'Hello']]);

        $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->assertJsonPath('data.hero.section', 'hero')
            ->assertJsonPath('data.hero.data.headline', 'Hello');
    }

    /**
     * The toggle contract, and the reason it looks the way it does.
     *
     * A disabled section is still returned by `GET /cms`, carrying
     * `enabled: false` and an empty `data`. That is deliberate: the frontend has
     * to tell "the administrator switched this off" apart from "this section is
     * missing or the API is unreachable". The first must hide the section, the
     * second must fall back to the bundled defaults so the page still renders.
     *
     * Filtering the row out here is what broke the toggle. `useCmsData` reads
     * `if (!section) return fallback`, so an omitted row produced the hardcoded
     * default copy — switching a section off left it on the page with the
     * original marketing text.
     */
    public function test_public_cms_returns_a_disabled_section_flagged_off_rather_than_omitting_it(): void
    {
        $this->section(['section' => 'hero', 'enabled' => true, 'published' => true]);
        $this->section([
            'section' => 'services',
            'enabled' => false,
            'published' => true,
            'order' => 2,
            'data' => ['headline' => 'Secret copy'],
        ]);

        $response = $this->getJson("{$this->api}/cms")->assertOk();

        $response->assertJsonPath('data.hero.enabled', true);
        $response->assertJsonPath('data.services.enabled', false);
        // Present, so the client can distinguish "off" from "absent"…
        $this->assertArrayHasKey('services', $response->json('data'));
        // …but carrying nothing, so switching a section off cannot leak its
        // content into the page even from a consumer that ignores the flag.
        $response->assertJsonPath('data.services.data', []);
        $this->assertStringNotContainsString('Secret copy', $response->getContent());
    }

    public function test_public_cms_excludes_unpublished_sections(): void
    {
        $this->section(['section' => 'hero', 'enabled' => true, 'published' => true]);
        $this->section(['section' => 'footer', 'enabled' => true, 'published' => false, 'order' => 2]);

        $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->assertJsonPath('data.hero.section', 'hero')
            ->assertJsonMissingPath('data.footer');
    }

    public function test_public_cms_keys_response_by_section_name(): void
    {
        $this->section(['section' => 'announcement', 'data' => ['text' => 'Coming soon']]);

        $response = $this->getJson("{$this->api}/cms")->assertOk();

        // The key in `data` is the section slug, not an integer.
        $this->assertArrayHasKey('announcement', $response->json('data'));
    }

    public function test_public_cms_is_cached_and_stale_on_second_hit(): void
    {
        Cache::flush();
        $this->section(['section' => 'hero', 'data' => ['headline' => 'First']]);

        // Prime the cache.
        $this->getJson("{$this->api}/cms")->assertOk();

        // Mutate the DB directly (simulates a concurrent write bypassing the
        // controller) — the cached response should still return the old value.
        CmsSection::where('section', 'hero')->update(['data' => json_encode(['headline' => 'Second'])]);

        $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->assertJsonPath('data.hero.data.headline', 'First');

        Cache::flush();
    }

    // ─── admin GET /cms-admin ─────────────────────────────────────────────

    public function test_admin_index_includes_all_sections_regardless_of_publish_state(): void
    {
        $this->section(['section' => 'hero', 'published' => true]);
        $this->section(['section' => 'footer', 'published' => false, 'order' => 2]);

        $this->actingAsRole('super_admin');

        $this->getJson("{$this->api}/cms-admin")
            ->assertOk()
            ->assertJsonPath('data.hero.section', 'hero')
            ->assertJsonPath('data.footer.section', 'footer');
    }

    public function test_admin_show_returns_draft_field_public_show_does_not(): void
    {
        $this->section([
            'section' => 'hero',
            'data'    => ['headline' => 'Live'],
            'draft'   => ['headline' => 'Draft copy'],
        ]);

        // Public endpoint returns null for draft (key is present but redacted).
        $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->assertJsonPath('data.hero.draft', null);

        // Admin endpoint includes it.
        $this->actingAsRole('super_admin');
        $this->getJson("{$this->api}/cms-admin/hero")
            ->assertOk()
            ->assertJsonPath('data.draft.headline', 'Draft copy');
    }

    public function test_admin_endpoint_is_auth_gated(): void
    {
        $this->section();

        // Unauthenticated requests get 401.
        $this->getJson("{$this->api}/cms-admin")->assertUnauthorized();
        $this->getJson("{$this->api}/cms-admin/hero")->assertUnauthorized();
    }

    // ─── PATCH /cms/:section ─────────────────────────────────────────────

    public function test_super_admin_can_update_section_data(): void
    {
        $this->section(['section' => 'hero', 'data' => ['headline' => 'Old']]);
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/cms/hero", ['data' => ['headline' => 'New', 'sub' => 'Hi']])
            ->assertOk()
            ->assertJsonPath('data.data.headline', 'New')
            ->assertJsonPath('data.data.sub', 'Hi');
    }

    public function test_patch_flips_enabled_flag(): void
    {
        $this->section(['section' => 'footer', 'enabled' => true, 'data' => ['tagline' => 'Live copy']]);
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/cms/footer", ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('data.enabled', false);

        // The public feed still carries the row, flagged off and emptied. That is
        // what makes the landing page hide the section instead of falling back to
        // its bundled default copy.
        $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->assertJsonPath('data.footer.enabled', false)
            ->assertJsonPath('data.footer.data', []);
    }

    public function test_the_enabled_toggle_survives_a_full_round_trip_both_ways(): void
    {
        // The complete cycle an administrator performs: switch off, reload the
        // public feed, switch back on, reload again. Each step has to be visible
        // without a cache flush, because `update()` forgets the public key.
        $this->section(['section' => 'hero', 'enabled' => true, 'data' => ['headline' => 'Real copy']]);
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/cms/hero", ['enabled' => false])->assertOk();
        $this->getJson("{$this->api}/cms")->assertJsonPath('data.hero.enabled', false);

        // Persisted, not just echoed back by the response.
        $this->assertFalse((bool) CmsSection::where('section', 'hero')->value('enabled'));
        // The admin editor must show the switch in the off position after a
        // refresh, so the state has to survive the admin read too.
        $this->getJson("{$this->api}/cms-admin/hero")->assertJsonPath('data.enabled', false);

        $this->patchJson("{$this->api}/cms/hero", ['enabled' => true])->assertOk();

        $this->getJson("{$this->api}/cms")
            ->assertJsonPath('data.hero.enabled', true)
            // Re-enabling has to restore the saved content, not an empty object:
            // disabling strips `data` from the payload, never from the row.
            ->assertJsonPath('data.hero.data.headline', 'Real copy');
    }

    public function test_disabling_a_section_does_not_erase_its_stored_content(): void
    {
        $this->section(['section' => 'why', 'enabled' => true, 'data' => ['headline' => 'Keep me']]);
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/cms/why", ['enabled' => false])->assertOk();

        $this->assertSame(['headline' => 'Keep me'], CmsSection::where('section', 'why')->value('data'));
    }

    public function test_patch_busts_the_cms_cache(): void
    {
        Cache::flush();
        $this->section(['section' => 'hero', 'data' => ['headline' => 'Stale']]);

        // Prime the cache.
        $this->getJson("{$this->api}/cms")->assertOk();

        // Admin update.
        $this->actingAsRole('super_admin');
        $this->patchJson("{$this->api}/cms/hero", ['data' => ['headline' => 'Fresh']])->assertOk();

        // Public endpoint should serve the new value immediately.
        $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->assertJsonPath('data.hero.data.headline', 'Fresh');

        Cache::flush();
    }

    public function test_draft_promotion_moves_draft_to_data_atomically(): void
    {
        $this->section([
            'section' => 'hero',
            'data'    => ['headline' => 'Live'],
            'draft'   => ['headline' => 'Pending'],
        ]);
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/cms/hero", ['publish_draft' => true])
            ->assertOk()
            ->assertJsonPath('data.data.headline', 'Pending');

        // The draft must be cleared after promotion so it doesn't re-apply.
        $this->assertNull(CmsSection::where('section', 'hero')->value('draft'));
    }

    public function test_draft_promotion_also_sets_published_true(): void
    {
        $this->section([
            'section'   => 'hero',
            'data'      => [],
            'draft'     => ['headline' => 'Ready'],
            'published' => false,
        ]);
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/cms/hero", ['publish_draft' => true])
            ->assertOk()
            ->assertJsonPath('data.published', true);

        $this->assertTrue((bool) CmsSection::where('section', 'hero')->value('published'));
    }

    public function test_patch_is_rbac_protected(): void
    {
        $this->section();
        $this->actingAsPermissionless();

        $this->patchJson("{$this->api}/cms/hero", ['data' => ['headline' => 'Hack']])
            ->assertForbidden();
    }

    /**
     * A section that has never been seeded can be created by its first save.
     *
     * `adminShow()` hands the editor a synthetic empty row rather than a 404, so
     * the editor renders and accepts input. Before `update()` learned to create,
     * that first save 404'd behind a success-shaped UI and silently dropped the
     * administrator's work.
     */
    public function test_patch_creates_a_section_that_was_never_seeded(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/cms/brand_new_section", ['data' => ['headline' => 'First save']])
            ->assertOk()
            ->assertJsonPath('data.section', 'brand_new_section')
            ->assertJsonPath('data.data.headline', 'First save');

        $this->assertDatabaseHas('cms_sections', ['section' => 'brand_new_section']);
    }

    public function test_a_newly_created_section_is_live_on_the_public_site(): void
    {
        // The bug this pins: `adminShow()` used to report `enabled: false,
        // published: false` for an unseeded section, `useCmsSection` seeded its
        // switches from that and posted them straight back, and the section was
        // therefore created switched off and unpublished. The editor showed the
        // saved copy on every refresh and the public site never showed it at all.
        $this->actingAsRole('super_admin');

        $synthetic = $this->getJson("{$this->api}/cms-admin/never_seeded")->assertOk();
        $synthetic->assertJsonPath('data.enabled', true);
        $synthetic->assertJsonPath('data.published', true);

        // Replay exactly what the editor hook sends: the flags it just read back.
        $this->patchJson("{$this->api}/cms/never_seeded", [
            'data' => ['headline' => 'Hello world'],
            'enabled' => $synthetic->json('data.enabled'),
            'published' => $synthetic->json('data.published'),
        ])->assertOk();

        $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->assertJsonPath('data.never_seeded.enabled', true)
            ->assertJsonPath('data.never_seeded.data.headline', 'Hello world');
    }

    // ─── response shape ──────────────────────────────────────────────────

    public function test_section_response_carries_expected_keys(): void
    {
        $this->section(['section' => 'hero', 'data' => ['headline' => 'Hi']]);

        $data = $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->json('data.hero');

        foreach (['section', 'title', 'data', 'enabled', 'published', 'order'] as $key) {
            $this->assertArrayHasKey($key, $data, "Missing key: $key");
        }
        // Draft key is present but null on the public endpoint.
        $this->assertArrayHasKey('draft', $data);
        $this->assertNull($data['draft']);
    }
}
