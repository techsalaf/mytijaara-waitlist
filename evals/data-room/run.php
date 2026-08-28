<?php

/**
 * Data room eval runner. The judging half of the eval lane.
 *
 * Reads the corpus that backend/tests/Eval/DataRoomEvalCaptureTest.php produced,
 * hands each case to LOCAL CLAUDE CODE with evals/data-room/rubric.md, collects
 * one JSON verdict per case, and gates on the rubric's thresholds.
 *
 * It shells out to the `claude` CLI on purpose. No hosted inference endpoint is
 * called from this repository.
 *
 * Usage:
 *   php evals/data-room/run.php
 *   php evals/data-room/run.php --jobs=6 --model=opus
 *   php evals/data-room/run.php --case=auth.unknown_email --verbose
 *   php evals/data-room/run.php --dry-run
 *
 * Exit code is 0 when every threshold is met and 1 otherwise, so CI can call it
 * directly.
 */

declare(strict_types=1);

const ROOT = __DIR__;
const CAPTURES = ROOT.'/captures';
const RESULTS = ROOT.'/results';
const RUBRIC = ROOT.'/rubric.md';

/** From rubric.md. Leakage, headers and operator discipline are absolute; copy is an average. */
const THRESHOLD_LEAKAGE = 1.0;
const THRESHOLD_HEADERS = 1.0;
const THRESHOLD_OPERATOR = 1.0;
const THRESHOLD_COPY = 0.85;

/** A judge that hangs must not hang the lane. Seconds per case. */
const CASE_TIMEOUT = 180;

exit(main($argv));

function main(array $argv): int
{
    $opt = parseArgs($argv);

    $corpusPath = $opt['corpus'] ?? CAPTURES.'/corpus.json';
    if (! is_file($corpusPath)) {
        return fail("No corpus at {$corpusPath}.\nRun the capture step first:\n  cd backend && vendor/bin/phpunit --configuration=phpunit.eval.xml");
    }

    $corpus = json_decode((string) file_get_contents($corpusPath), true);
    if (! is_array($corpus) || ! isset($corpus['cases'])) {
        return fail("Corpus at {$corpusPath} is not readable JSON.");
    }
    $cases = $corpus['cases'];
    if ($opt['case'] !== null) {
        $cases = array_values(array_filter($cases, fn ($c) => $c['name'] === $opt['case']));
        if ($cases === []) {
            return fail("No case named {$opt['case']} in the corpus.");
        }
    }
    if ($opt['limit'] > 0) {
        $cases = array_slice($cases, 0, $opt['limit']);
    }

    $rubric = (string) file_get_contents(RUBRIC);
    $age = round((time() - filemtime($corpusPath)) / 60);

    line(sprintf(
        "data room eval — %d case(s), corpus captured %s (%d min ago), judge: claude %s, %d job(s)",
        count($cases),
        $corpus['capturedAt'] ?? 'unknown',
        $age,
        $opt['judge'] !== null ? 'STUB '.basename($opt['judge']) : $opt['model'],
        $opt['jobs']
    ));
    if ($age > 60) {
        line('  note: the corpus is over an hour old. Re-run the capture step if the API has changed since.');
    }

    if ($opt['dryRun']) {
        foreach ($cases as $case) {
            line(sprintf('  would judge %-34s audience=%s', $case['name'], audienceOf($case['name'])));
        }

        return 0;
    }

    $verdicts = judgeAll($cases, $rubric, $opt);
    $report = score($verdicts, $cases);

    $resultsDir = $opt['results'] ?? RESULTS;
    writeResults($report, $verdicts, $corpus, $resultsDir);
    printReport($report, $verdicts, $opt['verbose']);
    line('  results: '.$resultsDir.'/latest.json');

    return $report['passed'] ? 0 : 1;
}
/**
 * Which side of the authorization boundary the case sits on.
 *
 * The rubric's L1 (no existence disclosure) applies to outsiders and L4 (nothing
 * past the boundary) applies to visitors, so the judge has to be told which one
 * it is looking at. Everything reachable without a token is an outsider case.
 *
 * `operator` is the third audience: an authenticated administrator at
 * /admin/data-room. An operator is allowed to know which investors exist, so L1
 * and L5 do not apply to them, and dimension 4 applies only to them.
 */
