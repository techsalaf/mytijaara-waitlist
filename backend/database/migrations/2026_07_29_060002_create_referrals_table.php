<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referrer_id')->constrained('waitlist_entries')->cascadeOnDelete();
            $table->foreignId('referred_id')->constrained('waitlist_entries')->cascadeOnDelete();
            $table->string('code');
            $table->boolean('converted')->default(false);     // referred entry verified their email
            $table->timestamp('converted_at')->nullable();
            $table->unsignedInteger('points')->default(0);
            $table->timestamps();

            $table->unique('referred_id');                    // an entry can only be referred once
            $table->index('referrer_id');
            $table->index('converted');
        });

        Schema::create('referral_visits', function (Blueprint $table) {
            $table->id();
            $table->string('code')->index();
            $table->foreignId('referrer_id')->nullable()->constrained('waitlist_entries')->nullOnDelete();
            $table->string('ip_hash')->nullable();
            $table->string('country')->nullable();
            $table->string('city')->nullable();
            $table->string('device')->nullable();
            $table->string('browser')->nullable();
            $table->string('utm_source')->nullable();
            $table->boolean('converted')->default(false);
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_visits');
        Schema::dropIfExists('referrals');
    }
};
