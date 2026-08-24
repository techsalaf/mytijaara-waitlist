<?php

namespace App\Support;

use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use PragmaRX\Google2FA\Google2FA;

/**
 * TOTP second factor for admin accounts.
 *
 * The flow is deliberately two-step. `begin()` writes a secret but leaves
 * `two_factor_confirmed_at` null, so the factor is not yet enforced;
 * `confirm()` only flips it on once the user has produced a valid code. That
 * ordering is what stops an admin locking themselves out with a secret their
 * authenticator never actually received.
 *
 * Recovery codes are hashed the same way passwords are, so a database dump
 * yields neither a working secret (encrypted cast) nor a usable code.
 */
class TwoFactor
{
    /** Codes issued per enrolment. Each is single use. */
    public const RECOVERY_CODE_COUNT = 8;

    /** Clock drift tolerance, in 30-second windows either side of now. */
    private const WINDOW = 1;

    private static function engine(): Google2FA
    {
        return new Google2FA;
    }

    /**
     * Start enrolment: fresh secret, fresh recovery codes, not yet confirmed.
     *
     * @return array{secret:string,otpauthUrl:string,qrSvg:string,recoveryCodes:array<int,string>}
     */
    public static function begin(User $user): array
    {
        $engine = self::engine();
        $secret = $engine->generateSecretKey();

        $plainCodes = self::generateRecoveryCodes();

        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_recovery_codes' => array_map(
                fn (string $code) => hash('sha256', $code),
                $plainCodes,
            ),
            // Stays null until `confirm()` sees a valid code.
            'two_factor_confirmed_at' => null,
        ])->save();

        $url = $engine->getQRCodeUrl(self::issuer(), $user->email, $secret);

        return [
            'secret' => $secret,
            'otpauthUrl' => $url,
            'qrSvg' => self::qrSvg($url),
            'recoveryCodes' => $plainCodes,
        ];
    }

    /**
     * Finish enrolment. Returns false on a bad code, leaving 2FA off.
     */
    public static function confirm(User $user, string $code): bool
    {
        if ($user->two_factor_secret === null) {
            return false;
        }
        if (! self::verifyTotp($user, $code)) {
            return false;
        }

        $user->forceFill(['two_factor_confirmed_at' => now()])->save();

        return true;
    }

    /** Clear every trace of the second factor. */
    public static function disable(User $user): void
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();
    }

    /**
     * Issue a new set of codes for an already-enabled factor.
     *
     * @return array<int,string>
     */
    public static function regenerateRecoveryCodes(User $user): array
    {
        $plainCodes = self::generateRecoveryCodes();

        $user->forceFill([
            'two_factor_recovery_codes' => array_map(
                fn (string $code) => hash('sha256', $code),
                $plainCodes,
            ),
        ])->save();

        return $plainCodes;
    }

    /**
     * Verify a login challenge: a TOTP code, or a recovery code.
     *
     * A matching recovery code is consumed, so the same code can never be
     * replayed by anyone who read it over the user's shoulder.
     */
    public static function verifyChallenge(User $user, string $code): bool
    {
        if (self::verifyTotp($user, $code)) {
            return true;
        }

        return self::consumeRecoveryCode($user, $code);
    }

    /** How many single-use codes the user has left. */
    public static function remainingRecoveryCodes(User $user): int
    {
        $codes = $user->two_factor_recovery_codes;

        return is_array($codes) ? count($codes) : 0;
    }

    private static function verifyTotp(User $user, string $code): bool
    {
        $secret = $user->two_factor_secret;
        if (! is_string($secret) || $secret === '') {
            return false;
        }

        $digits = preg_replace('/\D/', '', $code) ?? '';
        if (strlen($digits) !== 6) {
            return false;
        }

        try {
            return (bool) self::engine()->verifyKey($secret, $digits, self::WINDOW);
        } catch (\Throwable) {
            // A malformed stored secret must read as "wrong code", not a 500.
            return false;
        }
    }

    private static function consumeRecoveryCode(User $user, string $code): bool
    {
        $stored = $user->two_factor_recovery_codes;
        if (! is_array($stored) || $stored === []) {
            return false;
        }

        $candidate = hash('sha256', strtolower(trim($code)));
        $remaining = array_values(array_filter(
            $stored,
            fn ($hash) => ! hash_equals((string) $hash, $candidate),
        ));

        if (count($remaining) === count($stored)) {
            return false;
        }

        $user->forceFill(['two_factor_recovery_codes' => $remaining])->save();

        return true;
    }

    /** @return array<int,string> */
    private static function generateRecoveryCodes(): array
    {
        $codes = [];
        for ($i = 0; $i < self::RECOVERY_CODE_COUNT; $i++) {
            $codes[] = strtolower(bin2hex(random_bytes(2)).'-'.bin2hex(random_bytes(2)));
        }

        return $codes;
    }

    /** Inline SVG so the client never has to fetch the QR from a third party. */
    private static function qrSvg(string $url): string
    {
        try {
            $writer = new Writer(new ImageRenderer(new RendererStyle(220, 0), new SvgImageBackEnd));

            return $writer->writeString($url);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('TwoFactor QR SVG generation error: ' . $e->getMessage());
            return '';
        }
    }

    private static function issuer(): string
    {
        return (string) config('app.name', 'MyTijaara');
    }
}