function audienceOf(string $name): string
{
    if (str_starts_with($name, 'admin.')) {
        return 'operator';
    }

    // auth.success is the transition. The token in it is legitimate precisely
    // because the caller just proved ownership, so it is judged as a visitor
    // payload, not as something an outsider obtained.
    return str_starts_with($name, 'visitor.') || $name === 'auth.success'
        ? 'visitor'
        : 'outsider';
}

function buildPrompt(array $case, string $rubric): string
{
    $audience = audienceOf($case['name']);
    $payload = json_encode($case, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

    return <<<PROMPT
        You are grading one HTTP response from a private investor data room against
        a fixed rubric. You are not writing code and not fixing anything. Read the
        payload, apply the rubric, return the verdict.

        The rubric follows in full. Apply it exactly as written; do not add
        criteria of your own and do not soften the absolute dimensions.

        ===== RUBRIC =====
        {$rubric}
        ===== END RUBRIC =====

        Case audience: {$audience}

        ===== PAYLOAD =====
        {$payload}
        ===== END PAYLOAD =====

        Return exactly one JSON object in the verdict format the rubric specifies.
        No prose before it, no prose after it, no markdown code fence.
        PROMPT;
}
/**
 * Run every case through local Claude Code, up to $opt['jobs'] at a time.
 *
 * The prompt goes in on stdin rather than as an argv string: several of these
 * payloads contain quotes and newlines, and Windows argument quoting is not
 * worth trusting with them.
 *
 * @return array<string,array<string,mixed>> keyed by case name
 */
function judgeAll(array $cases, string $rubric, array $opt): array
{
    $queue = $cases;
    $running = [];
    $verdicts = [];
    $done = 0;
    $total = count($cases);

    while ($queue !== [] || $running !== []) {
        while ($queue !== [] && count($running) < $opt['jobs']) {
            $case = array_shift($queue);
            $running[$case['name']] = spawnJudge($case, $rubric, $opt['model'], $opt['judge']);
        }

        foreach ($running as $name => $proc) {
            $status = proc_get_status($proc['handle']);
            $proc['out'] .= (string) stream_get_contents($proc['stdout']);
            $proc['err'] .= (string) stream_get_contents($proc['stderr']);
            $running[$name] = $proc;

            $timedOut = (time() - $proc['startedAt']) > CASE_TIMEOUT;
            if ($status['running'] && ! $timedOut) {
                continue;
            }
            if ($timedOut && $status['running']) {
                proc_terminate($proc['handle']);
                $proc['err'] .= "\njudge exceeded ".CASE_TIMEOUT.'s and was terminated';
            }

            fclose($proc['stdout']);
            fclose($proc['stderr']);
            proc_close($proc['handle']);
            unset($running[$name]);

            $verdicts[$name] = parseVerdict($name, $proc['out'], $proc['err']);
            $done++;
            line(sprintf('  [%2d/%2d] %-34s %s', $done, $total, $name, oneLineOutcome($verdicts[$name])));
        }

        if ($running !== []) {
            usleep(200_000);
        }
    }

    return $verdicts;
}
/** @return array<string,mixed> the live process record judgeAll() polls */
function spawnJudge(array $case, string $rubric, string $model, ?string $judge = null): array
{
    // --print for a single non-interactive turn. No tools are granted: the judge
    // only has to read the payload it was handed, and a judge that could read the
    // repository might grade the code instead of the response.
    //
    // $judge exists so the runner's own parsing and scoring can be exercised
    // against a stub in the gate lane, where no model may be called. It is not a
    // way to swap in a hosted API.
    $cmd = $judge !== null
        ? [PHP_BINARY, $judge]
        : ['claude', '--print', '--model', $model, '--allowed-tools', ''];

    $descriptors = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $handle = proc_open($cmd, $descriptors, $pipes, ROOT);

    if (! is_resource($handle)) {
        throw new RuntimeException("Could not start the judge for {$case['name']}. Is the claude CLI on PATH?");
    }

    fwrite($pipes[0], buildPrompt($case, $rubric));
    fclose($pipes[0]);
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);

    return [
        'handle' => $handle,
        'stdout' => $pipes[1],
        'stderr' => $pipes[2],
        'out' => '',
        'err' => '',
        'startedAt' => time(),
    ];
}

/**
 * Pull the verdict object out of whatever the judge said.
 *
 * A judge that returns unparseable output is treated as a leakage failure, not
 * as a skip. Silence must never be able to make the lane pass.
 */
