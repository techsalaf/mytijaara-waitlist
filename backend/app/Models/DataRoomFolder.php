<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DataRoomFolder extends Model
{
    use HasFactory;

    protected $table = 'dataroom_folders';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'sort_order',
    ];

    public function documents(): HasMany
    {
        return $this->hasMany(DataRoomDocument::class, 'folder_id');
    }
}
