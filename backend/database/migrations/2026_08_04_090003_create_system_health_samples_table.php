<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Health probe history.
 *
 * The System Health page charts latency over 24h. Without stored samples that
 * chart can only be faked, so every probe run writes one row here and the chart
 * reads them back. Rows older than the retention window are pruned by the same
 * probe, which keeps the table bounded without needing a scheduler.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_health_samples', function (Blueprint $table) {
            $table->id();
            $table->string('status', 16);
            $table->unsignedInteger('db_latency_ms')->nullable();
            $table->unsignedInteger('cache_latency_ms')->nullable();
            $table->unsignedInteger('storage_latency_ms')->nullable();
            $table->unsignedInteger('queue_pending')->default(0);
            $table->unsignedInteger('queue_failed')->default(0);
            $table->unsignedInteger('errors_last_hour')->default(0);
            $table->timestamp('created_at')->nullable();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_health_samples');
    }
};
