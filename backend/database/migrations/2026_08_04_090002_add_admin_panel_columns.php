<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Columns the admin panel needs to stop faking things:
 *
 *  - `referrals.rewarded_at` / `rewarded_by` so "Send Rewards" is idempotent
 *    and the UI can tell a rewarded referral from a pending one.
 *  - `roles.description` / `color` so a role created in the admin keeps the
 *    copy the admin typed instead of falling back to RoleMeta defaults.
 *  - `users.timezone` / `avatar_url` so the Profile tab has somewhere to save.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('referrals', function (Blueprint $table) {
            $table->timestamp('rewarded_at')->nullable()->after('converted_at');
            $table->unsignedBigInteger('rewarded_by')->nullable()->after('rewarded_at');
            $table->string('reward_note')->nullable()->after('rewarded_by');
            $table->index('rewarded_at');
        });

        $rolesTable = config('permission.table_names.roles', 'roles');

        Schema::table($rolesTable, function (Blueprint $table) {
            $table->string('label')->nullable()->after('name');
            $table->string('description')->nullable()->after('label');
            $table->string('color', 32)->nullable()->after('description');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('timezone')->nullable()->after('phone');
            $table->string('avatar_url', 2048)->nullable()->after('avatar');
        });
    }

    public function down(): void
    {
        Schema::table('referrals', function (Blueprint $table) {
            $table->dropIndex(['rewarded_at']);
            $table->dropColumn(['rewarded_at', 'rewarded_by', 'reward_note']);
        });

        Schema::table(config('permission.table_names.roles', 'roles'), function (Blueprint $table) {
            $table->dropColumn(['label', 'description', 'color']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['timezone', 'avatar_url']);
        });
    }
};
