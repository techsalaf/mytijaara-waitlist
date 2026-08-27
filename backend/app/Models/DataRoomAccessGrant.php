<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class DataRoomAccessGrant extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'dataroom_access_grants';

    protected $fillable = [
        'uuid',
        'visitor_name',
        'visitor_email',
        'organization',
        'role_title',
        'access_code_hash',
        'code_hint',
        'starts_at',
        'expires_at',
        'max_uses',
        'current_uses',
        'status',
        'all_documents_access',
        'downloads_permitted',
        'notes',
        'created_by',
        'last_accessed_at',
        'acknowledged_at',
    ];

    protected $hidden = [
        // Never serialize the code hash to any client, admin included.
        'access_code_hash',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'last_accessed_at' => 'datetime',
            'acknowledged_at' => 'datetime',
            'all_documents_access' => 'boolean',
            'downloads_permitted' => 'boolean',
            'max_uses' => 'integer',
            'current_uses' => 'integer',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(
            DataRoomDocument::class,
            'dataroom_access_grant_documents',
            'access_grant_id',
            'document_id'
        )->withPivot(['can_download', 'can_print']);
    }

    public function folders(): BelongsToMany
    {
        return $this->belongsToMany(
            DataRoomFolder::class,
            'dataroom_access_grant_folders',
            'access_grant_id',
            'folder_id'
        )->withPivot(['can_download']);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(DataRoomSession::class, 'access_grant_id');
    }

    /**
     * Effective status, derived from the stored status plus the clock and usage
     * counter. The stored column is authoritative for the terminal states an
     * admin sets (revoked / suspended); time and usage are evaluated live so an
     * expiry never depends on a scheduled job having run.
     */
    public function effectiveStatus(): string
    {
        if (in_array($this->status, ['revoked', 'suspended'], true)) {
            return $this->status;
        }

        if ($this->expires_at && now()->greaterThan($this->expires_at)) {
            return 'expired';
        }

        if ($this->max_uses !== null && $this->current_uses >= $this->max_uses) {
            return 'exhausted';
        }

        if ($this->starts_at && now()->lessThan($this->starts_at)) {
            return 'pending';
        }

        return $this->status === 'active' ? 'active' : $this->status;
    }

    public function isActive(): bool
    {
        return $this->effectiveStatus() === 'active';
    }

    /**
     * Kept for convenience. DataRoomAuthorizer holds the canonical logic and is
     * what the HTTP layer calls; this delegates so there is one rule, not two.
     */
    public function canAccessDocument(DataRoomDocument $document): bool
    {
        return app(\App\Services\DataRoom\DataRoomAuthorizer::class)->canAccess($this, $document);
    }
}
