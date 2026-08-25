<?php

use Database\Seeders\EmailSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Re-seed email templates to apply dynamic real logo and new welcome email content.
     */
    public function up(): void
    {
        (new EmailSeeder)->run();
    }

    public function down(): void
    {
        // No-op: templates remain preserved.
    }
};
