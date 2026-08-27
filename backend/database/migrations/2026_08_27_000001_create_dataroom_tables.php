<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Data Room Settings
        Schema::create('dataroom_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(true);
            $table->boolean('global_pin_enabled')->default(false);
            $table->string('global_pin_hash')->nullable();
            $table->integer('default_access_duration_days')->default(14);
            $table->integer('session_timeout_minutes')->default(30);
            $table->integer('max_failed_attempts')->default(5);
            $table->boolean('downloads_enabled')->default(true);
            $table->boolean('watermark_enabled')->default(true);
            $table->boolean('audit_logging_enabled')->default(true);
            $table->boolean('emergency_lockdown')->default(false);
            $table->timestamps();
        });

        // 2. Folders / Categories
        Schema::create('dataroom_folders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 3. Documents
        Schema::create('dataroom_documents', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('folder_id')->nullable()->constrained('dataroom_folders')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('file_path');
            $table->string('original_filename');
            $table->string('file_type'); // pdf, xlsx, docx, etc.
            $table->unsignedBigInteger('file_size');
            $table->string('version')->default('1.0');
            $table->enum('status', ['draft', 'published', 'archived', 'restricted', 'superseded'])->default('published');
            $table->enum('confidentiality_level', ['public', 'internal', 'confidential', 'highly_confidential', 'restricted'])->default('confidential');
            $table->string('checksum', 64); // SHA-256
            $table->string('tags')->nullable(); // comma separated, searchable
            $table->integer('sort_order')->default(0);
            // Per-document download switch. ANDed with the grant flag and the
            // global setting, so any one of the three can veto a download.
            $table->boolean('downloads_permitted')->default(true);
            // Position in the configurable "Start here" reading list. Null = not featured.
            $table->unsignedInteger('start_here_order')->nullable();
            $table->unsignedInteger('view_count')->default(0);
            $table->unsignedInteger('download_count')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'folder_id']);
        });

        // 4. Document Versions
        Schema::create('dataroom_document_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('dataroom_documents')->cascadeOnDelete();
            $table->string('version');
            $table->string('file_path');
            $table->string('original_filename');
            $table->unsignedBigInteger('file_size');
            $table->string('checksum', 64);
            $table->text('change_notes')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 5. Access Grants (Visitors)
        Schema::create('dataroom_access_grants', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('visitor_name');
            $table->string('visitor_email');
            $table->string('organization')->nullable();
            $table->string('role_title')->default('Investor');
            $table->string('access_code_hash'); // bcrypt of the plaintext code
            // Last 4 characters only, so an admin can match a grant to a code
            // they already hold. The full code is displayed once at creation and
            // is not recoverable afterwards; regenerate instead.
            $table->string('code_hint', 4)->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('current_uses')->default(0);
            $table->enum('status', ['pending', 'active', 'expired', 'revoked', 'suspended', 'exhausted'])->default('active');
            $table->boolean('all_documents_access')->default(false);
            $table->boolean('downloads_permitted')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_accessed_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Lookup on authenticate() is by email; codes are compared by hash.
            $table->index('visitor_email');
            $table->index('status');
        });

        // 6. Junction: Access Grant <-> Documents
        // `can_download` / `can_print` are the per-grant-per-document overrides
        // from the permission matrix. Effective download permission is the AND
        // of the global setting, the grant flag, the document flag and this row.
        Schema::create('dataroom_access_grant_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('access_grant_id')->constrained('dataroom_access_grants')->cascadeOnDelete();
            $table->foreignId('document_id')->constrained('dataroom_documents')->cascadeOnDelete();
            $table->boolean('can_download')->default(true);
            $table->boolean('can_print')->default(false);
            $table->timestamps();

            $table->unique(['access_grant_id', 'document_id']);
        });

        // 7. Junction: Access Grant <-> Folders
        Schema::create('dataroom_access_grant_folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('access_grant_id')->constrained('dataroom_access_grants')->cascadeOnDelete();
            $table->foreignId('folder_id')->constrained('dataroom_folders')->cascadeOnDelete();
            $table->boolean('can_download')->default(true);
            $table->timestamps();

            $table->unique(['access_grant_id', 'folder_id']);
        });

        // 8. Visitor Sessions
        // Two independent clocks: `expires_at` is the idle timeout, refreshed on
        // each request; `absolute_expires_at` is a hard ceiling that activity
        // cannot extend. A session dies at whichever comes first.
        Schema::create('dataroom_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('access_grant_id')->constrained('dataroom_access_grants')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('absolute_expires_at');
            $table->timestamp('last_active_at');
            $table->timestamps();
        });

        // 9. Audit Logs
        Schema::create('dataroom_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('access_grant_id')->nullable()->constrained('dataroom_access_grants')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('visitor_email')->nullable();
            $table->string('action'); // authenticated, viewed_document, downloaded_document, access_denied, revoked, etc.
            $table->nullableMorphs('target'); // Document, Folder, AccessGrant
            $table->text('details')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index(['action', 'created_at']);
            $table->index(['access_grant_id', 'created_at']);
        });

        // 10. Document Views & Downloads Tracking
        Schema::create('dataroom_document_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('dataroom_documents')->cascadeOnDelete();
            $table->foreignId('access_grant_id')->constrained('dataroom_access_grants')->cascadeOnDelete();
            $table->enum('action_type', ['view', 'preview', 'download']);
            $table->timestamps();

            $table->index(['document_id', 'action_type']);
            $table->index(['access_grant_id', 'created_at']);
        });

        // 11. Access templates / bundles. A saved permission set an admin can
        // apply when issuing a grant (e.g. "VC Investor", "Bank Partner").
        Schema::create('dataroom_access_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->boolean('all_documents_access')->default(false);
            $table->boolean('downloads_permitted')->default(true);
            $table->unsignedInteger('default_duration_days')->nullable();
            $table->json('document_ids')->nullable();
            $table->json('folder_ids')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dataroom_access_templates');
        Schema::dropIfExists('dataroom_document_views');
        Schema::dropIfExists('dataroom_audit_logs');
        Schema::dropIfExists('dataroom_sessions');
        Schema::dropIfExists('dataroom_access_grant_folders');
        Schema::dropIfExists('dataroom_access_grant_documents');
        Schema::dropIfExists('dataroom_access_grants');
        Schema::dropIfExists('dataroom_document_versions');
        Schema::dropIfExists('dataroom_documents');
        Schema::dropIfExists('dataroom_folders');
        Schema::dropIfExists('dataroom_settings');
    }
};
