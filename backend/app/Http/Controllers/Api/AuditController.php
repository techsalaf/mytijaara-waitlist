<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    /** GET /audit-logs — paginated activity feed, filtered server-side. */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'action' => ['nullable', 'string', 'max:120'],
            'user' => ['nullable', 'string', 'max:120'],
            'search' => ['nullable', 'string', 'max:255'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = AuditLog::query()->with('user');

        $action = $request->input('action');
        if ($action && $action !== 'all') {
            $query->where('action', $action);
        }

        $user = $request->string('user')->trim()->value();
        if ($user && $user !== 'all') {
            // Match either the denormalised actor name or the linked account,
            // because rows written before a rename keep the old actor string.
            $query->where(function ($q) use ($user) {
                $q->where('actor', 'like', "%{$user}%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$user}%"));
            });
        }

        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function ($q) use ($search) {
                $q->where('actor', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('target', 'like', "%{$search}%");
            });
        }

        if ($from = $request->input('from')) {
            $query->where('created_at', '>=', date('Y-m-d 00:00:00', strtotime($from)));
        }
        if ($to = $request->input('to')) {
            $query->where('created_at', '<=', date('Y-m-d 23:59:59', strtotime($to)));
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

    /** GET /audit-logs/actions — distinct action names for the filter dropdown. */
    public function actions(): JsonResponse
    {
        $actions = AuditLog::query()
            ->select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action')
            ->filter()
            ->values()
            ->all();

        return response()->json(['data' => $actions]);
    }

    /** GET /audit-logs/actors — distinct actor names for the user filter. */
    public function actors(): JsonResponse
    {
        $actors = AuditLog::query()
            ->select('actor')
            ->distinct()
            ->orderBy('actor')
            ->pluck('actor')
            ->filter()
            ->values()
            ->all();

        return response()->json(['data' => $actors]);
    }

    /** DELETE /audit-logs — purge all entries. Requires settings.edit-general. */
    public function clear(): JsonResponse
    {
        $count = AuditLog::query()->count();
        AuditLog::query()->delete();

        return response()->json(['data' => ['cleared' => $count]]);
    }
}
