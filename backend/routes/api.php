<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\CmsController;
use App\Http\Controllers\Api\ContentController;
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
Route::get('/waitlist/verify/{token}', [WaitlistController::class, 'verify']);

Route::get('/launch-config', [LaunchConfigController::class, 'show']);

Route::post('/events', [EventController::class, 'store']);

Route::post('/referrals/visit', [ReferralController::class, 'visit']);

Route::get('/track/open/{campaign}', [EmailTrackingController::class, 'open']);
Route::get('/track/click/{campaign}', [EmailTrackingController::class, 'click']);
Route::post('/webhooks/email', [EmailTrackingController::class, 'webhook']);
Route::post('/unsubscribe', [EmailTrackingController::class, 'unsubscribe']);

// Public read of published CMS content for the landing page.
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
    Route::post('/waitlist/bulk-delete', [WaitlistController::class, 'bulkDelete'])->middleware('permission:waitlist.bulk-actions');
    Route::post('/waitlist/bulk-update', [WaitlistController::class, 'bulkUpdate'])->middleware('permission:waitlist.bulk-actions');
    Route::post('/waitlist/restore', [WaitlistController::class, 'restore'])->middleware('permission:waitlist.bulk-actions');

    // Referrals
    Route::middleware('permission:referrals.view')->group(function () {
        Route::get('/referrals/leaderboard', [ReferralController::class, 'leaderboard']);
        Route::get('/referrals/analytics', [ReferralController::class, 'analytics']);
        Route::get('/referrals/{id}', [ReferralController::class, 'show']);
    });

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
    Route::get('/campaigns/{id}', [CampaignController::class, 'show'])->middleware('permission:email.view');
    Route::get('/campaigns/{id}/stats', [CampaignController::class, 'stats'])->middleware('permission:email.view');
    Route::post('/campaigns', [CampaignController::class, 'store'])->middleware('permission:email.create');
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

    // System health — live probes, gated behind settings read.
    Route::get('/system/health/history', [HealthController::class, 'history'])->middleware('permission:settings.view');
    Route::get('/system/health', [HealthController::class, 'show'])->middleware('permission:settings.view');

    // Settings — read is broad, writes are gated per group.
    // Fixed segments come first so `api-keys` is never captured as `{group}`.
    Route::get('/settings/api-keys', [SettingsController::class, 'listApiKeys'])->middleware('permission:settings.view');
    Route::post('/settings/api-keys', [SettingsController::class, 'generateApiKey'])->middleware('permission:settings.edit-general');
    Route::delete('/settings/api-keys/{id}', [SettingsController::class, 'revokeApiKey'])->middleware('permission:settings.edit-general');
    Route::post('/settings/smtp/test', [SettingsController::class, 'testSmtp'])->middleware('permission:settings.edit-general');
    Route::post('/settings/cache/purge', [SettingsController::class, 'purgeCache'])->middleware('permission:settings.edit-general');
    Route::get('/settings/{group}', [SettingsController::class, 'show'])->middleware('permission:settings.view');
    Route::patch('/settings/{group}', [SettingsController::class, 'update'])->middleware('permission:settings.edit-general');
});
