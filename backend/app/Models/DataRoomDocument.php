<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class DataRoomDocument extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'dataroom_documents';

    protected $fillable = [
        'uuid',
        'folder_id',
        'title',
        'description',
        'file_path',
        'original_filename',
        'file_type',
        'file_size',
        'version',
        'status',
        'confidentiality_level',
        'checksum',
        'tags',
        'sort_order',
        'downloads_permitted',
        'start_here_order',
        'view_count',
        'download_count',
        'uploaded_by',
    ];

    protected $hidden = [
        // The storage path is an internal detail. Keeping it out of every
        // serialized payload means an admin JSON response can never become the
        // source of a leaked file location.
        'file_path',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'sort_order' => 'integer',
            'downloads_permitted' => 'boolean',
            'start_here_order' => 'integer',
            'view_count' => 'integer',
            'download_count' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(DataRoomFolder::class, 'folder_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DataRoomDocumentVersion::class, 'document_id');
    }

    /**
     * The Content-Type to serve this document as.
     *
     * Derived from the stored extension, which DocumentUploader has already
     * cross-checked against the file's real magic bytes. Anything unrecognised
     * falls back to octet-stream so an unexpected type is downloaded rather
     * than rendered, which is what stops a stored-XSS via Content-Type.
     */
    public function mimeType(): string
    {
        return match (strtolower((string) $this->file_type)) {
            'pdf' => 'application/pdf',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls' => 'application/vnd.ms-excel',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc' => 'application/msword',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'ppt' => 'application/vnd.ms-powerpoint',
            'csv' => 'text/csv',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'zip' => 'application/zip',
            default => 'application/octet-stream',
        };
    }

    /**
     * Can this type be shown in the in-browser viewer?
     *
     * Deliberately short. Office formats are not listed because rendering them
     * would mean handing the original bytes to a third-party viewer, and a
     * viewer that leaks the file is worse than no viewer. Those show
     * "Preview unavailable" instead.
     */
    public function isPreviewable(): bool
    {
        return in_array(strtolower((string) $this->file_type), ['pdf', 'png', 'jpg', 'jpeg'], true);
    }

    /** Only PDFs can carry a per-page watermark. */
    public function isWatermarkable(): bool
    {
        return strtolower((string) $this->file_type) === 'pdf';
    }
}
