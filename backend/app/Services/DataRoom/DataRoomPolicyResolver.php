<?php

namespace App\Services\DataRoom;

use App\Models\DataRoomSetting;
use Illuminate\Support\Facades\Hash;

/**
 * Combines the two layers of data room policy: config/dataroom.php (owned by
 * whoever controls the environment) and the dataroom_settings row (owned by an
 * administrator in the UI).
 *
 * The environment always wins on switches that close the room. An operator who
 * sets DATA_ROOM_ENABLED=false has taken the room offline and no admin session,
 * compromised or otherwise, can turn it back on through the API. Conversely an
 * admin can always tighten what the environment permits: emergency lockdown,
 * disabling downloads, and disabling watermarks are all honoured.
 */
class DataRoomPolicyResolver
{
    public function settings(): DataRoomSetting
    {
        return DataRoomSetting::current();
    }

    /** Is the data room open for visitor traffic at all? */
    public function isOpen(): bool
    {
        if (! config('dataroom.enabled', true)) {
            return false;
        }

        $settings = $this->settings();

        return $settings->enabled && ! $settings->emergency_lockdown;
    }

    /**
     * Why the room is closed, as a message safe to return to an unauthenticated
     * caller. Deliberately identical for "disabled" and "locked down" so the
     * response does not report the state of an internal switch.
     */
    public function closedMessage(): string
    {
        return 'The data room is not currently available. Please contact your MyTijaara contact for assistance.';
    }

    /**
     * Is a global PIN required before per-visitor credentials are accepted?
     *
     * Requires both a switch and an actual hash to compare against; a switch
     * turned on with no hash configured would otherwise be an open door.
     */
    public function pinRequired(): bool
    {
        return $this->pinHash() !== null;
    }

    /** Verify a submitted PIN against the configured hash. */
    public function pinMatches(?string $pin): bool
    {
        $hash = $this->pinHash();

        if ($hash === null) {
            return true;
        }

        if ($pin === null || $pin === '') {
            return false;
        }

        return Hash::check($pin, $hash);
    }

    /**
     * The hash to compare against, or null when no PIN gate is active. The
     * environment value takes precedence so a PIN can be pinned at deploy time
     * and not changed from the admin UI.
     */
    private function pinHash(): ?string
    {
        $fromEnv = config('dataroom.master_pin_hash');

        if (is_string($fromEnv) && $fromEnv !== '') {
            return $fromEnv;
        }

        $settings = $this->settings();

        if ($settings->global_pin_enabled && is_string($settings->global_pin_hash) && $settings->global_pin_hash !== '') {
            return $settings->global_pin_hash;
        }

        return null;
    }

    /** Idle timeout in minutes. The admin setting may only shorten it. */
    public function idleTimeoutMinutes(): int
    {
        $ceiling = max(1, (int) config('dataroom.idle_timeout', 30));
        $configured = (int) $this->settings()->session_timeout_minutes;

        return $configured > 0 ? min($ceiling, $configured) : $ceiling;
    }

    /** Absolute session lifetime in minutes. Activity cannot extend past this. */
    public function absoluteTtlMinutes(): int
    {
        return max($this->idleTimeoutMinutes(), (int) config('dataroom.session_ttl', 480));
    }

    public function maxFailedAttempts(): int
    {
        $ceiling = max(1, (int) config('dataroom.max_failed_attempts', 5));
        $configured = (int) $this->settings()->max_failed_attempts;

        return $configured > 0 ? min($ceiling, $configured) : $ceiling;
    }

    public function lockoutSeconds(): int
    {
        return max(60, (int) config('dataroom.lockout_seconds', 900));
    }

    /** Watermarking needs both layers on. */
    public function watermarkEnabled(): bool
    {
        return (bool) config('dataroom.watermark_enabled', true) && $this->settings()->watermark_enabled;
    }

    public function downloadsEnabled(): bool
    {
        return (bool) $this->settings()->downloads_enabled;
    }
}
