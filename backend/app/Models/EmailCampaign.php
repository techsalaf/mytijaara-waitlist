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
     * Finds the lowest available sequence number starting from 1.
     */
    public static function nextPublicId(): string
    {
        $existing = static::pluck('public_id')->toArray();
        $n = 1;
        while (in_array('cmp_' . str_pad((string) $n, 3, '0', STR_PAD_LEFT), $existing, true)) {
            $n++;
        }

        return 'cmp_' . str_pad((string) $n, 3, '0', STR_PAD_LEFT);
    }
}