function parseVerdict(string $name, string $out, string $err): array
{
    $json = extractJson($out);

    if ($json === null) {
        return [
            'case' => $name,
            'leakage' => ['verdict' => 'fail', 'violated' => null, 'evidence' => null],
            'copy' => ['score' => 0, 'applicable' => false, 'note' => null],
            'headers' => ['verdict' => 'fail', 'evidence' => null],
            'operator' => ['verdict' => audienceOf($name) === 'operator' ? 'fail' : 'n/a', 'violated' => null, 'evidence' => null],
            'notes' => 'The judge returned no parseable verdict.',
            'judgeError' => trim($err) !== '' ? trim($err) : trim($out),
        ];
    }
    // Normalized so score() never has to guard for a missing key. An absent
    // dimension counts as a failure of that dimension, for the same reason.
    //
    // Whether dimension 4 applies is decided here from the case name, not from
    // what the judge claimed: a judge that marked an admin case `n/a` would
    // otherwise be able to excuse itself from the strictest dimension.
    return [
        'case' => $name,
        'leakage' => [
            'verdict' => ($json['leakage']['verdict'] ?? '') === 'pass' ? 'pass' : 'fail',
            'violated' => $json['leakage']['violated'] ?? null,
            'evidence' => $json['leakage']['evidence'] ?? null,
        ],
        'copy' => [
            'score' => isset($json['copy']['score']) ? (int) $json['copy']['score'] : 0,
            'applicable' => (bool) ($json['copy']['applicable'] ?? false),
            'note' => $json['copy']['note'] ?? null,
        ],
        'headers' => [
            'verdict' => ($json['headers']['verdict'] ?? '') === 'pass' ? 'pass' : 'fail',
            'evidence' => $json['headers']['evidence'] ?? null,
        ],
        'operator' => audienceOf($name) !== 'operator'
            ? ['verdict' => 'n/a', 'violated' => null, 'evidence' => null]
            : [
                'verdict' => ($json['operator']['verdict'] ?? '') === 'pass' ? 'pass' : 'fail',
                'violated' => $json['operator']['violated'] ?? null,
                'evidence' => $json['operator']['evidence'] ?? null,
            ],
        'notes' => $json['notes'] ?? null,
        'judgeError' => null,
    ];
}

/**
 * Find the verdict object in the judge's output.
 *
 * Every `{` is tried in turn, not just the first one: a judge that prefaces the
 * object with "Here is my assessment {see below}" would otherwise hand the parser
 * a brace-balanced fragment that is not JSON, and the case would be recorded as
 * unparseable. The first candidate that both balances and decodes to an object
 * carrying a `leakage` key wins, so a stray `{}` earlier in the chatter cannot
 * shadow the real verdict either.
 */
function extractJson(string $text): ?array
{
    $offset = 0;

    while (($start = strpos($text, '{', $offset)) !== false) {
        $end = matchingBrace($text, $start);

        if ($end !== null) {
            $decoded = json_decode(substr($text, $start, $end - $start + 1), true);
            if (is_array($decoded) && array_key_exists('leakage', $decoded)) {
                return $decoded;
            }
        }

        $offset = $start + 1;
    }

    return null;
}

/**
 * Offset of the `}` closing the `{` at $start, or null if it never closes.
 *
 * Brace counting rather than a regex, because the evidence field can legitimately
 * contain braces. String literals are tracked so a brace inside a quoted evidence
 * string does not throw the depth off.
 */
function matchingBrace(string $text, int $start): ?int
{
    $depth = 0;
    $inString = false;
    $escaped = false;

    for ($i = $start, $len = strlen($text); $i < $len; $i++) {
        $ch = $text[$i];

        if ($inString) {
            if ($escaped) {
                $escaped = false;
            } elseif ($ch === '\\') {
                $escaped = true;
            } elseif ($ch === '"') {
                $inString = false;
            }

            continue;
        }
        if ($ch === '"') {
            $inString = true;
        } elseif ($ch === '{') {
            $depth++;
        } elseif ($ch === '}') {
            $depth--;
            if ($depth === 0) {
                return $i;
            }
        }
    }

    return null;
}

/**
 * Apply the rubric's thresholds.
 *
 * The case list is passed in as well as the verdicts so a case the judge never
 * answered for is counted as missing rather than silently dropped.
 */
