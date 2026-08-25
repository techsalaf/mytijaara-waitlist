<?php

use Database\Seeders\CmsSectionSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Seed the download section in CMS.
     */
    public function up(): void
    {
        if (app()->runningUnitTests()) {
            return;
        }

        (new CmsSectionSeeder)->run();
    }

    public function down(): void
    {
        // No-op
    }
};
