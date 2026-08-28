<?php

namespace Tests\Feature;

use App\Models\DataRoomAuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Facade;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The gate that would have caught the data room deployment failure.
 *
 * The suite runs on SQLite, which has no identifier length limit. MySQL caps
 * every identifier at 64 characters and rejects the DDL outright with
 * SQLSTATE[42000] 1059. So a migration whose auto-generated index name is 66
 * characters passes 145 green tests and then dies on the production database,
 * half-applied, which is exactly what happened to
 * `dataroom_access_grant_documents_access_grant_id_document_id_unique`.
 *
 * This test does not need a MySQL server. It registers a MySQL connection,
 * never opens a PDO handle to it, and runs every migration in the repo through
 * `Connection::pretend()`, which logs the SQL the MySQL grammar would emit
 * instead of executing it. Every backtick-quoted identifier in that SQL is then
 * measured. Deterministic, offline, and under the gate lane's time budget.
 *
 * One caveat, made explicit rather than hidden. A migration that issues a data
 * query (an Eloquent update, a seed-style backfill) forces the grammar to ask
 * the server for its version, which needs a real PDO handle and therefore
 * cannot be analysed offline. Those migrations are listed in
 * DATA_ONLY_MIGRATIONS and are asserted to declare no schema, so the exemption
 * cannot be used to smuggle an unchecked `Schema::create` past the gate.
 */
class MigrationMysqlCompatibilityTest extends TestCase
{
    /** MySQL's hard ceiling on table, column, index and constraint names. */
    private const MYSQL_MAX_IDENTIFIER = 64;

    /**
     * The smallest index key budget a live MySQL will hand out.
     *
     * InnoDB with the COMPACT or REDUNDANT row format stops at 767 bytes;
     * DYNAMIC and COMPRESSED allow 3072; MyISAM and Aria allow 1000. The
     * deployment that broke reported 1000. Sizing to the smallest of the three
     * makes the schema independent of the engine and row format a host happens
     * to default to, which is not something this codebase gets to choose.
     */
    private const MYSQL_MAX_INDEX_KEY_BYTES = 767;

    /** Tables this gate sizes. See test_no_dataroom_index_exceeds_the_key_budget. */
    private const GATED_TABLE_PREFIX = 'dataroom_';

    private const PROBE = 'mysql_identifier_probe';

    /**
     * Migrations that move rows rather than declare schema. They cannot be
     * pretended offline, and they are required to contain no schema DDL.
     */
    private const DATA_ONLY_MIGRATIONS = [
        '2026_08_24_080001_cleanup_mock_campaigns_and_update_templates',
    ];

    /**
     * The probe is identical for every test in the class and costs a refused
     * TCP connect per data migration, so it is computed once.
     *
     * @var array{statements: array<string, list<string>>, unanalysable: list<string>}|null
     */
    private static ?array $probe = null;

    public static function tearDownAfterClass(): void
    {
        self::$probe = null;

        parent::tearDownAfterClass();
    }

    public function test_no_migration_generates_an_identifier_mysql_would_reject(): void
    {
        $offenders = [];

        foreach ($this->statementsPerMigration() as $migration => $statements) {
            foreach ($statements as $sql) {
                foreach ($this->identifiersIn($sql) as $identifier) {
                    if (mb_strlen($identifier) > self::MYSQL_MAX_IDENTIFIER) {
                        $offenders[] = sprintf(
                            '%s: `%s` is %d characters (max %d)',
                            $migration,
                            $identifier,
                            mb_strlen($identifier),
                            self::MYSQL_MAX_IDENTIFIER,
                        );
                    }
                }
            }
        }

        $this->assertSame([], array_values(array_unique($offenders)), implode("\n", array_unique($offenders)));
    }

    /**
     * The second MySQL-only failure the SQLite suite could not see.
     *
     * MySQL auto-assigns DEFAULT CURRENT_TIMESTAMP to the first TIMESTAMP column
     * in a table and leaves every later NOT NULL TIMESTAMP with an implicit
     * zero-date default, which strict mode rejects with SQLSTATE[42000] 1067
     * "Invalid default value". SQLite accepts the same schema without comment.
     * `dataroom_sessions` had three NOT NULL timestamps and died on the second.
     *
     * A NOT NULL TIMESTAMP is therefore only allowed when it carries an explicit
     * default. Use `dateTime()` instead, or add `useCurrent()`.
     */
    public function test_no_migration_declares_a_not_null_timestamp_without_a_default(): void
    {
        $offenders = [];

        foreach ($this->statementsPerMigration() as $migration => $statements) {
            foreach ($statements as $sql) {
                foreach ($this->timestampColumnsIn($sql) as $offender) {
                    $offenders[] = $migration.': '.$offender;
                }
            }
        }

        $this->assertSame(
            [],
            array_values(array_unique($offenders)),
            "MySQL rejects a NOT NULL timestamp with no default. Use dateTime() or useCurrent().\n"
            .implode("\n", array_unique($offenders)),
        );
    }

