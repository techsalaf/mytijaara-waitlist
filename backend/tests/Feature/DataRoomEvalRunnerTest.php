<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Gate-lane coverage for the eval runner itself.
 *
 * evals/data-room/run.php decides whether the eval lane passes. That decision is
 * deterministic arithmetic over a set of verdicts, so it belongs in the free lane
 * rather than being trusted on the day it first has to fail.
 *
 * The runner is driven with --judge=stub-judge.php, which stands in for local
 * Claude Code and returns scripted verdicts. No model is called. What is under
 * test is the runner's parsing, its normalization of a malformed verdict, and its
 * thresholds, including the case that matters most: a judge that says nothing
 * must not be able to make the lane pass.
 *
 * Cost: around 17 seconds, almost all of it PHP process startup, since each case
 * spawns run.php which in turn spawns the stub per corpus entry. That is the
 * slowest file in the gate lane and it is worth it: this is the code that decides
 * whether a leak is reported or swallowed.
 */
class DataRoomEvalRunnerTest extends TestCase
{
    private string $evals;

    private string $corpus;

    private string $results;

    protected function setUp(): void
    {
        parent::setUp();

        $this->evals = realpath(base_path('../evals/data-room')) ?: '';
        if ($this->evals === '' || ! is_file($this->evals.'/run.php')) {
            $this->markTestSkipped('evals/data-room is not present in this checkout.');
        }

        // Unique per test, not per process: one case asserts that a dry run wrote
        // no result file, which a directory shared with an earlier test would
        // quietly break.
        $this->results = sys_get_temp_dir().'/vdr-eval-test-'.getmypid().'-'.uniqid();
        $this->corpus = $this->results.'/corpus.json';

        if (! is_dir($this->results)) {
            mkdir($this->results, 0777, true);
        }

        // A two-case fixture corpus. The runner is being tested, not the API, so
        // the payloads only need the shape the judge prompt reads.
        file_put_contents($this->corpus, json_encode([
            'capturedAt' => now()->toIso8601String(),
            'cases' => [
                [
                    'name' => 'auth.unknown_email',
                    'status' => 401,
                    'headers' => ['Cache-Control' => 'no-store, private', 'X-Robots-Tag' => null],
                    'body' => ['message' => 'We could not verify those details.'],
                ],
                [
                    'name' => 'visitor.dashboard',
                    'status' => 200,
                    'headers' => ['Cache-Control' => 'no-store, private', 'X-Robots-Tag' => null],
                    'body' => ['data' => ['documents' => 2]],
                ],
            ],
        ], JSON_PRETTY_PRINT));
    }

    protected function tearDown(): void
    {
        foreach (glob($this->results.'/*') ?: [] as $file) {
            unlink($file);
        }
        if (is_dir($this->results)) {
            rmdir($this->results);
        }

        parent::tearDown();
    }

    public function test_a_clean_sweep_passes_and_exits_zero(): void
    {
        [$code, $output] = $this->runner('clean');

        $this->assertSame(0, $code, $output);
        $this->assertStringContainsString('PASS', $output);

        $report = $this->report();
        $this->assertSame(2, $report['total']);
        $this->assertSame([], $report['missing']);
        $this->assertSame(1.0, $report['leakage']['rate']);
        $this->assertSame(1.0, $report['copy']['rate']);
        $this->assertTrue($report['passed']);
    }

    public function test_one_leak_in_thirty_cases_fails_the_whole_lane(): void
    {
        [$code, $output] = $this->runner('leak');

        // The leakage threshold is absolute on purpose: an average is meaningless
        // when a single bad response is the entire breach.
        $this->assertSame(1, $code, $output);
        $this->assertStringContainsString('LEAK', $output);
        $this->assertStringContainsString('L2', $output);
        $this->assertStringContainsString('$2y$04$stub', $output);

        $report = $this->report();
        $this->assertSame(['auth.unknown_email'], $report['leakage']['failures']);
        $this->assertSame(0.5, $report['leakage']['rate']);
        // The other dimensions were clean, so this proves the gate is an AND and
        // not a mean across dimensions.
        $this->assertSame(1.0, $report['headers']['rate']);
        $this->assertSame(1.0, $report['copy']['rate']);
        $this->assertFalse($report['passed']);
    }

    public function test_a_cacheable_header_fails_the_lane_on_its_own(): void
    {
        [$code, $output] = $this->runner('headers');

        $this->assertSame(1, $code, $output);
        $this->assertStringContainsString('public, max-age=3600', $output);
        $this->assertSame(['auth.unknown_email'], $this->report()['headers']['failures']);
    }

