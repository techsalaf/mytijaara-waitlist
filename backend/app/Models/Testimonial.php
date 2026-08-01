<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Testimonial extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'role', 'quote', 'rating', 'avatar', 'order', 'published'];

    protected $casts = [
        'published' => 'boolean',
        'rating' => 'integer',
        'order' => 'integer',
    ];
}
