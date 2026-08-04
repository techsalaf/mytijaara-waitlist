<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A row in the admin bell menu. `user_id` null = broadcast to every admin.
 *
 * Notifications are written by real system events only (waitlist signups,
 * referral conversions, campaign sends, failures). Nothing seeds this table
 * with sample rows.
 */
class AdminNotification extends Model
{
    protected $fillable = ['user_id', 'title', 'body', 'type', 'read', 'link', 'meta'];

    protected $casts = [
        'read' => 'boolean',
        'meta' => 'array',
    ];

    /** Notification categories the UI filters on. */
    public const TYPES = ['signup', 'referral', 'email', 'system', 'error', 'info'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Record a system event as a broadcast notification.
     *
     * @param  array<string,mixed>  $meta
     */
    public static function record(
        string $type,
        string $title,
        string $message = '',
        ?string $link = null,
        array $meta = [],
        ?int $userId = null,
    ): self {
        return self::create([
            'user_id' => $userId,
            'title' => $title,
            'body' => $message,
            'type' => in_array($type, self::TYPES, true) ? $type : 'info',
            'read' => false,
            'link' => $link,
            'meta' => $meta ?: null,
        ]);
    }
}