    /**
     * The third MySQL-only failure, and the one that cost a second deployment.
     *
     * `nullableMorphs('target')` on `dataroom_audit_logs` wrote a
     * `varchar(255)` type column and indexed it beside a bigint. In utf8mb4 that
     * key is 1031 bytes and MySQL refused it with SQLSTATE[42000] 1071
     * "Specified key was too long; max key length is 1000 bytes". SQLite has no
     * key length limit at all, so 311 tests stayed green.
     *
     * The budget checked here is 767, not 1000, because the engine and row
     * format of the host database are not ours to pick. Sizing to the smallest
     * of the three real limits makes the schema portable across all of them.
     *
     * Scoped to `dataroom_*`. The rest of the repo predates this gate and is
     * already deployed and working on the live database; narrowing those keys is
     * a separate migration with its own data risk, not a silent side effect of
     * adding a test.
     */
    public function test_no_dataroom_index_exceeds_the_key_budget(): void
    {
        $offenders = [];

        foreach ($this->statementsPerMigration() as $migration => $statements) {
            foreach ($this->indexKeysIn($statements) as $key) {
                if (! str_starts_with($key['table'], self::GATED_TABLE_PREFIX)) {
                    continue;
                }

                if ($key['bytes'] <= self::MYSQL_MAX_INDEX_KEY_BYTES) {
                    continue;
                }

                $offenders[] = sprintf(
                    '%s: %s.%s (%s) is %d bytes (max %d)',
                    $migration,
                    $key['table'],
                    $key['name'],
                    implode(', ', $key['columns']),
                    $key['bytes'],
                    self::MYSQL_MAX_INDEX_KEY_BYTES,
                );
            }
        }

        $this->assertSame(
            [],
            array_values(array_unique($offenders)),
            "An index key is wider than MySQL's smallest budget. Give the indexed "
            ."string column an explicit shorter length.\n"
            .implode("\n", array_unique($offenders)),
        );
    }

    /**
     * Guards the guard above. If the DDL parser ever stops recognising indexes
     * it would report an empty offender set and pass forever, so pin the two
     * keys whose widths are known and deliberate.
     */
    public function test_the_key_budget_parser_measures_real_indexes(): void
    {
        $keys = [];

        foreach ($this->statementsPerMigration() as $migration => $statements) {
            if (! str_contains($migration, 'create_dataroom_tables')) {
                continue;
            }

            foreach ($this->indexKeysIn($statements) as $key) {
                $keys[$key['table'].'.'.$key['name']] = $key['bytes'];
            }
        }

        // target_type varchar(96) utf8mb4 = 386, +1 nullable, +8 bigint = 395.
        $this->assertSame(395, $keys['dataroom_audit_logs.dr_audit_target_index'] ?? null);
        // slug varchar(191) utf8mb4 = 765, the deliberate ceiling.
        $this->assertSame(765, $keys['dataroom_folders.dataroom_folders_slug_unique'] ?? null);
    }

