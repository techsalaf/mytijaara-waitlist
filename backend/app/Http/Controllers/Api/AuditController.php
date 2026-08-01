<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    /** GET /audit-logs — paginated activity feed with optional action/user filter. */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query()->with('user');

        if ($action = $request->input('action')) {
            $query->where('action', 'like', "%{$action}%");
        }
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function ($q) use ($search) {
                $q->where('actor', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('target', 'like', "%{$search}%");
            });
        }

        $perPage = min(200, max(1, (int) $request->input('per_page', 50)));
        $page = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => AuditLogResource::collection($page->items()),
            'meta' => [
                'total' => $page->total(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
            ],
        ]);
    }
}
