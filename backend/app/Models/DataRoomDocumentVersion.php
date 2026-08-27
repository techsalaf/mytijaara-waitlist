<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataRoomDocumentVersion extends Model
{
    use HasFactory;

    protected $table = 'dataroom_document_versions';

    protected $fillable = [
        'document_id',
        'version',
        'file_path',
        'original_filename',
        'file_size',
        'checksum',
        'change_notes',
        'uploaded_by',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(DataRoomDocument::class, 'document_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