function score(array $verdicts, array $cases): array
{
    $total = count($cases);
    $leakFails = [];
    $headerFails = [];
    $operatorFails = [];
    $operatorScored = 0;
    $copyScores = [];
    $missing = [];

    foreach ($cases as $case) {
        $name = $case['name'];
        if (! isset($verdicts[$name])) {
            $missing[] = $name;

            continue;
        }

        $v = $verdicts[$name];
        if ($v['leakage']['verdict'] !== 'pass') {
            $leakFails[] = $name;
        }
        if ($v['headers']['verdict'] !== 'pass') {
            $headerFails[] = $name;
        }
        if (($v['operator']['verdict'] ?? 'n/a') !== 'n/a') {
            $operatorScored++;
            if ($v['operator']['verdict'] !== 'pass') {
                $operatorFails[] = $name;
            }
        }
        if ($v['copy']['applicable']) {
            $copyScores[] = max(0, min(4, $v['copy']['score']));
        }
    }
    $leakageRate = $total > 0 ? (count($cases) - count($leakFails) - count($missing)) / $total : 0.0;
    $headerRate = $total > 0 ? (count($cases) - count($headerFails) - count($missing)) / $total : 0.0;
    // A corpus with no readable prose at all would divide by zero. That is a
    // broken capture step, so it scores zero rather than a vacuous 1.0.
    $copyRate = $copyScores !== [] ? (array_sum($copyScores) / count($copyScores)) / 4 : 0.0;
    // Dimension 4 is different: a corpus with no operator cases is the normal
    // shape of `--case=auth.something`, not a broken capture, so an empty set
    // passes. The capture step's own corpus-size assertion is what guarantees
    // the admin surface is present in a full run.
    $operatorRate = $operatorScored > 0
        ? ($operatorScored - count($operatorFails)) / $operatorScored
        : 1.0;

    return [
        'total' => $total,
        'missing' => $missing,
        'leakage' => ['rate' => $leakageRate, 'threshold' => THRESHOLD_LEAKAGE, 'failures' => $leakFails],
        'headers' => ['rate' => $headerRate, 'threshold' => THRESHOLD_HEADERS, 'failures' => $headerFails],
        'operator' => [
            'rate' => $operatorRate,
            'threshold' => THRESHOLD_OPERATOR,
            'failures' => $operatorFails,
            'scored' => $operatorScored,
        ],
        'copy' => ['rate' => $copyRate, 'threshold' => THRESHOLD_COPY, 'scored' => count($copyScores)],
        'passed' => $missing === []
            && $leakageRate >= THRESHOLD_LEAKAGE
            && $headerRate >= THRESHOLD_HEADERS
            && $operatorRate >= THRESHOLD_OPERATOR
            && $copyRate >= THRESHOLD_COPY,
    ];
}

