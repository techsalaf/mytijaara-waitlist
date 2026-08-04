<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Notifications become clickable and carry context.
 *
 * `link` is an admin-panel path the bell menu navigates to; `meta` holds the
 * ids the event refers to (waitlist public_id, campaign id) so a notification
 * can be traced back to its source row.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_notifications', function (Blueprint $table) {
            $table->string('link')->nullable()->after('type');
            $table->json('meta')->nullable()->after('link');
            $table->index(['type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('admin_notifications', function (Blueprint $table) {
            $table->dropIndex(['type', 'created_at']);
            $table->dropColumn(['link', 'meta']);
        });
    }
};
