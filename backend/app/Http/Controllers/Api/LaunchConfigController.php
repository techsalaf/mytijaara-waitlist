<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LaunchConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LaunchConfigController extends Controller
{
    private const CACHE_KEY = 'launch_config';

    /** GET /launch-config — PUBLIC, short-TTL cached. */
    public function show(): JsonResponse
    {
        $data = Cache::remember(self::CACHE_KEY, now()->addMinutes(5), function () {
            return LaunchConfig::query()->latest('id')->first()?->data ?? [];
        });

        return response()->json(['data' => $data]);
    }

    /** PATCH /launch-config — admin merge-update. */
    public function update(Request $request): JsonResponse
    {
        $config = LaunchConfig::query()->latest('id')->first() ?? new LaunchConfig(['data' => []]);

        // Deep-merge the incoming patch over the current config.
        $merged = $this->deepMerge($config->data ?? [], $request->all());
        $config->data = $merged;
        $config->updated_by = $request->user()?->id;
        $config->save();

        Cache::forget(self::CACHE_KEY);

        return response()->json(['data' => $config->data]);
    }

    private function deepMerge(array $base, array $patch): array
    {
        foreach ($patch as $key => $value) {
            if (is_array($value) && isset($base[$key]) && is_array($base[$key]) && $this->isAssoc($value)) {
                $base[$key] = $this->deepMerge($base[$key], $value);
            } else {
                $base[$key] = $value;
            }
        }

        return $base;
    }

    private function isAssoc(array $arr): bool
    {
        return array_keys($arr) !== range(0, count($arr) - 1);
    }
}
