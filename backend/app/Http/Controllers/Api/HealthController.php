<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\SystemHealth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * System health endpoints.
 *
 * `show()` runs every probe live and records a sample; `history()` reads those
 * samples back for the latency chart. Splitting them means opening the page does
 * not silently multiply the probe cost per chart point.
 */
class HealthController extends Controller
{
    /** GET /system/health — run every probe now. */
    public function show(): JsonResponse
    {
        return response()->json(['data' => SystemHealth::probe()]);
    }

    /** GET /system/health/history — recorded samples for the chart. */
    public function history(Request $request): JsonResponse
    {
        $request->validate([
            'hours' => ['nullable', 'integer', 'min:1', 'max:168'],
        ]);

        $hours = (int) $request->input('hours', 24);

        return response()->json([
            'data' => SystemHealth::history($hours),
            'meta' => ['hours' => $hours],
        ]);
    }
}
