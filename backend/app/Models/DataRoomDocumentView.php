<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per document interaction by a data room visitor. Kept separate from
 * the audit log so engagement analytics can be aggregated cheaply without
 * scanning the security trail.
 */
class DataRoomDocumentView extends Model
{
    protected $table = 'dataroom_document_views';

    protected $fillable = [
        'document_id',
        'access_grant_id',
        'action_type',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(DataRoomDocument::class, 'document_id');
    }

    public function accessGrant(): BelongsTo
    {
        return $this->belongsTo(DataRoomAccessGrant::class, 'access_grant_id');
    }
}
