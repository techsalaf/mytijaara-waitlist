<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    private const GROUPS = ['company', 'branding', 'seo', 'social', 'smtp', 'integrations', 'api_keys', 'system'];

    /** GET /settings/:group */
    public function show(string $group): JsonResponse
    {
        abort_unless(in_array($group, self::GROUPS, true), 404);

        $row = Setting::firstOrCreate(['group' => $group], ['data' => []]);

        return response()->json(['data' => $this->redact($group, $row->data ?? [])]);
    }

    /** PATCH /settings/:group — merge patch into the group. */
    public function update(Request $request, string $group): JsonResponse
    {
        abort_unless(in_array($group, self::GROUPS, true), 404);

        $row = Setting::firstOrCreate(['group' => $group], ['data' => []]);
        $row->data = array_merge($row->data ?? [], $request->all());
        $row->updated_by = $request->user()?->id;
        $row->save();

        return response()->json(['data' => $this->redact($group, $row->data)]);
    }

    /** Never send raw secrets back to the client. */
    private function redact(string $group, array $data): array
    {
        if ($group === 'integrations' && ! empty($data['resendApiKey'])) {
            $data['resendApiKey'] = $this->mask($data['resendApiKey']);
        }
        if ($group === 'smtp' && ! empty($data['password'])) {
            $data['password'] = '••••••••';
        }

        return $data;
    }

    private function mask(string $value): string
    {
        return strlen($value) <= 4 ? '••••' : str_repeat('•', 8).substr($value, -4);
    }
}
