<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two things about the index names below are deliberate.
 *
 * MySQL caps an identifier at 64 characters. Laravel's auto-generated name is
 * `{table}_{col}_{col}_{type}`, which on `dataroom_access_grant_documents` comes
 * out at 66 and aborts the migration with SQLSTATE[42000] 1059. SQLite has no
 * such cap, so the test suite never saw it and only a MySQL deployment did.
 * Every compound index on a `dataroom_access_grant_*` table therefore carries an
 * explicit short name. MigrationMysqlCompatibilityTest now enforces the 64-char
 * ceiling against the MySQL grammar on every migration in the repo, so this
 * class of failure cannot reach a deployment again.
 *
 * The `hasTable` / `hasIndex` guards exist because the first MySQL run died
 * part-way through: DDL is not transactional in MySQL, so tables 1 to 6 were
 * created and the migration was never recorded as run. Guarding each step lets
 * the same migration finish on that half-built database without dropping
 * anything, and behaves identically on a clean one.
 *
 * Every indexed string column carries an explicit length rather than taking
 * Laravel's 255 default. A utf8mb4 `varchar(255)` costs 1022 bytes in an index
 * key, and the smallest key budget a live MySQL will hand out is 767 bytes
 * (InnoDB, COMPACT row format); MyISAM and Aria stop at 1000. The third
 * deployment failure was exactly this: SQLSTATE[42000] 1071 "Specified key was
 * too long; max key length is 1000 bytes" on `dataroom_audit_logs`, where
 * `nullableMorphs('target')` indexed a `varchar(255)` beside a bigint. Every
 * dataroom index is now sized to fit inside 767 bytes, and
 * MigrationMysqlCompatibilityTest computes each key's byte width from the MySQL
 * DDL and fails the build if one grows past that.
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Data Room Settings
        $this->create('dataroom_settings', function (Blueprint $table) {
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
        $this->create('dataroom_folders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            // 191 rather than 255: this column is uniquely indexed, and a
            // utf8mb4 varchar(255) key is 1022 bytes, over every engine's
            // budget. 191 * 4 + 1 = 765, which fits InnoDB COMPACT's 767.
            $table->string('slug', 191)->unique();
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 3. Documents
        $this->create('dataroom_documents', function (Blueprint $table) {
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
        $this->create('dataroom_document_versions', function (Blueprint $table) {
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
        $this->create('dataroom_access_grants', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('visitor_name');
            // Indexed below; 191 keeps the key inside 767 bytes. RFC 5321 caps
            // a full address at 254 characters, but nothing in this system
            // issues a grant to an address anywhere near that.
            $table->string('visitor_email', 191);
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
        $this->create('dataroom_access_grant_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('access_grant_id')->constrained('dataroom_access_grants')->cascadeOnDelete();
            $table->foreignId('document_id')->constrained('dataroom_documents')->cascadeOnDelete();
            $table->boolean('can_download')->default(true);
            $table->boolean('can_print')->default(false);
            $table->timestamps();

            $table->unique(['access_grant_id', 'document_id'], 'dr_agd_grant_document_unique');
        });

        // 7. Junction: Access Grant <-> Folders
        $this->create('dataroom_access_grant_folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('access_grant_id')->constrained('dataroom_access_grants')->cascadeOnDelete();
            $table->foreignId('folder_id')->constrained('dataroom_folders')->cascadeOnDelete();
            $table->boolean('can_download')->default(true);
            $table->timestamps();

            $table->unique(['access_grant_id', 'folder_id'], 'dr_agf_grant_folder_unique');
        });

        // 8. Visitor Sessions
        // Two independent clocks: `expires_at` is the idle timeout, refreshed on
        // each request; `absolute_expires_at` is a hard ceiling that activity
        // cannot extend. A session dies at whichever comes first.
        $this->create('dataroom_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('access_grant_id')->constrained('dataroom_access_grants')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            // dateTime, not timestamp. MySQL auto-assigns an implicit default to
            // the first TIMESTAMP column in a table and leaves the rest with a
            // zero-date default, which strict mode rejects outright
            // (SQLSTATE[42000] 1067). DATETIME NOT NULL with no default is
            // legal. Laravel casts both to Carbon, so nothing above the schema
            // can tell the difference. Also sidesteps the 2038 ceiling.
            $table->dateTime('expires_at');
            $table->dateTime('absolute_expires_at');
            $table->dateTime('last_active_at');
            $table->timestamps();
        });

        // 9. Audit Logs
        $this->create('dataroom_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('access_grant_id')->nullable()->constrained('dataroom_access_grants')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('visitor_email', 191)->nullable();
            // Indexed with created_at below. Action names are short verbs
            // (`authenticated`, `downloaded_document`, `access_denied`), so 64
            // is generous and the composite key lands at 262 bytes.
            $table->string('action', 64);
            // Not nullableMorphs(). That helper writes `varchar(255)` for the
            // type and indexes it next to a bigint, which is a 1031-byte key:
            // MySQL rejected it outright with SQLSTATE[42000] 1071 on the
            // production deployment. The longest value this column ever holds is
            // `App\Models\DataRoom\DataRoomAccessGrant` at 39 characters, so 96
            // is ample and the key costs 395 bytes.
            $table->string('target_type', 96)->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->text('details')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index(['target_type', 'target_id'], 'dr_audit_target_index');
            $table->index(['action', 'created_at']);
            $table->index(['access_grant_id', 'created_at']);
        });

        // 10. Document Views & Downloads Tracking
        $this->create('dataroom_document_views', function (Blueprint $table) {
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
        $this->create('dataroom_access_templates', function (Blueprint $table) {
            $table->id();
            // Uniquely indexed, so length is explicit. 150 * 4 + 1 = 601 bytes.
            $table->string('name', 150)->unique();
            $table->text('description')->nullable();
            $table->boolean('all_documents_access')->default(false);
            $table->boolean('downloads_permitted')->default(true);
            $table->unsignedInteger('default_duration_days')->nullable();
            $table->json('document_ids')->nullable();
            $table->json('folder_ids')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Heal step. On a deployment where the first attempt created the
        // junction table and then died on the over-long index name, `create()`
        // above skips the table and the unique would never land. Adding it here
        // is a no-op on a clean database, where `create()` already made it.
        $this->ensureUnique('dataroom_access_grant_documents', ['access_grant_id', 'document_id'], 'dr_agd_grant_document_unique');
        $this->ensureUnique('dataroom_access_grant_folders', ['access_grant_id', 'folder_id'], 'dr_agf_grant_folder_unique');
    }

    /**
     * Create a table only if it is absent.
     *
     * A partly applied migration is not recorded in the `migrations` table, so
     * the operator's only options are to re-run it or to drop tables by hand.
     * This makes re-running the correct answer.
     */
    private function create(string $table, Closure $definition): void
    {
        if (! Schema::hasTable($table)) {
            Schema::create($table, $definition);
        }
    }

    /**
     * @param  list<string>  $columns
     */
    private function ensureUnique(string $table, array $columns, string $name): void
    {
        if (! Schema::hasTable($table) || Schema::hasIndex($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns, $name) {
            $blueprint->unique($columns, $name);
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
