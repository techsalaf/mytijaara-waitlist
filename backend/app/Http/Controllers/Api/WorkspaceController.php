<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campaign;
use App\Models\EmailEvent;
use App\Models\Event;
use App\Models\Referral;
use App\Models\WaitlistEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
     *
     * This is a hard delete, not soft delete. Unrecoverable.
     */
    public function reset(): JsonResponse
    {
        try {
            DB::transaction(function () {
                // Order matters: foreign keys require children before parents.
                $deleted = [
                    'email_events' => EmailEvent::count(),
                    'referrals' => Referral::count(),
                    'campaigns' => Campaign::count(),
                    'waitlist_entries' => WaitlistEntry::withTrashed()->count(),
                    'events' => Event::count(),
                ];

                EmailEvent::truncate();
                Referral::truncate();
                Campaign::truncate();
                // Force-delete ALL waitlist entries including soft-deleted ones.
                WaitlistEntry::withTrashed()->forceDelete();
                Event::truncate();

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
