<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('waitlist_entries', function (Blueprint $table) {
            $table->id();
            $table->string('public_id')->unique();          // wl_00001 style id exposed to the frontend
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('role')->default('customer');     // customer | vendor | rider | artisan
            $table->string('interest')->nullable();          // food | groceries | pharmacy | ...
            $table->string('status')->default('active');     // active | invited | onboarded | unsubscribed
            $table->boolean('verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->string('verification_token')->nullable()->index();

            // Referral
            $table->string('referral_code')->unique();       // this user's own shareable code
            $table->foreignId('referred_by_id')->nullable()->constrained('waitlist_entries')->nullOnDelete();
            $table->unsignedInteger('referrals')->default(0);// denormalised count of verified referrals
            $table->unsignedInteger('position')->nullable();

            // Attribution
            $table->string('source')->default('organic');    // organic | referral | instagram | ...
            $table->string('device')->default('Web');        // iOS | Android | Web
            $table->string('browser')->nullable();
            $table->string('country')->nullable();
            $table->string('utm_source')->nullable();
            $table->string('utm_medium')->nullable();
            $table->string('utm_campaign')->nullable();
            $table->string('ip_hash')->nullable();           // privacy-safe hashed IP

            // Admin
            $table->json('tags')->nullable();
            $table->text('notes')->nullable();

            $table->timestamp('last_active_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('source');
            $table->index('verified');
            $table->index('city');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waitlist_entries');
    }
};
