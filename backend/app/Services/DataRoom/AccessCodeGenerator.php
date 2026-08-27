<?php

namespace App\Services\DataRoom;

/**
 * Generates visitor access codes.
 *
 * Two properties matter. The code must be unguessable, so every character
 * comes from random_int() (CSPRNG) rather than mt_rand or Str::random's
 * general-purpose pool. And it must survive being read aloud on a call or
 * retyped from a screenshot, so the alphabet drops the characters that get
 * confused in print: O/0, I/1/L, S/5, B/8, Z/2, U/V.
 *
 * The generated plaintext is returned to the caller once. Only its bcrypt
 * hash is persisted, plus the last four characters as a lookup hint.
 */
class AccessCodeGenerator
{
    /**
     * 24 unambiguous uppercase letters and digits. Excludes O, I, L, S, B, Z,
     * U, 0, 1, 2, 5, 8.
     */
    public const ALPHABET = 'ACDEFGHJKMNPQRTVWXY34679';

    /** Characters per group. Two groups gives 24^8 ≈ 1.1e11 possibilities. */
    private const GROUP_LENGTH = 4;

    private const GROUPS = 2;

    private const PREFIX = 'MTJ';

    /**
     * A code in the form MTJ-8F4K-92QX (using only unambiguous characters).
     *
     * Search space is 24^8, about 110 billion. Combined with the per-IP
     * lockout in DataRoomVisitorAuthController that puts online guessing far
     * out of reach; the codes are not intended to resist an offline attack on
     * a stolen hash table, which is what bcrypt is for.
     */
    public function generate(): string
    {
        $groups = [];

        for ($g = 0; $g < self::GROUPS; $g++) {
            $groups[] = $this->randomGroup(self::GROUP_LENGTH);
        }

        return self::PREFIX.'-'.implode('-', $groups);
    }

    private function randomGroup(int $length): string
    {
        $max = strlen(self::ALPHABET) - 1;
        $out = '';

        for ($i = 0; $i < $length; $i++) {
            // random_int() is the only integer source here; it draws from the
            // OS CSPRNG and throws rather than degrading if none is available.
            $out .= self::ALPHABET[random_int(0, $max)];
        }

        return $out;
    }

    /**
     * Normalize what a visitor typed before comparing it to a hash. Investors
     * paste codes out of email clients that lowercase them, add spaces, or
     * swap the hyphen for an en dash; none of that should be a failed login.
     */
    public function normalize(string $input): string
    {
        $upper = strtoupper(trim($input));

        // Unify dash variants, then strip everything that is not part of the
        // alphabet or the separator.
        $upper = str_replace(["\u{2010}", "\u{2011}", "\u{2012}", "\u{2013}", "\u{2014}", '_', ' '], '-', $upper);

        return (string) preg_replace('/[^A-Z0-9-]/', '', $upper);
    }

    /** Last four characters, stored so an admin can match a grant to a code. */
    public function hint(string $code): string
    {
        return substr($code, -4);
    }
}