    /**
     * The other half of narrowing a column: the values still have to fit.
     *
     * `dataroom_audit_logs.action` is 64 characters and `target_type` is 96, so
     * a future action name or a moved model class could start silently
     * truncating, or throwing 1265 under strict mode. The longest action today
     * is `emergency_disabled_all_downloads` at 32; the longest morph target is
     * `App\Models\DataRoomDocumentVersion` at 34.
     *
     * The action scan reads literal arguments to `record()`, so an action built
     * at runtime from a variable would escape it. Nothing in the data room does
     * that, and the assertion on ALWAYS_LOGGED covers the security-critical set
     * exactly.
     */
    public function test_audit_values_still_fit_the_narrowed_columns(): void
    {
        $actions = DataRoomAuditLog::ALWAYS_LOGGED;

        foreach ($this->dataRoomSources() as $source) {
            preg_match_all(
                '/record\(\s*[^,]+,\s*[^,]+,\s*\'([a-z0-9_]+)\'/',
                (string) file_get_contents($source),
                $matches,
            );

            $actions = array_merge($actions, $matches[1] ?? []);
        }

        $actions = array_values(array_unique($actions));

        $this->assertNotEmpty($actions, 'No audit action literals were found, so this test proves nothing.');

        foreach ($actions as $action) {
            $this->assertLessThanOrEqual(
                64,
                mb_strlen($action),
                "Audit action '{$action}' does not fit dataroom_audit_logs.action (64).",
            );
        }

        foreach (glob(app_path('Models/DataRoom*.php')) ?: [] as $model) {
            $class = 'App\\Models\\'.basename($model, '.php');

            $this->assertLessThanOrEqual(
                96,
                mb_strlen($class),
                "Morph target '{$class}' does not fit dataroom_audit_logs.target_type (96).",
            );
        }
    }

    /**
     * Guards the guard. If `pretend()` ever stops capturing SQL, the test above
     * would pass over an empty set and report green forever.
     */
    public function test_the_probe_actually_captures_mysql_ddl(): void
    {
        $all = $this->statementsPerMigration();

        $dataroom = null;

        foreach ($all as $migration => $statements) {
            if (str_contains($migration, 'create_dataroom_tables')) {
                $dataroom = $statements;
            }
        }

        $this->assertNotNull($dataroom, 'The data room migration produced no captured SQL.');

        $joined = implode("\n", $dataroom);

        // Backticks prove the MySQL grammar ran, not SQLite's double quotes.
        $this->assertStringContainsString('create table `dataroom_access_grant_documents`', $joined);
        $this->assertStringContainsString('`dr_agd_grant_document_unique`', $joined);
        $this->assertStringNotContainsString('"dataroom_access_grant_documents"', $joined);
    }

    /**
     * The specific name that broke production, pinned as a regression. A future
     * edit that drops the explicit index name would regenerate a 66-character
     * identifier and fail here as well as in the sweep above.
     */
    public function test_the_junction_uniques_keep_their_short_explicit_names(): void
    {
        $joined = '';

        foreach ($this->statementsPerMigration() as $migration => $statements) {
            if (str_contains($migration, 'create_dataroom_tables')) {
                $joined = implode("\n", $statements);
            }
        }

        $this->assertStringNotContainsString(
            'dataroom_access_grant_documents_access_grant_id_document_id_unique',
            $joined,
        );
        $this->assertStringContainsString('`dr_agd_grant_document_unique`', $joined);
        $this->assertStringContainsString('`dr_agf_grant_folder_unique`', $joined);
    }

    /**
     * The exemption list is not a place to hide schema. Every migration that
     * cannot be analysed offline must be one that declares no schema at all,
     * and every name on the list must still exist and still be unanalysable.
     */
    public function test_the_unanalysable_exemptions_declare_no_schema(): void
    {
        $unanalysable = $this->probe()['unanalysable'];

        sort($unanalysable);
        $expected = self::DATA_ONLY_MIGRATIONS;
        sort($expected);

        $this->assertSame(
            $expected,
            $unanalysable,
            'A migration became unanalysable offline, or an exemption is stale. '
            .'Unanalysable now: '.implode(', ', $unanalysable),
        );

        foreach (self::DATA_ONLY_MIGRATIONS as $name) {
            $source = (string) file_get_contents(database_path('migrations/'.$name.'.php'));

            $this->assertStringNotContainsString('Schema::create(', $source, $name.' declares a table but is exempt from the identifier gate.');
            $this->assertStringNotContainsString('->index(', $source, $name.' declares an index but is exempt from the identifier gate.');
            $this->assertStringNotContainsString('->unique(', $source, $name.' declares a unique but is exempt from the identifier gate.');
            $this->assertStringNotContainsString('->constrained(', $source, $name.' declares a foreign key but is exempt from the identifier gate.');
        }
    }

    // -- internals ---------------------------------------------------------

    /**
     * Every migration file run through the MySQL grammar in pretend mode.
     *
     * @return array<string, list<string>>
     */
    private function statementsPerMigration(): array
    {
        return $this->probe()['statements'];
    }

