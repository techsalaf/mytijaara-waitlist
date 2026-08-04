<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\AdminNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /notifications — current admin's notifications (newest first).
     *
     * `type` and `unread` filter server-side so the tabs in the admin bell menu
     * are real queries rather than a client-side slice of the last 50 rows.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'type' => ['nullable', 'string'],
            'unread' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $userId = $request->user()->id;

        $query = AdminNotification::query()
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)->orWhereNull('user_id');
            });

        $type = $filters['type'] ?? null;
        if ($type && $type !== 'all' && in_array($type, AdminNotification::TYPES, true)) {
            $query->where('type', $type);
        }

        if ($request->boolean('unread')) {
            $query->where('read', false);
        }

        $notifications = (clone $query)
            ->orderByDesc('created_at')
            ->limit((int) ($filters['per_page'] ?? 50))
            ->get();

        // Unread count is over the whole visible set, not just this page, so the
        // badge does not shrink when a filter is applied.
        $unread = AdminNotification::query()
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)->orWhereNull('user_id');
            })
            ->where('read', false)
            ->count();

        return response()->json([
            'data' => NotificationResource::collection($notifications),
            'meta' => ['unread' => $unread],
        ]);
    }

    /** PATCH /notifications/:id/read */
    public function markRead(Request $request, int $id): JsonResponse
    {
        $n = AdminNotification::query()
            ->whereKey($id)
            ->where(function ($q) use ($request) {
                $q->where('user_id', $request->user()->id)->orWhereNull('user_id');
            })
            ->firstOrFail();
        $n->update(['read' => true]);

        return response()->json(['data' => new NotificationResource($n)]);
    }

    /** POST /notifications/read-all */
    public function markAllRead(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $updated = AdminNotification::where(function ($q) use ($userId) {
            $q->where('user_id', $userId)->orWhereNull('user_id');
        })->where('read', false)->update(['read' => true]);

        return response()->json(['data' => ['updated' => $updated]]);
    }

    /**
     * POST /notifications/clear — delete the already-read rows.
     *
     * Unread rows survive on purpose: "Clear" in the UI means "clean up what I
     * have already seen", not "drop events I never looked at".
     */
    public function clear(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $deleted = AdminNotification::where(function ($q) use ($userId) {
            $q->where('user_id', $userId)->orWhereNull('user_id');
        })->where('read', true)->delete();

        return response()->json(['data' => ['deleted' => $deleted]]);
    }

    /** DELETE /notifications/:id */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;
        $n = AdminNotification::query()
            ->whereKey($id)
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)->orWhereNull('user_id');
            })
            ->firstOrFail();
        $n->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
