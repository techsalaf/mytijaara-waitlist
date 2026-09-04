<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\CmsController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\CronController;
use App\Http\Controllers\Api\DataRoom\AdminDataRoomController;
use App\Http\Controllers\Api\DataRoom\AdminDataRoomDocumentController;
use App\Http\Controllers\Api\DataRoom\AdminDataRoomFolderController;
use App\Http\Controllers\Api\DataRoom\AdminDataRoomGrantController;
use App\Http\Controllers\Api\DataRoom\AdminDataRoomTemplateController;
use App\Http\Controllers\Api\EmailTrackingController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\LaunchConfigController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ReferralController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TemplateController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WaitlistController;
use App\Http\Controllers\Api\WorkspaceController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| Prefix `api/v1` is applied globally in bootstrap/app.php. Public routes are
| hit by the landing site, mail clients, and the ESP. Everything else sits
| behind Sanctum + a spatie `permission:` gate that mirrors RoleSeeder.
*/

// ---------------------------------------------------------------------------
// Public — no auth. Landing page, tracking pixels, webhooks, unsubscribe.
// ---------------------------------------------------------------------------
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

Route::post('/waitlist', [WaitlistController::class, 'store']);
Route::get('/waitlist/count', [WaitlistController::class, 'count']);
Route::get('/waitlist/avatars', [WaitlistController::class, 'avatars']);
Route::get('/waitlist/cities', [WaitlistController::class, 'cities']);
Route::get('/waitlist/verify/{token}', [WaitlistController::class, 'verify']);

Route::get('/launch-config', [LaunchConfigController::class, 'show']);

Route::post('/events', [EventController::class, 'store']);

Route::post('/referrals/visit', [ReferralController::class, 'visit']);

Route::get('/track/open/{campaign}', [EmailTrackingController::class, 'open']);
Route::get('/track/click/{campaign}', [EmailTrackingController::class, 'click']);
Route::post('/webhooks/email', [EmailTrackingController::class, 'webhook']);
Route::post('/unsubscribe', [EmailTrackingController::class, 'unsubscribe']);

// The host's cron entry point. Not "public" in any useful sense: it is gated on
// a shared secret and can only run the fixed allowlist in config/cron.php. It
// lives out here because cPanel's cron cannot present a Sanctum token.
Route::get('/cron/run', [CronController::class, 'run']);
Route::post('/cron/run', [CronController::class, 'run']);

// ---------------------------------------------------------------------------
// Virtual Data Room (VDR) — Public / Visitor Auth & Workspace
//
// A completely separate authentication domain from the admin panel below. These
// routes never touch `auth:sanctum`, and DataRoomAuthenticate never consults a
// Sanctum token, so an admin session grants nothing here and a visitor token
// grants nothing there. Security does not depend on these paths being obscure.
// ---------------------------------------------------------------------------
Route::get('/dataroom/gate', [\App\Http\Controllers\Api\DataRoom\DataRoomVisitorAuthController::class, 'gate']);
Route::post('/dataroom/authenticate', [\App\Http\Controllers\Api\DataRoom\DataRoomVisitorAuthController::class, 'authenticate']);
Route::post('/dataroom/logout', [\App\Http\Controllers\Api\DataRoom\DataRoomVisitorAuthController::class, 'logout']);

Route::middleware([\App\Http\Middleware\DataRoomAuthenticate::class])->prefix('dataroom')->group(function () {
    Route::get('/me', [\App\Http\Controllers\Api\DataRoom\DataRoomVisitorAuthController::class, 'me']);
    Route::get('/dashboard', [\App\Http\Controllers\Api\DataRoom\DataRoomWorkspaceController::class, 'dashboard']);
    Route::get('/folders', [\App\Http\Controllers\Api\DataRoom\DataRoomWorkspaceController::class, 'folders']);
    Route::get('/search', [\App\Http\Controllers\Api\DataRoom\DataRoomWorkspaceController::class, 'search']);
    Route::get('/activity', [\App\Http\Controllers\Api\DataRoom\DataRoomWorkspaceController::class, 'activity']);
    Route::post('/acknowledge', [\App\Http\Controllers\Api\DataRoom\DataRoomWorkspaceController::class, 'acknowledge']);
    // Fixed suffixes are declared before the bare `{uuid}` so neither
    // "preview" nor "download" can be captured as a document identifier.
    Route::get('/documents/{uuid}/preview', [\App\Http\Controllers\Api\DataRoom\DataRoomWorkspaceController::class, 'preview']);
    Route::get('/documents/{uuid}/download', [\App\Http\Controllers\Api\DataRoom\DataRoomWorkspaceController::class, 'download']);
    Route::get('/documents/{uuid}', [\App\Http\Controllers\Api\DataRoom\DataRoomWorkspaceController::class, 'show']);
});