    /**
     * @return array{statements: array<string, list<string>>, unanalysable: list<string>}
     */
    private function probe(): array
    {
        if (self::$probe !== null) {
            return self::$probe;
        }

        config(['database.connections.'.self::PROBE => [
            'driver' => 'mysql',
            // Never dialled successfully, and deliberately so: port 1 on
            // loopback refuses instantly. Pretend mode emits no DDL and runs no
            // selects, so the only thing that can reach for a PDO handle is a
            // data query asking the grammar for the server version, which is
            // precisely what this connection is designed to make fail fast.
            'host' => '127.0.0.1',
            'port' => '1',
            'database' => 'identifier_probe',
            'username' => 'identifier_probe',
            'password' => '',
            'charset' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
            'prefix' => '',
            'prefix_indexes' => true,
            'engine' => null,
            'options' => [\PDO::ATTR_TIMEOUT => 1],
        ]]);

        $previous = config('database.default');
        DB::setDefaultConnection(self::PROBE);
        // The Schema facade caches the builder it resolved for the old default.
        Facade::clearResolvedInstance('db.schema');

        $connection = DB::connection(self::PROBE);
        $captured = [];
        $unanalysable = [];

        try {
            foreach ($this->migrationFiles() as $file) {
                $name = basename($file, '.php');
                $migration = require $file;
                $failure = null;

                // Caught inside the callback, not around it: `pretend()` only
                // returns its query log on a normal return, so letting the
                // throwable escape would discard the SQL captured up to that
                // point along with the log-state restore.
                $log = $connection->pretend(function () use ($migration, &$failure) {
                    try {
                        $migration->up();
                    } catch (\Throwable $e) {
                        $failure = $e;
                    }
                });

                $captured[$name] = array_map(
                    static fn (array $entry): string => (string) $entry['query'],
                    $log,
                );

                if ($failure !== null) {
                    $unanalysable[] = $name;
                }
            }
        } finally {
            DB::setDefaultConnection($previous);
            Facade::clearResolvedInstance('db.schema');
        }

        return self::$probe = ['statements' => $captured, 'unanalysable' => $unanalysable];
    }

    /**
     * Every PHP file that can write an audit row.
     *
     * @return list<string>
     */
    private function dataRoomSources(): array
    {
        $files = array_merge(
            glob(app_path('Models/DataRoom*.php')) ?: [],
            glob(app_path('Services/DataRoom/*.php')) ?: [],
            glob(app_path('Http/Controllers/Api/DataRoom/*.php')) ?: [],
            glob(app_path('Http/Middleware/DataRoom*.php')) ?: [],
        );

        return array_values($files);
    }

    /** @return list<string> */
    private function migrationFiles(): array
    {
        $files = glob(database_path('migrations/*.php')) ?: [];
        sort($files);

        return array_values($files);
    }

    /**
     * Identifiers as the MySQL grammar writes them: backtick-quoted. Enum
     * values and string defaults are single-quoted and so are not matched.
     *
     * @return list<string>
     */
    private function identifiersIn(string $sql): array
    {
        preg_match_all('/`([^`]+)`/', $sql, $matches);

        return array_values(array_unique($matches[1] ?? []));
    }

    /**
     * TIMESTAMP columns declared NOT NULL with no DEFAULT clause, as
     * `col -> definition` strings ready for an assertion message.
     *
     * The grammar writes one column per comma inside the parentheses, and a
     * default arrives as ` default CURRENT_TIMESTAMP` or ` default '...'` on the
     * same fragment, so splitting on the column name is enough. `on update` is
     * not a default and does not exempt the column.
     *
     * @return list<string>
     */
    private function timestampColumnsIn(string $sql): array
    {
        preg_match_all('/`([^`]+)`\s+(timestamp[^,)]*)/i', $sql, $matches, PREG_SET_ORDER);

        $offenders = [];

        foreach ($matches as [, $column, $definition]) {
            $definition = strtolower(trim($definition));

            if (! str_contains($definition, 'not null')) {
                continue;
            }

            if (str_contains($definition, 'default')) {
                continue;
            }

            $offenders[] = '`'.$column.'` is `'.$definition.'`';
        }

        return array_values(array_unique($offenders));
    }

