<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Columns the Profile page needs so every tab reads and writes real data.
 *
 *  - `users.location` / `bio` back the two profile fields that previously had
 *    no column to save into.
 *  - `users.preferences` stores the notification toggles as JSON. One column
 *    beats a table because nothing ever queries a single preference.
 *  - `users.two_factor_*` back real TOTP. The secret and the recovery codes are
 *    encrypted at the model layer, so a database dump does not hand over a
 *    working second factor.
 *  - `personal_access_tokens.ip` / `user_agent` turn the Sessions tab into the
 *    real token list. Sanctum records `last_used_at` but not who used it, and
 *    "sign out of devices you don't recognise" is meaningless without that.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('location')->nullable()->after('timezone');
            $table->text('bio')->nullable()->after('location');
            $table->json('preferences')->nullable()->after('bio');
            $table->text('two_factor_secret')->nullable()->after('password');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
        });

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->string('ip', 45)->nullable()->after('last_used_at');
            $table->string('user_agent', 512)->nullable()->after('ip');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'location',
                'bio',
                'preferences',
                'two_factor_secret',
                'two_factor_recovery_codes',
                'two_factor_confirmed_at',
            ]);
        });

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropColumn(['ip', 'user_agent']);
        });
    }
};
