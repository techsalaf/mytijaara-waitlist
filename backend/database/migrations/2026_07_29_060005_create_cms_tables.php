<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // CMS sections — one row per landing-page section, keyed by section slug.
        Schema::create('cms_sections', function (Blueprint $table) {
            $table->id();
            $table->string('section')->unique();          // hero | services | faqs | footer | ...
            $table->string('title')->nullable();
            $table->json('data')->nullable();             // published content
            $table->json('draft')->nullable();            // unpublished edits
            $table->boolean('enabled')->default(true);
            $table->boolean('published')->default(true);
            $table->unsignedInteger('order')->default(0);
            $table->timestamp('scheduled_at')->nullable(); // publish-at time
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('order');
        });

        // FAQ — dedicated table (has its own CRUD + ordering).
        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            $table->string('question');
            $table->text('answer');
            $table->unsignedInteger('order')->default(0);
            $table->boolean('published')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['published', 'order']);
        });

        // Testimonials — dedicated table.
        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('role')->nullable();
            $table->text('quote');
            $table->unsignedTinyInteger('rating')->default(5);
            $table->string('avatar')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->boolean('published')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['published', 'order']);
        });

        // Launch configuration — single JSON row.
        Schema::create('launch_configs', function (Blueprint $table) {
            $table->id();
            $table->json('data');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Settings — one row per group, JSON payload.
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('group')->unique();            // company | branding | seo | smtp | ...
            $table->json('data')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('launch_configs');
        Schema::dropIfExists('testimonials');
        Schema::dropIfExists('faqs');
        Schema::dropIfExists('cms_sections');
    }
};
