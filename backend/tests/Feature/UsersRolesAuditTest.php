<?php

namespace Tests\Feature;

use App\Mail\AdminInviteMail;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Gate tests for the users / roles / audit-log modules.
 *
 * Each test pins a behaviour that was broken before: role display copy being
 * dropped on save, the users list filtering client-side so the total disagreed
 * with the rows, "Invite member" reporting success while sending nothing, and
 * audit filters that were declared by the frontend but not implemented.
 */
class UsersRolesAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_role_update_persists_name_description_and_colour(): void
    {
        $this->actingAsRole('super_admin');
        // A slug RoleSeeder does not own, so the assertions read stored copy
        // rather than a RoleMeta fallback.
        $role = Role::create(['name' => 'landing_editor', 'guard_name' => 'web']);

        $this->patchJson("{$this->api}/roles/r_{$role->id}", [
            'name' => 'Landing Editor',
            'description' => 'Edits landing page copy',
            'color' => '#0891b2',
            'permissions' => ['cms.view', 'cms.edit-hero'],
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Landing Editor')
            ->assertJsonPath('data.description', 'Edits landing page copy')
            ->assertJsonPath('data.color', '#0891b2')
            ->assertJsonPath('data.permissions', 2)
            // The slug is the permission key and must not move when copy changes.
            ->assertJsonPath('data.slug', 'landing_editor');

        $this->assertSame('Landing Editor', $role->fresh()->label);
    }

    public function test_created_role_stores_copy_and_derives_an_immutable_slug(): void
    {
        $this->actingAsRole('super_admin');

        $created = $this->postJson("{$this->api}/roles", [
            'name' => 'Support Lead',
            'description' => 'Handles escalations',
            'color' => '#7c3aed',
            'permissions' => ['waitlist.view'],
        ])->assertCreated()->json('data');

        $this->assertSame('support_lead', $created['slug']);
        $this->assertSame('Support Lead', $created['name']);
        $this->assertFalse($created['builtIn']);
    }

    public function test_built_in_roles_cannot_be_deleted(): void
    {
        $this->actingAsRole('super_admin');
        $role = Role::where('name', 'super_admin')->firstOrFail();

        $this->deleteJson("{$this->api}/roles/r_{$role->id}")->assertStatus(422);
        $this->assertNotNull(Role::find($role->id));
    }

    public function test_users_index_filters_in_sql_and_reports_a_matching_total(): void
    {
        $this->actingAsRole('super_admin', ['name' => 'Zed Admin', 'email' => 'zed@example.com']);
        User::factory()->create(['name' => 'Amina Bello', 'email' => 'amina@example.com', 'status' => 'invited']);
        User::factory()->create(['name' => 'Chidi Okafor', 'email' => 'chidi@example.com', 'status' => 'active']);

        $response = $this->getJson("{$this->api}/users?search=amina")->assertOk();
        $response->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'amina@example.com')
            ->assertJsonPath('meta.total', 1);

        $this->getJson("{$this->api}/users?status=invited")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'invited');
    }

    public function test_user_detail_returns_real_permissions_and_audit_activity(): void
    {
        $admin = $this->actingAsRole('super_admin');
        AuditLog::create([
            'user_id' => $admin->id,
            'actor' => $admin->name,
            'action' => 'settings.updated',
            'target' => 'general',
            'ip' => '127.0.0.1',
            'device' => 'phpunit',
        ]);

        $data = $this->getJson("{$this->api}/users/u_{$admin->id}")->assertOk()->json('data');

        $this->assertSame('super_admin', $data['roleSlug']);
        $this->assertNotEmpty($data['permissions']);
        $this->assertCount(1, $data['recentActivity']);
        $this->assertSame('settings.updated', $data['recentActivity'][0]['action']);
        $this->assertArrayHasKey('emailVerified', $data);
    }

    public function test_new_user_detail_has_an_empty_activity_timeline(): void
    {
        $this->actingAsRole('super_admin');
        $fresh = User::factory()->create(['status' => 'active']);

        $this->getJson("{$this->api}/users/u_{$fresh->id}")
            ->assertOk()
            ->assertJsonPath('data.recentActivity', []);
    }

    public function test_inviting_a_member_sends_a_real_invitation_email(): void
    {
        Mail::fake();
        $this->actingAsRole('super_admin');

        $this->postJson("{$this->api}/users", [
            'name' => 'New Editor',
            'email' => 'new.editor@example.com',
            'role' => 'super_admin',
            'status' => 'invited',
            'invite' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('meta.invited', true);

        Mail::assertSent(AdminInviteMail::class, fn ($mail) => $mail->hasTo('new.editor@example.com'));
        $this->assertDatabaseHas('users', ['email' => 'new.editor@example.com', 'status' => 'invited']);
    }

    public function test_resending_an_invitation_sends_the_mail_again(): void
    {
        Mail::fake();
        $this->actingAsRole('super_admin');
        $invited = User::factory()->create(['email' => 'pending@example.com', 'status' => 'invited']);

        $this->postJson("{$this->api}/users/u_{$invited->id}/invite")
            ->assertOk()
            ->assertJsonPath('data.sent', true);

        Mail::assertSent(AdminInviteMail::class, fn ($mail) => $mail->hasTo('pending@example.com'));
    }

    public function test_audit_log_filters_by_action_actor_and_date_range(): void
    {
        $admin = $this->actingAsRole('super_admin', ['name' => 'Filter Admin']);
        // `created_at` is not fillable on AuditLog (production code never sets
        // it), so the backdated row is written and then aged explicitly.
        AuditLog::create(['user_id' => $admin->id, 'actor' => 'Filter Admin', 'action' => 'user.created', 'target' => 'a@example.com'])
            ->forceFill(['created_at' => now()->subDays(10)])->save();
        AuditLog::create(['user_id' => $admin->id, 'actor' => 'Other Admin', 'action' => 'role.updated', 'target' => 'Editor']);

        $this->getJson("{$this->api}/audit-logs?action=role.updated")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', 'role.updated');

        $this->getJson("{$this->api}/audit-logs?user=Other")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user', 'Other Admin');

        // `from` is inclusive of the whole local day, so a row written 10 days
        // ago is excluded by a 5-day-ago floor.
        $this->getJson("{$this->api}/audit-logs?from=".now()->subDays(5)->toDateString())
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson("{$this->api}/audit-logs?search=a@example.com")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_audit_dropdown_sources_return_distinct_values(): void
    {
        $admin = $this->actingAsRole('super_admin');
        AuditLog::create(['user_id' => $admin->id, 'actor' => 'Dup Admin', 'action' => 'user.created', 'target' => 'x']);
        AuditLog::create(['user_id' => $admin->id, 'actor' => 'Dup Admin', 'action' => 'user.created', 'target' => 'y']);

        $this->getJson("{$this->api}/audit-logs/actions")
            ->assertOk()
            ->assertJsonPath('data', ['user.created']);
        $this->getJson("{$this->api}/audit-logs/actors")
            ->assertOk()
            ->assertJsonPath('data', ['Dup Admin']);
    }

    public function test_audit_log_pagination_meta_matches_the_returned_page(): void
    {
        $admin = $this->actingAsRole('super_admin');
        foreach (range(1, 7) as $i) {
            AuditLog::create([
                'user_id' => $admin->id,
                'actor' => 'Pager Admin',
                'action' => 'user.updated',
                'target' => "row-{$i}",
            ]);
        }

        // The page renders `meta.last_page` and `meta.total`, so both have to
        // describe the same filtered set the rows come from.
        $this->getJson("{$this->api}/audit-logs?per_page=3")
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.total', 7)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('meta.current_page', 1);

        $this->getJson("{$this->api}/audit-logs?per_page=3&page=3")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.current_page', 3);
    }

    public function test_audit_export_page_size_is_capped_at_two_hundred(): void
    {
        $this->actingAsRole('super_admin');

        // The CSV export asks for per_page=200; anything above the cap is a
        // validation error rather than an unbounded query.
        $this->getJson("{$this->api}/audit-logs?per_page=200")
            ->assertOk()
            ->assertJsonPath('meta.per_page', 200);

        $this->getJson("{$this->api}/audit-logs?per_page=500")
            ->assertStatus(422);
    }

    public function test_audit_log_endpoints_require_the_users_view_permission(): void
    {
        $this->actingAsPermissionless();

        $this->getJson("{$this->api}/audit-logs")->assertForbidden();
        $this->getJson("{$this->api}/audit-logs/actions")->assertForbidden();
        $this->getJson("{$this->api}/audit-logs/actors")->assertForbidden();
    }

    public function test_role_and_user_writes_leave_an_audit_trail(): void
    {
        $this->actingAsRole('super_admin');

        $this->postJson("{$this->api}/roles", ['name' => 'Auditable Role'])->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'role.created',
            'target' => 'Auditable Role',
        ]);
    }
}
