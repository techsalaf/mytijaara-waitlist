<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmailCampaign extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'public_id', 'name', 'subject', 'html', 'status', 'template_id', 'segment',
        'recipients', 'sent', 'opens', 'clicks', 'bounces',
        'scheduled_at', 'sent_at', 'created_by',
    ];

    protected $casts = [
        'segment' => 'array',
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(EmailTemplate::class, 'template_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(EmailEvent::class, 'campaign_id');
    }

    /**
     * Next free `cmp_NNN` public id.
     *
     * Counts `withTrashed()` so a soft-deleted campaign cannot hand its id to a
     * new row, and still probes in a loop because the count alone is not unique
     * once anything has been hard-deleted.
     */
    public static function nextPublicId(): string
    {
        $n = static::withTrashed()->count() + 1;

        do {
            $id = 'cmp_'.str_pad((string) $n++, 3, '0', STR_PAD_LEFT);
        } while (static::withTrashed()->where('public_id', $id)->exists());

        return $id;
    }
}