// Public read of published CMS content for the landing page.
Route::get('/settings/public', [SettingsController::class, 'publicSettings']);
Route::get('/cms', [CmsController::class, 'index']);
Route::get('/cms/{section}', [CmsController::class, 'show']);
Route::get('/content/faqs', [ContentController::class, 'faqs']);
Route::get('/content/testimonials', [ContentController::class, 'testimonials']);

// ---------------------------------------------------------------------------
// Authenticated admin panel.
// ---------------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {
    // Session + own profile. No permission gate: every admin owns their account.
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::patch('/auth/me', [AuthController::class, 'updateProfile']);
    Route::post('/auth/password', [AuthController::class, 'changePassword']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Active sessions = this account's Sanctum tokens.
    Route::get('/auth/sessions', [AuthController::class, 'sessions']);
    Route::post('/auth/sessions/revoke-others', [AuthController::class, 'revokeOtherSessions']);
    Route::delete('/auth/sessions/{id}', [AuthController::class, 'revokeSession']);

    // Two-factor enrolment. Confirm before it is enforced.
    Route::post('/auth/two-factor', [AuthController::class, 'startTwoFactor']);
    Route::post('/auth/two-factor/confirm', [AuthController::class, 'confirmTwoFactor']);
    Route::post('/auth/two-factor/recovery-codes', [AuthController::class, 'regenerateRecoveryCodes']);
    Route::delete('/auth/two-factor', [AuthController::class, 'disableTwoFactor']);

    // Notifications — any authenticated admin sees their own.
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/clear', [NotificationController::class, 'clear']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // Dashboard analytics
    Route::middleware('permission:analytics.view')->group(function () {
        Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
        Route::get('/analytics/trends', [AnalyticsController::class, 'trends']);
        Route::get('/analytics/traffic-sources', [AnalyticsController::class, 'trafficSources']);
        Route::get('/analytics/cities', [AnalyticsController::class, 'cities']);
        Route::get('/analytics/devices', [AnalyticsController::class, 'devices']);
        Route::get('/analytics/browsers', [AnalyticsController::class, 'browsers']);
        Route::get('/analytics/funnel', [AnalyticsController::class, 'funnel']);
        Route::get('/analytics/digest', [AnalyticsController::class, 'digestPreview']);
    });

    // Building the weekly digest writes a draft campaign, so it is gated on
    // email.create rather than analytics.view.
    Route::post('/analytics/digest', [AnalyticsController::class, 'digest'])
        ->middleware('permission:email.create');

    // Waitlist
    Route::get('/waitlist', [WaitlistController::class, 'index'])->middleware('permission:waitlist.view');
    Route::get('/waitlist/export', [WaitlistController::class, 'export'])->middleware('permission:waitlist.export');
    Route::get('/waitlist/{id}', [WaitlistController::class, 'show'])->middleware('permission:waitlist.view');
    Route::patch('/waitlist/{id}', [WaitlistController::class, 'update'])->middleware('permission:waitlist.edit');
    Route::post('/waitlist/{id}/email', [WaitlistController::class, 'resendEmail'])->middleware('permission:waitlist.edit');
    Route::post('/waitlist/bulk-delete', [WaitlistController::class, 'bulkDelete'])->middleware('permission:waitlist.bulk-actions');
    Route::post('/waitlist/bulk-update', [WaitlistController::class, 'bulkUpdate'])->middleware('permission:waitlist.bulk-actions');
    Route::post('/waitlist/restore', [WaitlistController::class, 'restore'])->middleware('permission:waitlist.bulk-actions');

    // Referrals
    Route::middleware('permission:referrals.view')->group(function () {
        Route::get('/referrals/leaderboard', [ReferralController::class, 'leaderboard']);
        Route::get('/referrals/analytics', [ReferralController::class, 'analytics']);
        Route::get('/referrals/rewards/pending', [ReferralController::class, 'pendingRewards']);
    });
    Route::get('/referrals/export', [ReferralController::class, 'export'])
        ->middleware('permission:referrals.export');
    // Paying rewards writes to `referrals` and sends mail, so it needs manage,
    // not the read permission the rest of the module uses.
    Route::post('/referrals/rewards', [ReferralController::class, 'sendRewards'])
        ->middleware('permission:referrals.manage');
    // Last: `{id}` would otherwise swallow `export` and `rewards`.
    Route::get('/referrals/{id}', [ReferralController::class, 'show'])
        ->middleware('permission:referrals.view');

    // CMS authoring
    Route::get('/cms-admin', [CmsController::class, 'adminIndex'])->middleware('permission:cms.view');
    Route::get('/cms-admin/{section}', [CmsController::class, 'adminShow'])->middleware('permission:cms.view');
    Route::patch('/cms/{section}', [CmsController::class, 'update'])->middleware('permission:cms.edit-hero');

    // FAQs
    Route::middleware('permission:cms.edit-faqs')->group(function () {
        Route::post('/content/faqs', [ContentController::class, 'storeFaq']);
        Route::patch('/content/faqs/{id}', [ContentController::class, 'updateFaq']);
        Route::delete('/content/faqs/{id}', [ContentController::class, 'destroyFaq']);
        Route::post('/content/faqs/reorder', [ContentController::class, 'reorderFaqs']);
    });

    // Testimonials
    Route::middleware('permission:cms.edit-testimonials')->group(function () {
        Route::post('/content/testimonials', [ContentController::class, 'storeTestimonial']);
        Route::patch('/content/testimonials/{id}', [ContentController::class, 'updateTestimonial']);
        Route::delete('/content/testimonials/{id}', [ContentController::class, 'destroyTestimonial']);
        Route::post('/content/testimonials/reorder', [ContentController::class, 'reorderTestimonials']);
    });

    // Launch config
    Route::patch('/launch-config', [LaunchConfigController::class, 'update'])->middleware('permission:cms.edit-hero');

    // Media library
    Route::get('/media', [MediaController::class, 'index'])->middleware('permission:media.view');
    Route::get('/media/folders', [MediaController::class, 'folders'])->middleware('permission:media.view');
    Route::post('/media', [MediaController::class, 'store'])->middleware('permission:media.upload');
    Route::post('/media/folders', [MediaController::class, 'createFolder'])->middleware('permission:media.manage-folders');
    Route::post('/media/{id}/replace', [MediaController::class, 'replace'])->middleware('permission:media.upload');
    Route::patch('/media/{id}', [MediaController::class, 'update'])->middleware('permission:media.upload');
    Route::delete('/media/{id}', [MediaController::class, 'destroy'])->middleware('permission:media.delete');

    // Email — templates
    Route::get('/templates', [TemplateController::class, 'index'])->middleware('permission:email.view');
    Route::get('/templates/{id}', [TemplateController::class, 'show'])->middleware('permission:email.view');
    Route::post('/templates', [TemplateController::class, 'store'])->middleware('permission:email.manage-templates');
    Route::patch('/templates/{id}', [TemplateController::class, 'update'])->middleware('permission:email.manage-templates');
    Route::delete('/templates/{id}', [TemplateController::class, 'destroy'])->middleware('permission:email.manage-templates');

    // Email — campaigns
    Route::get('/campaigns', [CampaignController::class, 'index'])->middleware('permission:email.view');
    // Before `{id}`, which would otherwise match "segments".
    Route::get('/campaigns/segments', [CampaignController::class, 'segments'])->middleware('permission:email.view');
    Route::get('/campaigns/{id}', [CampaignController::class, 'show'])->middleware('permission:email.view');
    Route::get('/campaigns/{id}/stats', [CampaignController::class, 'stats'])->middleware('permission:email.view');
    Route::post('/campaigns', [CampaignController::class, 'store'])->middleware('permission:email.create');
    Route::post('/campaigns/{id}/duplicate', [CampaignController::class, 'duplicate'])->middleware('permission:email.create');
    Route::patch('/campaigns/{id}', [CampaignController::class, 'update'])->middleware('permission:email.create');
    Route::delete('/campaigns/{id}', [CampaignController::class, 'destroy'])->middleware('permission:email.delete');
    Route::post('/campaigns/{id}/send', [CampaignController::class, 'send'])->middleware('permission:email.send');

    // Users
    Route::get('/users', [UserController::class, 'index'])->middleware('permission:users.view');
    Route::get('/users/{id}', [UserController::class, 'show'])->middleware('permission:users.view');
    Route::post('/users', [UserController::class, 'store'])->middleware('permission:users.invite');
    Route::post('/users/{id}/invite', [UserController::class, 'invite'])->middleware('permission:users.invite');
    Route::patch('/users/{id}', [UserController::class, 'update'])->middleware('permission:users.edit');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->middleware('permission:users.delete');

    // Roles + permissions
    Route::get('/permissions', [RoleController::class, 'permissionGroups'])->middleware('permission:roles.view');
    Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:roles.view');
    Route::get('/roles/{id}', [RoleController::class, 'show'])->middleware('permission:roles.view');
    Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:roles.create');
    Route::patch('/roles/{id}', [RoleController::class, 'update'])->middleware('permission:roles.edit');
    Route::delete('/roles/{id}', [RoleController::class, 'destroy'])->middleware('permission:roles.delete');

    // Audit log
    Route::get('/audit-logs/actions', [AuditController::class, 'actions'])->middleware('permission:users.view');
    Route::get('/audit-logs/actors', [AuditController::class, 'actors'])->middleware('permission:users.view');
    Route::get('/audit-logs', [AuditController::class, 'index'])->middleware('permission:users.view');
    Route::delete('/audit-logs', [AuditController::class, 'clear'])->middleware('permission:settings.edit-general');

    // System health — live probes, gated behind settings read.
    Route::get('/system/health/history', [HealthController::class, 'history'])->middleware('permission:settings.view');
    Route::get('/system/health', [HealthController::class, 'show'])->middleware('permission:settings.view');

    // Scheduled-task monitoring for /admin/cron-setup. Read is gated behind
    // settings read; "Run now" needs write, because it sends real mail.
    Route::get('/cron/status', [CronController::class, 'status'])->middleware('permission:settings.view');
    Route::post('/cron/run-now', [CronController::class, 'runNow'])->middleware('permission:settings.edit-general');

    // Settings — read is broad, writes are gated per group.
    // Fixed segments come first so `api-keys` is never captured as `{group}`.
    Route::get('/settings/api-keys', [SettingsController::class, 'listApiKeys'])->middleware('permission:settings.view');
    Route::post('/settings/api-keys', [SettingsController::class, 'generateApiKey'])->middleware('permission:settings.edit-general');
    Route::delete('/settings/api-keys/{id}', [SettingsController::class, 'revokeApiKey'])->middleware('permission:settings.edit-general');
    Route::post('/settings/smtp/test', [SettingsController::class, 'testSmtp'])->middleware('permission:settings.edit-general');
    Route::post('/settings/cache/purge', [SettingsController::class, 'purgeCache'])->middleware('permission:settings.edit-general');
    Route::get('/settings/{group}', [SettingsController::class, 'show'])->middleware('permission:settings.view');
    Route::patch('/settings/{group}', [SettingsController::class, 'update'])->middleware('permission:settings.edit-general');

    // Workspace reset — destructive dev operation, requires highest permission.
    Route::post('/workspace/reset', [WorkspaceController::class, 'reset'])->middleware('permission:settings.edit-general');

    // -----------------------------------------------------------------------
    // Virtual Data Room administration.
    //
    // Gated per endpoint, not per group, so reading the room does not imply
    // issuing access to it. `data-room.manage-settings` and `data-room.delete`
    // are withheld from the ordinary `admin` role in RoleSeeder, which is what
    // keeps the security policy and hard deletes with super_admin.
    //
    // The caching and indexing posture for this group is applied globally by
    // App\Http\Middleware\DataRoomAdminNoStore, which is prepended in
    // bootstrap/app.php so it also covers the 401 and 403 the exception handler
    // renders. Authorization stays on each individual route.
    // -----------------------------------------------------------------------
    Route::prefix('admin/dataroom')->group(function () {
        Route::get('/overview', [AdminDataRoomController::class, 'overview'])->middleware('permission:data-room.view');
        Route::get('/analytics', [AdminDataRoomController::class, 'analytics'])->middleware('permission:data-room.view-activity');
        Route::get('/audit-logs', [AdminDataRoomController::class, 'auditLogs'])->middleware('permission:data-room.view-activity');
        Route::get('/settings', [AdminDataRoomController::class, 'settings'])->middleware('permission:data-room.view');
        Route::patch('/settings', [AdminDataRoomController::class, 'updateSettings'])->middleware('permission:data-room.manage-settings');
        Route::post('/emergency', [AdminDataRoomController::class, 'emergency'])->middleware('permission:data-room.manage-settings');

        // Folders
        Route::get('/folders', [AdminDataRoomFolderController::class, 'index'])->middleware('permission:data-room.view');
        Route::post('/folders/reorder', [AdminDataRoomFolderController::class, 'reorder'])->middleware('permission:data-room.manage-documents');
        Route::post('/folders', [AdminDataRoomFolderController::class, 'store'])->middleware('permission:data-room.manage-documents');
        Route::patch('/folders/{id}', [AdminDataRoomFolderController::class, 'update'])->middleware('permission:data-room.manage-documents');
        Route::delete('/folders/{id}', [AdminDataRoomFolderController::class, 'destroy'])->middleware('permission:data-room.manage-documents');

        // Documents. Uploading is its own permission, separate from editing
        // metadata, because putting new bytes in the room is a different act.
        Route::get('/documents', [AdminDataRoomDocumentController::class, 'index'])->middleware('permission:data-room.view');
        Route::post('/documents', [AdminDataRoomDocumentController::class, 'store'])->middleware('permission:data-room.upload');
        Route::get('/documents/{id}', [AdminDataRoomDocumentController::class, 'show'])->middleware('permission:data-room.view');
        Route::get('/documents/{id}/preview', [AdminDataRoomDocumentController::class, 'preview'])->middleware('permission:data-room.view');
        Route::patch('/documents/{id}', [AdminDataRoomDocumentController::class, 'update'])->middleware('permission:data-room.manage-documents');
        Route::post('/documents/{id}/versions', [AdminDataRoomDocumentController::class, 'storeVersion'])->middleware('permission:data-room.upload');
        Route::post('/documents/{id}/restore', [AdminDataRoomDocumentController::class, 'restore'])->middleware('permission:data-room.manage-documents');
        // Soft delete needs manage-documents; `?purge=1` also destroys bytes,
        // so the route carries the stricter data-room.delete gate.
        Route::delete('/documents/{id}', [AdminDataRoomDocumentController::class, 'destroy'])->middleware('permission:data-room.delete');

        // Access grants — the authorization surface.
        Route::get('/grants', [AdminDataRoomGrantController::class, 'index'])->middleware('permission:data-room.manage-access');
        Route::get('/grants/durations', [AdminDataRoomGrantController::class, 'durations'])->middleware('permission:data-room.manage-access');
        Route::post('/grants', [AdminDataRoomGrantController::class, 'store'])->middleware('permission:data-room.manage-access');
        Route::get('/grants/{id}', [AdminDataRoomGrantController::class, 'show'])->middleware('permission:data-room.manage-access');
        Route::patch('/grants/{id}', [AdminDataRoomGrantController::class, 'update'])->middleware('permission:data-room.manage-access');
        Route::post('/grants/{id}/status', [AdminDataRoomGrantController::class, 'status'])->middleware('permission:data-room.manage-access');
        Route::post('/grants/{id}/extend', [AdminDataRoomGrantController::class, 'extend'])->middleware('permission:data-room.manage-access');
        Route::post('/grants/{id}/regenerate', [AdminDataRoomGrantController::class, 'regenerate'])->middleware('permission:data-room.manage-access');
        Route::delete('/grants/{id}', [AdminDataRoomGrantController::class, 'destroy'])->middleware('permission:data-room.manage-access');
        Route::get('/permission-matrix', [AdminDataRoomGrantController::class, 'matrix'])->middleware('permission:data-room.manage-access');

        // Saved templates
        Route::get('/templates', [AdminDataRoomTemplateController::class, 'index'])->middleware('permission:data-room.manage-access');
        Route::post('/templates', [AdminDataRoomTemplateController::class, 'store'])->middleware('permission:data-room.manage-access');
        Route::patch('/templates/{id}', [AdminDataRoomTemplateController::class, 'update'])->middleware('permission:data-room.manage-access');
        Route::delete('/templates/{id}', [AdminDataRoomTemplateController::class, 'destroy'])->middleware('permission:data-room.manage-access');
    });
});
