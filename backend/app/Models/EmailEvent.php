<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailEvent extends Model
{
    protected $fillable = [
        'campaign_id', 'waitlist_entry_id', 'email', 'type', 'url', 'ip_hash', 'user_agent',
    ];
}
