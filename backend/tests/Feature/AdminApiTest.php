<?php

namespace Tests\Feature;

use App\Models\AdminNotification;
use App\Models\CmsSection;
use App\Models\EmailCampaign;
use App\Models\Faq;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_manage_campaigns_and_read_stats(): void
    {
        $this->actingAsRole('super_admin');

        $created = $this->postJson("{$this->api}/campaigns", [
            'name' => 'Launch update', 'subject' => 'We are launching', 'status' => 'draft',
        ])->assertCreated()->json('data');

        $this->patchJson("{$this->api}/campaigns/{$created['id']}", [
            'status' => 'scheduled',
            'scheduledAt' => now()->addHour()->toIso8601String(),
        ])->assertOk()->assertJsonPath('data.status', 'scheduled');
        $this->getJson("{$this->api}/campaigns/{$created['id']}/stats")
            ->assertOk()->assertJsonPath('data.sent', 0);
    }

    public function test_super_admin_can_manage_cms_content_and_faqs(): void
    {
        $this->actingAsRole('super_admin');
        CmsSection::create(['section' => 'hero', 'title' => 'Old title', 'data' => [], 'enabled' => true, 'published' => true, 'order' => 1]);

        $this->patchJson("{$this->api}/cms/hero", ['draft' => ['headline' => 'New title'], 'publish_draft' => true])
            ->assertOk()->assertJsonPath('data.data.headline', 'New title');

        $faq = $this->postJson("{$this->api}/content/faqs", ['question' => 'What is this?', 'answer' => 'A waitlist.', 'published' => true])
            ->assertCreated()->json('data');
        $this->deleteJson("{$this->api}/content/faqs/{$faq['id']}")->assertOk();
    }

    public function test_public_cms_excludes_unpublished_sections_while_admin_can_edit_them(): void
    {
        CmsSection::create(['section' => 'hero', 'title' => 'Hero', 'data' => [], 'enabled' => true, 'published' => true, 'order' => 1]);
        CmsSection::create(['section' => 'announcement', 'title' => 'Draft', 'data' => [], 'enabled' => false, 'published' => false, 'order' => 2]);

        $this->getJson("{$this->api}/cms")
            ->assertOk()
            ->assertJsonPath('data.hero.section', 'hero')
            ->assertJsonMissingPath('data.announcement');

        $this->actingAsRole('super_admin');
        $this->getJson("{$this->api}/cms-admin/announcement")
            ->assertOk()
            ->assertJsonPath('data.section', 'announcement')
            ->assertJsonPath('data.published', false);
    }

    public function test_users_and_roles_are_rbac_protected(): void
    {
        $this->actingAsPermissionless();
        $this->getJson("{$this->api}/users")->assertForbidden();
        $this->getJson("{$this->api}/roles")->assertForbidden();
    }

    public function test_notification_cannot_be_marked_read_by_another_admin(): void
    {
        $owner = User::factory()->create(['status' => 'active']);
        $notification = AdminNotification::create(['user_id' => $owner->id, 'title' => 'Private', 'body' => 'Only owner', 'type' => 'info']);
        $this->actingAsRole('super_admin');

        $this->patchJson("{$this->api}/notifications/{$notification->id}/read")->assertNotFound();
        $this->assertFalse($notification->fresh()->read);
    }
}
