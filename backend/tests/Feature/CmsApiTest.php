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

    public function test_public_cms_excludes_disabled_sections(): void
    {
        $this->section(['section' => 'hero', 'enabled' => true, 'published' => true]);
        $this->section(['section' => 'services', 'enabled' => false, 'published' => true, 'order' => 2]);

        $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->assertJsonPath('data.hero.section', 'hero')
            ->assertJsonMissingPath('data.services');
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
        $this->section(['section' => 'footer', 'enabled' => true]);
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/cms/footer", ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('data.enabled', false);

        // Confirm the landing now hides it.
        $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->assertJsonMissingPath('data.footer');
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

    public function test_patch_404s_for_unknown_section(): void
    {
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/cms/nonexistent_section_xyz", ['data' => []])
            ->assertNotFound();
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
