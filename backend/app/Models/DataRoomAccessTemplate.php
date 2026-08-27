<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A saved permission set an administrator can apply when issuing a grant, so
 * "VC Investor" or "Bank Partner" means the same thing every time instead of
 * being reassembled by hand and getting it subtly wrong.
 *
 * A template is a starting point, not a live link: applying one copies its
 * document and folder lists onto the new grant. Editing a template afterwards
 * does not silently widen access for grants already issued from it.
 */
class DataRoomAccessTemplate extends Model
{
    protected $table = 'dataroom_access_templates';

    protected $fillable = [
        'name',
        'description',
        'all_documents_access',
        'downloads_permitted',
        'default_duration_days',
        'document_ids',
        'folder_ids',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'all_documents_access' => 'boolean',
            'downloads_permitted' => 'boolean',
            'default_duration_days' => 'integer',
            'document_ids' => 'array',
            'folder_ids' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
