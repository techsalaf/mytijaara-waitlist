<?php

namespace Tests\Feature;

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
}
