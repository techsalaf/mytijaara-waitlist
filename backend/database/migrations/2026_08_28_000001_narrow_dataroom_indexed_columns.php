<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Repairs a MySQL database that was built by the first version of
 * `2026_08_27_000001_create_dataroom_tables`, where every indexed string column
 * took Laravel's 255 default.
 *
 * A utf8mb4 `varchar(255)` costs 1022 bytes inside an index key. The smallest
 * budget a live MySQL hands out is 767 bytes (InnoDB, COMPACT row format);
 * MyISAM and Aria stop at 1000. `dataroom_audit_logs` therefore got its table
 * created and then died on the index, with SQLSTATE[42000] 1071 "Specified key
 * was too long; max key length is 1000 bytes", leaving the table in place with
 * none of its three indexes and the migration unrecorded.
 *
 * The create migration now declares the narrow widths itself, so a clean
 * install never needs this file. It exists for the one database that already
 * holds the wide columns: shrink them first, then add the indexes that could not
 * land. Both steps are guarded and idempotent, so re-running is safe.
 *
 * MySQL only, deliberately. On SQLite the create migration already emitted the
 * final widths and every index, so a table rebuild here would be risk with no
 * benefit. That does mean this file's DDL is not covered by
 * MigrationMysqlCompatibilityTest, which can only read what a migration emits;
 * the widths below are copied from the create migration, which is covered.
 */
return new class extends Migration
{
    /**
     * table => column => [new length, nullable]
     *
     * Lengths match `2026_08_27_000001_create_dataroom_tables` exactly. Changing
     * one without the other puts the two databases back out of step.
     */
    private const WIDTHS = [
        'dataroom_folders' => [
            'slug' => [191, false],
        ],
        'dataroom_access_grants' => [
            'visitor_email' => [191, false],
        ],
        'dataroom_audit_logs' => [
            'visitor_email' => [191, true],
            'action' => [64, false],
            'target_type' => [96, true],
        ],
        'dataroom_access_templates' => [
            'name' => [150, false],
        ],
    ];

    /**
     * The indexes that could not be created once the 1071 aborted the run.
     *
     * table => index name => columns
     */
    private const INDEXES = [
        'dataroom_audit_logs' => [
            'dr_audit_target_index' => ['target_type', 'target_id'],
            'dataroom_audit_logs_action_created_at_index' => ['action', 'created_at'],
            'dataroom_audit_logs_access_grant_id_created_at_index' => ['access_grant_id', 'created_at'],
        ],
    ];

    /**
     * Indexes the old `nullableMorphs('target')` call left behind on any
     * database where it did succeed, and which `dr_audit_target_index` now
     * duplicates column for column. A duplicate index costs a write on every
     * insert and buys nothing.
     *
     * table => index name
     */
    private const SUPERSEDED_INDEXES = [
        'dataroom_audit_logs' => 'dataroom_audit_logs_target_type_target_id_index',
    ];

    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        foreach (self::WIDTHS as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            foreach ($columns as $column => [$length, $nullable]) {
                $this->narrow($table, $column, $length, $nullable);
            }
        }

        foreach (self::INDEXES as $table => $indexes) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            foreach ($indexes as $name => $columns) {
                $this->ensureIndex($table, $columns, $name);
            }
        }

        // Only after the replacement is in place, so the columns are never
        // without an index.
        foreach (self::SUPERSEDED_INDEXES as $table => $name) {
            if (! Schema::hasTable($table) || ! Schema::hasIndex($table, $name)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($name) {
                $blueprint->dropIndex($name);
            });
        }
    }

    /**
     * Shrink a varchar, refusing rather than truncating.
     *
     * MySQL in strict mode aborts a MODIFY COLUMN that would cut a value short,
     * which would abort the migration a second time. Measuring first turns that
     * into a readable failure naming the row that is in the way.
     */
    private function narrow(string $table, string $column, int $length, bool $nullable): void
    {
        if (! Schema::hasColumn($table, $column)) {
            return;
        }

        $longest = (int) DB::table($table)->max(DB::raw('char_length(`'.$column.'`)'));

        if ($longest > $length) {
            throw new RuntimeException(
                "Cannot narrow {$table}.{$column} to {$length}: a row holds {$longest} characters. "
                .'Shorten or remove that row, then re-run the migration.'
            );
        }

        Schema::table($table, function (Blueprint $blueprint) use ($column, $length, $nullable) {
            $definition = $blueprint->string($column, $length);

            if ($nullable) {
                $definition->nullable();
            }

            $definition->change();
        });
    }

    /**
     * @param  list<string>  $columns
     */
    private function ensureIndex(string $table, array $columns, string $name): void
    {
        if (Schema::hasIndex($table, $name)) {
            return;
        }

        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                return;
            }
        }

        Schema::table($table, function (Blueprint $blueprint) use ($columns, $name) {
            $blueprint->index($columns, $name);
        });
    }

    /**
     * Deliberately a no-op.
     *
     * There is nothing useful to roll back to. Widening the columns recreates
     * the key-length failure this file exists to fix, and the indexes it adds
     * are declared by the create migration, so dropping them would leave a clean
     * database missing schema it is supposed to have. Rolling the data room back
     * means rolling back the create migration, which drops all eleven tables.
     */
    public function down(): void
    {
        //
    }
};
