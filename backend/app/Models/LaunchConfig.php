<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LaunchConfig extends Model
{
    protected $fillable = ['data', 'updated_by'];

    protected $casts = [
        'data' => 'array',
    ];
}
