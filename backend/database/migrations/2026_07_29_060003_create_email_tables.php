<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->string('public_id')->unique();       // tpl_1 style
            $table->string('name');
            $table->string('category')->default('newsletter');
            $table->string('subject')->nullable();
            $table->longText('html')->nullable();
            $table->longText('text')->nullable();
            $table->string('thumbnail')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('category');
        });

        Schema::create('email_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('public_id')->unique();        // cmp_001 style
            $table->string('name');
            $table->string('subject');
            $table->longText('html')->nullable();
            $table->string('status')->default('draft');   // draft | scheduled | sending | sent
            $table->foreignId('template_id')->nullable()->constrained('email_templates')->nullOnDelete();
            $table->json('segment')->nullable();          // filter rules for the audience

            $table->unsignedInteger('recipients')->default(0);
            $table->unsignedInteger('sent')->default(0);
            $table->unsignedInteger('opens')->default(0);
            $table->unsignedInteger('clicks')->default(0);
            $table->unsignedInteger('bounces')->default(0);

            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('scheduled_at');
        });

        Schema::create('email_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->nullable()->constrained('email_campaigns')->cascadeOnDelete();
            $table->foreignId('waitlist_entry_id')->nullable()->constrained('waitlist_entries')->nullOnDelete();
            $table->string('email')->index();
            $table->string('type');                       // queued | sent | delivered | open | click | bounce | complaint | unsubscribe
            $table->string('url')->nullable();            // for click events
            $table->string('ip_hash')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'type']);
            $table->index('created_at');
        });

        Schema::create('unsubscribes', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unsubscribes');
        Schema::dropIfExists('email_events');
        Schema::dropIfExists('email_campaigns');
        Schema::dropIfExists('email_templates');
    }
};