    /**
     * Every index key one migration declares, measured in bytes.
     *
     * Two passes over the same statement list. The first records each column's
     * declared type, from `create table` bodies and from `alter table ... add`.
     * The second finds every index and sums the widths of its columns. An index
     * naming a column the first pass never saw is skipped rather than guessed
     * at: it belongs to a table another migration created.
     *
     * Foreign keys are ignored. They index the referencing column, which is
     * always a bigint here, and never approach the budget.
     *
     * @param  list<string>  $statements
     * @return list<array{table: string, name: string, columns: list<string>, bytes: int}>
     */
    private function indexKeysIn(array $statements): array
    {
        $columns = [];

        foreach ($statements as $sql) {
            if (preg_match('/^create table `([^`]+)` \((.*)\)[^)]*$/is', trim($sql), $m)) {
                foreach ($this->splitTopLevel($m[2]) as $fragment) {
                    if (preg_match('/^`([^`]+)`\s+(.+)$/s', trim($fragment), $c)) {
                        $columns[$m[1]][$c[1]] = $c[2];
                    }
                }

                continue;
            }

            if (preg_match('/^alter table `([^`]+)` add `([^`]+)`\s+(.+)$/is', trim($sql), $m)) {
                $columns[$m[1]][$m[2]] = $m[3];
            }
        }

        $keys = [];

        foreach ($statements as $sql) {
            if (! preg_match('/^alter table `([^`]+)` add (?:unique|index|fulltext|spatial index) `([^`]+)`\((.+)\)$/is', trim($sql), $m)) {
                continue;
            }

            preg_match_all('/`([^`]+)`/', $m[3], $found);
            $named = $found[1] ?? [];
            $bytes = 0;
            $known = $named !== [];

            foreach ($named as $column) {
                $width = $this->keyBytes($columns[$m[1]][$column] ?? null);

                if ($width === null) {
                    $known = false;

                    break;
                }

                $bytes += $width;
            }

            if (! $known) {
                continue;
            }

            $keys[] = [
                'table' => $m[1],
                'name' => $m[2],
                'columns' => array_values($named),
                'bytes' => $bytes,
            ];
        }

        return $keys;
    }

    /**
     * The bytes one column contributes to an index key, or null when the type is
     * not one this parser is prepared to claim a number for.
     *
     * Character types are counted at 4 bytes per character, which is utf8mb4 and
     * is what `config/database.php` asks for. A varchar also stores its own
     * length, one byte up to 255 characters and two beyond. A nullable column
     * carries one extra byte for the null flag.
     */
    private function keyBytes(?string $definition): ?int
    {
        if ($definition === null) {
            return null;
        }

        $definition = strtolower($definition);
        $nullable = ! str_contains($definition, 'not null') ? 1 : 0;

        $fixed = [
            'bigint' => 8, 'int' => 4, 'mediumint' => 3, 'smallint' => 2, 'tinyint' => 1,
            'double' => 8, 'float' => 4, 'datetime' => 5, 'timestamp' => 4, 'date' => 3,
            'time' => 3, 'year' => 1, 'uuid' => 16,
        ];

        if (preg_match('/^varchar\((\d+)\)/', $definition, $m)) {
            return ((int) $m[1]) * 4 + ((int) $m[1] > 255 ? 2 : 1) + $nullable;
        }

        if (preg_match('/^char\((\d+)\)/', $definition, $m)) {
            return ((int) $m[1]) * 4 + $nullable;
        }

        if (str_starts_with($definition, 'enum(')) {
            // One byte up to 255 members, two beyond. Nothing here is close.
            return 2 + $nullable;
        }

        foreach ($fixed as $type => $width) {
            if (preg_match('/^'.$type.'\b/', $definition)) {
                return $width + $nullable;
            }
        }

        // text, blob, json, geometry, decimal. None is indexed in this schema
        // without a prefix length, and guessing a width would be worse than
        // declining to measure.
        return null;
    }

    /**
     * Split a `create table` body on its top-level commas, so that
     * `enum('a', 'b')` and `decimal(8, 2)` stay in one piece.
     *
     * @return list<string>
     */
    private function splitTopLevel(string $body): array
    {
        $parts = [];
        $buffer = '';
        $depth = 0;
        $quoted = false;

        foreach (str_split($body) as $character) {
            if ($character === "'") {
                $quoted = ! $quoted;
            }

            if (! $quoted) {
                if ($character === '(') {
                    $depth++;
                } elseif ($character === ')') {
                    $depth--;
                } elseif ($character === ',' && $depth === 0) {
                    $parts[] = $buffer;
                    $buffer = '';

                    continue;
                }
            }

            $buffer .= $character;
        }

        if (trim($buffer) !== '') {
            $parts[] = $buffer;
        }

        return $parts;
    }
}
