<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WaitlistEntryResource;
use App\Models\WaitlistEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LaunchPassController extends Controller
{
    /**
     * GET /launch-pass/{token} — PUBLIC
     * Returns sanitized, strictly public card presentation data.
     * Never exposes email, phone, internal database ID, or full referral graphs.
     */
    public function show(string $token): JsonResponse
    {
        $entry = WaitlistEntry::where('launch_pass_token', $token)->first();

        if (! $entry) {
            // Also allow lookup by referral_code for seamless social links
            $entry = WaitlistEntry::where('referral_code', strtoupper($token))->first();
            if ($entry && ! $entry->launch_pass_token) {
                $entry->launch_pass_token = Str::random(32);
                $entry->save();
            }
        }

        if (! $entry) {
            return response()->json(['error' => 'Launch pass not found.'], 404);
        }

        return response()->json([
            'data' => [
                'token' => $entry->launch_pass_token,
                'launchPassToken' => $entry->launch_pass_token,
                'name' => $entry->name,
                'firstName' => explode(' ', trim($entry->name))[0],
                'launchPassNumber' => $entry->launch_pass_number,
                'position' => $entry->position,
                'city' => $entry->city ?: 'Nigeria',
                'attendingNatcon' => $entry->attending_natcon !== null ? (bool) $entry->attending_natcon : true,
                'referralCode' => $entry->referral_code,
                'joinedAt' => optional($entry->created_at)->toIso8601String(),
            ],
        ]);
    }

    /**
     * POST /waitlist/{publicId}/natcon-preference — PUBLIC
     * Updates attendee preference after registration.
     */
    public function updatePreference(Request $request, string $publicId): JsonResponse
    {
        $attending = $request->input('attending') ?? $request->input('attending_natcon') ?? $request->input('attendingNatcon');
        if ($attending === null) {
            return response()->json([
                'message' => 'The attending field is required.',
                'errors' => ['attending' => ['The attending field is required.']],
            ], 422);
        }

        $entry = WaitlistEntry::where('public_id', $publicId)->firstOrFail();

        if (! $entry->launch_pass_token) {
            $entry->launch_pass_token = Str::random(32);
        }

        $entry->attending_natcon = filter_var($attending, FILTER_VALIDATE_BOOLEAN);
        $entry->save();

        return response()->json([
            'data' => new WaitlistEntryResource($entry->fresh('referredBy')),
            'message' => 'Launch pass preference updated.',
        ]);
    }

    /**
     * POST /launch-pass/lookup — PUBLIC
     * Existing members can retrieve their launch pass by registered email, phone, or referral code.
     * Rate-limited to prevent enumeration attacks.
     */
    public function lookup(Request $request): JsonResponse
    {
        $key = 'launch-pass-lookup:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 15)) {
            return response()->json([
                'message' => 'Too many lookup attempts. Please try again in a few minutes.',
            ], 429);
        }
        RateLimiter::hit($key, 600);

        $data = $request->validate([
            'identifier' => ['required', 'string', 'max:255'],
        ]);

        $query = trim($data['identifier']);
        $digits = preg_replace('/\D+/', '', $query);

        $entry = WaitlistEntry::where('email', strtolower($query))
            ->orWhere('referral_code', strtoupper($query))
            ->orWhere('phone', $query)
            ->when(strlen($digits) >= 8, function ($q) use ($digits) {
                $suffix = substr($digits, -9);
                $q->orWhere('phone', 'like', "%{$suffix}");
            })
            ->first();

        if (! $entry) {
            return response()->json([
                'message' => 'No waitlist record found. Please check your details or join the waitlist.',
            ], 404);
        }

        if (! $entry->launch_pass_token) {
            $entry->launch_pass_token = Str::random(32);
            $entry->save();
        }

        return response()->json([
            'data' => [
                'token' => $entry->launch_pass_token,
                'launchPassToken' => $entry->launch_pass_token,
                'id' => $entry->public_id,
                'publicId' => $entry->public_id,
                'name' => $entry->name,
                'firstName' => explode(' ', trim($entry->name))[0],
                'launchPassNumber' => $entry->launch_pass_number,
                'position' => $entry->position,
                'city' => $entry->city ?: 'Nigeria',
                'attendingNatcon' => $entry->attending_natcon !== null ? (bool) $entry->attending_natcon : true,
                'referralCode' => $entry->referral_code,
            ],
        ]);
    }
}
