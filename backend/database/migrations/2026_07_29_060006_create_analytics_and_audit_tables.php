<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Analytics events — raw, privacy-aware page/interaction events.
        // Traffic sources, cities, countries, devices, and browsers are all
        // derived from this table by aggregation (see AnalyticsService),
        // rather than kept as separate dimension tables.
        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();
            $table->string('type');                       // page_view | cta_click | conversion | ...
            $table->string('visitor_id')->nullable()->index(); // anonymous, cookie/localStorage id
            $table->string('session_id')->nullable()->index();
            $table->string('path')->nullable();
            $table->string('referrer')->nullable();
            $table->string('source')->nullable();         // resolved traffic source
            $table->string('utm_source')->nullable();
            $table->string('utm_medium')->nullable();
            $table->string('utm_campaign')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->nullable();
            $table->string('device')->nullable();         // iOS | Android | Web | Desktop
            $table->string('browser')->nullable();
            $table->string('ip_hash')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index('type');
            $table->index('created_at');
            $table->index(['type', 'created_at']);
        });

        // Admin notifications.
        Schema::create('admin_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('type')->default('info');      // success | info | warning | error
            $table->boolean('read')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'read']);
        });

        // Audit logs — insert-only record of admin actions.
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor')->nullable();          // denormalised name for display
            $table->string('action');
            $table->string('target')->nullable();
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('changes')->nullable();
            $table->string('ip')->nullable();
            $table->string('device')->nullable();
            $table->timestamps();

            $table->index('created_at');
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('admin_notifications');
        Schema::dropIfExists('analytics_events');
    }
};
