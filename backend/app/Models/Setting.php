<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['group', 'data', 'updated_by'];

    protected $casts = [
        'data' => 'array',
    ];
}