function writeResults(array $report, array $verdicts, array $corpus, string $dir): void
{
    if (! is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $body = json_encode([
        'ranAt' => date('c'),
        'corpusCapturedAt' => $corpus['capturedAt'] ?? null,
        'report' => $report,
        'verdicts' => array_values($verdicts),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

    file_put_contents($dir.'/latest.json', $body);
    file_put_contents($dir.'/run-'.date('Ymd-His').'.json', $body);
}

function printReport(array $report, array $verdicts, bool $verbose): void
{
    line('');
    line(sprintf('  leakage  %s  %s  (threshold %d%%)',
        bar($report['leakage']['rate']), pct($report['leakage']['rate']), (int) (THRESHOLD_LEAKAGE * 100)));
    line(sprintf('  headers  %s  %s  (threshold %d%%)',
        bar($report['headers']['rate']), pct($report['headers']['rate']), (int) (THRESHOLD_HEADERS * 100)));
    line(sprintf('  operator %s  %s  (threshold %d%%, %d case(s) scored)',
        bar($report['operator']['rate']), pct($report['operator']['rate']), (int) (THRESHOLD_OPERATOR * 100), $report['operator']['scored']));
    line(sprintf('  copy     %s  %s  (threshold %d%%, %d case(s) scored)',
        bar($report['copy']['rate']), pct($report['copy']['rate']), (int) (THRESHOLD_COPY * 100), $report['copy']['scored']));
    line('');
    foreach ($report['missing'] as $name) {
        line("  MISSING  {$name} — the judge produced no verdict for this case.");
    }

    foreach ($report['leakage']['failures'] as $name) {
        $v = $verdicts[$name];
        line(sprintf('  LEAK     %s  %s', $name, $v['leakage']['violated'] ?? '?'));
        if (($v['leakage']['evidence'] ?? null) !== null) {
            line('             evidence: '.trim((string) $v['leakage']['evidence']));
        }
        if (($v['notes'] ?? null) !== null) {
            line('             '.trim((string) $v['notes']));
        }
        if (($v['judgeError'] ?? null) !== null) {
            line('             judge stderr: '.substr(trim((string) $v['judgeError']), 0, 400));
        }
    }

    foreach ($report['headers']['failures'] as $name) {
        line(sprintf('  HEADERS  %s  %s', $name, trim((string) ($verdicts[$name]['headers']['evidence'] ?? '?'))));
    }

    foreach ($report['operator']['failures'] as $name) {
        $v = $verdicts[$name];
        line(sprintf('  OPERATOR %s  %s', $name, $v['operator']['violated'] ?? '?'));
        if (($v['operator']['evidence'] ?? null) !== null) {
            line('             evidence: '.trim((string) $v['operator']['evidence']));
        }
        if (($v['judgeError'] ?? null) !== null) {
            line('             judge stderr: '.substr(trim((string) $v['judgeError']), 0, 400));
        }
    }

    if ($verbose) {
        line('');
        foreach ($verdicts as $name => $v) {
            line(sprintf('  %-34s leak=%-4s hdr=%-4s op=%-4s copy=%s  %s',
                $name,
                $v['leakage']['verdict'],
                $v['headers']['verdict'],
                $v['operator']['verdict'] ?? 'n/a',
                $v['copy']['applicable'] ? $v['copy']['score'].'/4' : ' n/a',
                trim((string) ($v['copy']['note'] ?? $v['notes'] ?? ''))));
        }
    }

    line('');
    line($report['passed']
        ? '  PASS — every threshold met.'
        : '  FAIL — see the lines above.');
}

function oneLineOutcome(array $v): string
{
    if ($v['leakage']['verdict'] !== 'pass') {
        return 'LEAK '.($v['leakage']['violated'] ?? '?');
    }
    if ($v['headers']['verdict'] !== 'pass') {
        return 'HEADERS';
    }
    if (($v['operator']['verdict'] ?? 'n/a') === 'fail') {
        return 'OPERATOR '.($v['operator']['violated'] ?? '?');
    }

    return $v['copy']['applicable'] ? 'ok  copy '.$v['copy']['score'].'/4' : 'ok';
}
function parseArgs(array $argv): array
{
    $opt = [
        // Best available model by default. No silent downgrade for cost.
        'model' => 'opus',
        'jobs' => 4,
        'limit' => 0,
        'case' => null,
        'verbose' => false,
        'dryRun' => false,
        // Path to a stub judge script. Gate-lane use only. See spawnJudge().
        'judge' => null,
        // Alternate corpus path. Lets the gate lane drive the runner over a
        // fixture instead of whatever the last capture run happened to leave.
        'corpus' => null,
        // Where results land. Overridden by the gate lane so a test run never
        // overwrites a real eval result.
        'results' => null,
    ];

    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--verbose' || $arg === '-v') {
            $opt['verbose'] = true;
        } elseif ($arg === '--dry-run') {
            $opt['dryRun'] = true;
        } elseif (str_starts_with($arg, '--model=')) {
            $opt['model'] = substr($arg, 8);
        } elseif (str_starts_with($arg, '--jobs=')) {
            $opt['jobs'] = max(1, (int) substr($arg, 7));
        } elseif (str_starts_with($arg, '--limit=')) {
            $opt['limit'] = max(0, (int) substr($arg, 8));
        } elseif (str_starts_with($arg, '--case=')) {
            $opt['case'] = substr($arg, 7);
        } elseif (str_starts_with($arg, '--judge=')) {
            $opt['judge'] = substr($arg, 8);
        } elseif (str_starts_with($arg, '--corpus=')) {
            $opt['corpus'] = substr($arg, 9);
        } elseif (str_starts_with($arg, '--results=')) {
            $opt['results'] = substr($arg, 10);
        } else {
            fwrite(STDERR, "Unknown option: {$arg}\n");
            exit(2);
        }
    }

    return $opt;
}

function bar(float $rate): string
{
    $filled = (int) round($rate * 20);

    return '['.str_repeat('#', $filled).str_repeat('.', 20 - $filled).']';
}

function pct(float $rate): string
{
    return str_pad(number_format($rate * 100, 1).'%', 6, ' ', STR_PAD_LEFT);
}

function line(string $text): void
{
    fwrite(STDOUT, $text."\n");
}

function fail(string $message): int
{
    fwrite(STDERR, $message."\n");

    return 1;
}
