<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_folders', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('media_files', function (Blueprint $table) {
            $table->id();
            $table->string('public_id')->unique();       // media_1 style
            $table->string('name');
            $table->string('type')->default('image');    // image | video | document
            $table->string('mime')->nullable();
            $table->unsignedBigInteger('size')->default(0); // bytes
            $table->string('folder')->default('Uncategorized');
            $table->string('disk')->default('public');
            $table->string('path');                       // storage path
            $table->string('url');                        // public url
            $table->string('dimensions')->nullable();     // "1600x900"
            $table->string('alt')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('type');
            $table->index('folder');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_files');
        Schema::dropIfExists('media_folders');
    }
};
