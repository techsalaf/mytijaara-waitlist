<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('waitlist_entries', function (Blueprint $table) {
            $table->boolean('attending_natcon')->nullable()->after('referral_code');
            $table->string('launch_pass_token', 64)->nullable()->unique()->after('attending_natcon');
        });
    }

    public function down(): void
    {
        Schema::table('waitlist_entries', function (Blueprint $table) {
            $table->dropColumn(['attending_natcon', 'launch_pass_token']);
        });
    }
};
