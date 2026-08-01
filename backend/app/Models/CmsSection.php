<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsSection extends Model
{
    protected $fillable = [
        'section', 'title', 'data', 'draft', 'enabled', 'published', 'order',
        'scheduled_at', 'updated_by',
    ];

    protected $casts = [
        'data' => 'array',
        'draft' => 'array',
        'enabled' => 'boolean',
        'published' => 'boolean',
        'order' => 'integer',
        'scheduled_at' => 'datetime',
    ];
}
