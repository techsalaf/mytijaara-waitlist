<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\AdminNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /** GET /notifications — current admin's notifications (newest first). */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $notifications = AdminNotification::query()
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)->orWhereNull('user_id');
            })
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => NotificationResource::collection($notifications),
            'meta' => ['unread' => $notifications->where('read', false)->count()],
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
        AdminNotification::where(function ($q) use ($userId) {
            $q->where('user_id', $userId)->orWhereNull('user_id');
        })->update(['read' => true]);

        return response()->json(['data' => ['ok' => true]]);
    }
}