    public function test_copy_is_averaged_not_absolute(): void
    {
        // Every case scores 2 of 4, which is 50%: below the 85% threshold but not
        // zero, and with leakage and headers both clean. Only the average moved.
        [$code, $output] = $this->runner('weakcopy');

        $this->assertSame(1, $code, $output);

        $report = $this->report();
        $this->assertSame(0.5, $report['copy']['rate']);
        $this->assertSame(2, $report['copy']['scored']);
        $this->assertSame(1.0, $report['leakage']['rate']);
        $this->assertSame([], $report['leakage']['failures']);
        $this->assertFalse($report['passed']);
    }

    public function test_a_judge_that_says_nothing_cannot_make_the_lane_pass(): void
    {
        // The failure mode that would quietly void the whole exercise: an
        // unauthenticated CLI, a crashed judge, a timeout. Silence is a failure,
        // never a skip.
        foreach (['garbage', 'silent'] as $mode) {
            [$code, $output] = $this->runner($mode);

            $this->assertSame(1, $code, "mode {$mode}: {$output}");

            $report = $this->report();
            $this->assertSame(0.0, $report['leakage']['rate'], "mode {$mode}");
            $this->assertSame(0.0, $report['copy']['rate'], "mode {$mode}");
            $this->assertSame(0, $report['copy']['scored'], "mode {$mode}");
            $this->assertFalse($report['passed'], "mode {$mode}");
        }
    }

    public function test_a_verdict_wrapped_in_chatter_is_still_read(): void
    {
        // The judge is told to return bare JSON and sometimes will not. The stub's
        // prose mode prefaces the object with "{see below}", a brace-balanced
        // fragment that is not JSON, so this also pins the parser's behaviour of
        // trying every candidate rather than only the first brace.
        [$code, $output] = $this->runner('prose');

        $this->assertSame(0, $code, $output);
        $this->assertTrue($this->report()['passed']);
    }

    public function test_the_dry_run_calls_no_judge_and_labels_each_audience(): void
    {
        [$code, $output] = $this->runner('clean', ['--dry-run']);

        $this->assertSame(0, $code, $output);
        $this->assertStringContainsString('auth.unknown_email                 audience=outsider', $output);
        $this->assertStringContainsString('visitor.dashboard                  audience=visitor', $output);
        // Nothing was judged, so nothing may have been scored or written.
        $this->assertStringNotContainsString('PASS', $output);
        $this->assertFileDoesNotExist($this->results.'/latest.json');
    }

    public function test_a_missing_corpus_is_an_error_not_an_empty_pass(): void
    {
        $descriptors = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $handle = proc_open(
            [PHP_BINARY, $this->evals.'/run.php', '--corpus='.$this->results.'/nope.json'],
            $descriptors,
            $pipes,
            $this->evals
        );

        $out = stream_get_contents($pipes[1]).stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        $this->assertSame(1, proc_close($handle));
        $this->assertStringContainsString('No corpus at', $out);
    }

    /**
     * Drive run.php against the stub judge.
     *
     * @return array{0:int,1:string} exit code and combined output
     */
    private function runner(string $mode, array $extra = []): array
    {
        $cmd = array_merge([
            PHP_BINARY,
            $this->evals.'/run.php',
            '--judge='.$this->evals.'/stub-judge.php',
            '--corpus='.$this->corpus,
            '--results='.$this->results,
            '--jobs=2',
        ], $extra);

        $descriptors = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $handle = proc_open($cmd, $descriptors, $pipes, $this->evals, ['STUB_JUDGE_MODE' => $mode] + $_ENV);

        $this->assertIsResource($handle, 'Could not start run.php.');

        $output = stream_get_contents($pipes[1]).stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        return [proc_close($handle), $output];
    }

    /** @return array<string,mixed> */
    private function report(): array
    {
        $this->assertFileExists($this->results.'/latest.json');

        $report = json_decode((string) file_get_contents($this->results.'/latest.json'), true)['report'];

        // json_encode writes 1.0 as `1`, so the rates come back as ints. Cast them
        // once here rather than loosening every assertion below.
        foreach (['leakage', 'headers', 'copy'] as $dimension) {
            $report[$dimension]['rate'] = (float) $report[$dimension]['rate'];
        }

        return $report;
    }
}
