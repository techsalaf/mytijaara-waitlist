<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailCampaign;
use App\Models\EmailEvent;
use App\Models\AnalyticsEvent;
use App\Models\Referral;
use App\Models\WaitlistEntry;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Workspace reset controller.
 *
 * Destructive dev-only operations that clear all user-generated data.
 * NEVER expose this in production without additional safety gates.
 */
class WorkspaceController extends Controller
{
    /**
     * POST /workspace/reset
     *
     * Force-deletes all waitlist entries, referrals, campaigns, email events,
     * and analytics visits. Leaves settings, roles, users, CMS, and media intact.
     */
    public function reset(): JsonResponse
    {
        try {
            DB::transaction(function () {
                $deleted = [
                    'email_events' => EmailEvent::count(),
                    'referrals' => Referral::count(),
                    'campaigns' => EmailCampaign::count(),
                    'waitlist_entries' => WaitlistEntry::withTrashed()->count(),
                    'analytics_events' => AnalyticsEvent::count(),
                    'notifications' => DatabaseNotification::count(),
                ];

                // Disable foreign key checks for clean truncation across engines (SQLite/MySQL)
                Schema::disableForeignKeyConstraints();

                EmailEvent::query()->delete();
                Referral::query()->delete();
                EmailCampaign::query()->delete();
                WaitlistEntry::withTrashed()->forceDelete();
                AnalyticsEvent::query()->delete();
                DatabaseNotification::query()->delete();

                Schema::enableForeignKeyConstraints();

                Log::info('workspace_reset', ['deleted' => $deleted, 'admin' => auth()->id()]);
            });

            return response()->json([
                'data' => ['message' => 'Workspace reset complete. All data cleared.'],
            ]);
        } catch (\Throwable $e) {
            Log::error('workspace_reset_failed', ['error' => $e->getMessage()]);

            return response()->json([
                'error' => 'Workspace reset failed. Check logs for details.',
            ], 500);
        }
    }
}
