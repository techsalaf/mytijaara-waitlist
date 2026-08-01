<?php

namespace App\Support;

/** Display metadata for spatie role slugs. Mirrors src/lib/mock-data.ts `roles`. */
class RoleMeta
{
    public const LABELS = [
        'super_admin' => 'Super Admin',
        'admin' => 'Admin',
        'marketing' => 'Marketing',
        'content_editor' => 'Content Editor',
        'analyst' => 'Analyst',
        'support' => 'Support',
    ];

    public const DESCRIPTIONS = [
        'super_admin' => 'Full access to all modules and settings',
        'admin' => 'Manage content, users and campaigns',
        'marketing' => 'Campaigns, referrals and analytics',
        'content_editor' => 'CMS and media library only',
        'analyst' => 'Read-only access to analytics',
        'support' => 'View users, respond to messages',
    ];

    public const COLORS = [
        'super_admin' => '#0D7A46',
        'admin' => '#166534',
        'marketing' => '#D4A017',
        'content_editor' => '#0891b2',
        'analyst' => '#7c3aed',
        'support' => '#64748b',
    ];

    public static function label(string $slug): string
    {
        return self::LABELS[$slug] ?? ucwords(str_replace('_', ' ', $slug));
    }

    public static function description(string $slug): string
    {
        return self::DESCRIPTIONS[$slug] ?? '';
    }

    public static function color(string $slug): string
    {
        return self::COLORS[$slug] ?? '#64748b';
    }

    /** Initials for an avatar chip, e.g. "Adaeze Okafor" -> "AO". */
    public static function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $letters = array_map(fn ($p) => mb_strtoupper(mb_substr($p, 0, 1)), $parts);

        return implode('', array_slice($letters, 0, 2));
    }
}
