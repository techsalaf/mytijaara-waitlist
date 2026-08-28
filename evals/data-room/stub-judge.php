<?php

/**
 * Stub judge. Gate-lane fixture for run.php, never used in a real eval.
 *
 * The runner's parsing, normalization and threshold arithmetic are deterministic:
 * same verdict text in, same pass or fail out. That belongs in the free lane, so
 * this script stands in for local Claude Code and returns a scripted verdict
 * chosen by the STUB_JUDGE_MODE environment variable.
 *
 * It reads the prompt on stdin exactly as the real judge does, so the runner's
 * process plumbing is exercised too, not bypassed.
 *
 * Modes:
 *   clean    every case passes with copy 4/4
 *   leak     the first case reports an L2 leak
 *   headers  the first case reports a header failure
 *   operator the admin case reports an O1 failure
 *   opnullify the admin case claims dimension 4 does not apply to it
 *   weakcopy every case scores copy 2/4, below the 85% threshold
 *   prose    a correct verdict wrapped in chatter and a code fence
 *   garbage  no JSON at all
 *   silent   exits 0 having printed nothing
 */

declare(strict_types=1);

$prompt = (string) stream_get_contents(STDIN);
$mode = getenv('STUB_JUDGE_MODE') ?: 'clean';

// The case name is read back out of the prompt so the verdict carries the right
// identifier. If this fails, the runner's prompt shape has changed.
preg_match('/"name": "([^"]+)"/', $prompt, $m);
$case = $m[1] ?? 'unknown';

// Which case the single-failure modes pick on. Deterministic across a parallel
// run because it is the name, not the arrival order, that decides.
$isTarget = $case === 'auth.unknown_email';

// The operator-dimension modes pick on an admin read, because a read-back is
// where a plaintext code must not appear. Same reasoning as above: keyed on the
// name, so a parallel run is deterministic.
$isAdminTarget = $case === 'admin.grant_show';

$verdict = [
    'case' => $case,
    'leakage' => ['verdict' => 'pass', 'violated' => null, 'evidence' => null],
    'copy' => ['score' => 4, 'applicable' => true, 'note' => 'Stub.'],
    'headers' => ['verdict' => 'pass', 'evidence' => null],
    'operator' => str_starts_with($case, 'admin.')
        ? ['verdict' => 'pass', 'violated' => null, 'evidence' => null]
        : ['verdict' => 'n/a', 'violated' => null, 'evidence' => null],
    'notes' => 'Stub verdict, mode '.$mode.'.',
];

switch ($mode) {
    case 'leak':
        if ($isTarget) {
            $verdict['leakage'] = ['verdict' => 'fail', 'violated' => 'L2', 'evidence' => '$2y$04$stub'];
        }
        break;

    case 'headers':
        if ($isTarget) {
            $verdict['headers'] = ['verdict' => 'fail', 'evidence' => 'public, max-age=3600'];
        }
        break;

    case 'weakcopy':
        $verdict['copy']['score'] = 2;
        break;

    case 'operator':
        if ($isAdminTarget) {
            $verdict['operator'] = ['verdict' => 'fail', 'violated' => 'O1', 'evidence' => 'MTJ-8F4K-92QX'];
        }
        break;

    case 'opnullify':
        // The judge tries to excuse itself from dimension 4 on the one audience
        // the dimension exists for. The runner decides applicability from the
        // case name, so this must still be counted and must still fail.
        if ($isAdminTarget) {
            $verdict['operator'] = ['verdict' => 'n/a', 'violated' => null, 'evidence' => null];
        }
        break;

    case 'garbage':
        fwrite(STDOUT, "I am not able to grade this.\n");
        exit(0);

    case 'silent':
        exit(0);
}

$json = json_encode($verdict, JSON_UNESCAPED_SLASHES);

if ($mode === 'prose') {
    // The real judge sometimes wraps the object despite being told not to. The
    // runner has to cope, so the stub reproduces the worst version of it: chatter,
    // a fence, and a brace inside a quoted string before the real object.
    fwrite(STDOUT, "Here is my assessment of the payload {see below}:\n\n```json\n".$json."\n```\n\nLet me know if you need more detail.\n");
    exit(0);
}

fwrite(STDOUT, $json."\n");
exit(0);
