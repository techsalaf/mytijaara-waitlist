# Data room eval lane

The paid, non-deterministic half of the data room's testing. It answers one
question the gate lane cannot: **does anything a stranger, a partially authorized
visitor, or an administrator receives from this API say something it should
not?**

That is a reading task, so a model does it. Everything about it that is
same-input-same-answer stays in code.

## Why this exists separately from the tests

`backend/tests/Feature/DataRoom*` already asserts the mechanical facts: this
status code, that database row, no `file_path` key in the payload, 404 for both
missing and unauthorized. Those are regexes and array assertions. They are free,
they run in the gate lane, and they will never tell you that
`"That access code expired on 12 August"` leaks the existence of a grant while
passing every structural check you wrote.

So the lane splits along the machine-space boundary:

| Half | Space | Cost | Lives in |
| --- | --- | --- | --- |
| Producing the payloads | deterministic | free | `backend/tests/Eval/DataRoomEvalCaptureTest.php` |
| Judging the wording | latent | model tokens | `run.php` + `rubric.md` |
| Deciding pass or fail | deterministic | free | `run.php`, covered by `backend/tests/Feature/DataRoomEvalRunnerTest.php` |

The model reads. It does not decide the threshold, do the arithmetic, or hold the
corpus. Those are code, and they are tested.

## The judge is local Claude Code

`run.php` shells out to the `claude` CLI. No hosted inference endpoint is called
from this repository, by policy. The judge is spawned with `--print` and
`--allowed-tools ''`: a judge that could read the repository might grade the
implementation instead of the response it was handed.

## Running it

Two steps, in order.

**1. Capture the corpus.** Drives the real API and writes every visitor-facing and
operator-facing payload to `captures/`.

```bash
cd backend && vendor/bin/phpunit --configuration=phpunit.eval.xml
```

`phpunit.eval.xml` exists so `tests/Eval` is not registered in `phpunit.xml`.
`artisan test` runs every registered suite, so registering it there would drag the
paid lane into the free one.

**2. Judge the corpus.**

```bash
php evals/data-room/run.php
```

Useful flags:

```bash
php evals/data-room/run.php --dry-run              # list the cases and their audiences, call nothing
php evals/data-room/run.php --jobs=8               # more judges in parallel (default 4)
php evals/data-room/run.php --case=auth.expired_grant --verbose
php evals/data-room/run.php --limit=5
php evals/data-room/run.php --model=opus           # default; no silent downgrade for cost
```

Exit status is 0 when every threshold is met and 1 otherwise, so CI can call it
directly. Results land in `results/latest.json` plus a timestamped copy.

## What gets captured

60 cases as of the last capture. The set is chosen so that the leaks worth
worrying about are visible by comparison, not in isolation:

- `gate.*` — the room open, the room closed, a PIN required, a wrong PIN, and a
  valid credential replayed against a closed room.
- `auth.*` — the five rejection causes side by side (address unknown, address known
  but code wrong, revoked, expired, suspended), the rate-limit lockout, a
  validation error, no token, a garbage token, and the one success.
- `visitor.*` — the dashboard, the folder list with one accessible and one locked
  category, a granted document, a view-only document, a denied document, a
  nonexistent document, a refused download, a preview with no bytes behind it, a
  search that hits, a search whose only match is withheld, the activity feed, the
  acknowledgement, and the two ways a live session dies (global lockdown, grant
  suspended).
- `admin.*` — the operator surface at /admin/data-room: the 401 with no Sanctum
  token and two 403s from a token holding only `data-room.view`, the nine read
  endpoints, two settings writes including the write-only PIN, the whole grant
  credential lifecycle (validation error, unscoped refusal, creation, show, list,
  matrix, extend, regenerate, suspend, revoke, and both terminal-revocation
  refusals), and the four emergency controls including the wrong-phrase refusal.

The pairs are the point. `auth.unknown_email` next to `auth.known_email_wrong_code`
is how you catch enumeration. `visitor.document_denied` next to
`visitor.document_unknown` is how you catch a withheld document announcing itself.
`visitor.search_withheld` is where a search index most often forgets the
authorization boundary. `admin.grant_created` next to `admin.grant_show` is how you
catch a credential that turned out to be recoverable after it was minted.

The capture step asserts its own corpus size before it finishes. A capture run that
quietly produced nothing would otherwise make the whole lane pass by default.

## Thresholds

From `rubric.md`:

| Dimension | Threshold | Why that shape |
| --- | --- | --- |
| Leakage | 100% of cases pass | An average is meaningless when one bad response is the entire breach. |
| Headers | 100% of cases pass | Same. Nearly deterministic; scored here only because the judge already has the headers. |
| Investor-facing copy | mean >= 85% | "Is this sentence good" is a judgment with real variance. Holding it to 100% would make the lane flaky rather than strict. |
| Operator payload discipline | 100% of operator cases pass | The admin API is where the credentials live. One response that hands back a code it already issued is the whole failure. |

Dimension 4 is scored only on `admin.*` cases, and whether it applies is decided by
`run.php` from the case name rather than by the judge. A judge that marked an admin
case `n/a` would otherwise be able to excuse itself from the strictest dimension.
A corpus with no operator cases at all (the shape of `--case=auth.something`)
passes that dimension; the guard against a capture step that silently stops
producing admin cases is the capture test's own corpus-size assertion.

A case the judge never answered for counts as **missing** and fails the lane. A
judge that returns unparseable output, crashes, or times out is recorded as a
leakage failure, not a skip. Silence must never be able to make a security eval
pass. `DataRoomEvalRunnerTest::test_a_judge_that_says_nothing_cannot_make_the_lane_pass`
pins exactly that.

## Files

| Path | What it is |
| --- | --- |
| `rubric.md` | The four dimensions, the verdict format, the thresholds. The judge's entire instruction set. |
| `run.php` | Spawns the judges, parses the verdicts, applies the thresholds, writes the report. |
| `stub-judge.php` | A scripted judge for the gate lane. Reads the prompt on stdin exactly as the real one does and returns a verdict chosen by `STUB_JUDGE_MODE`. Never used in a real eval. |
| `captures/` | Generated by the capture step. Gitignored. |
| `results/` | Generated by `run.php`. Gitignored. |

Both generated directories are gitignored on purpose: the corpus carries a fresh
session token on every run, so committing it would churn, and a stale committed
corpus could be mistaken for the current API. Re-capture instead.

## Known limitations

- **The judge must be logged in.** `run.php` invokes the `claude` CLI, which needs
  its own authenticated session. In an environment where the CLI reports
  `Not logged in`, every case fails as unparseable and the lane reports FAIL. That
  is the correct behaviour, not a bug, but it means the lane cannot run unattended
  without a logged-in CLI. The runner's own logic is covered without a model by
  `DataRoomEvalRunnerTest`, so a missing CLI blocks the eval lane and nothing else.
- **The corpus is a snapshot.** `run.php` warns when the corpus is over an hour
  old. Nothing forces a re-capture, so a payload change followed by a judge run over
  a stale corpus will grade the old wording. Re-run step 1 whenever the API moves.
- **Non-determinism is bounded, not removed.** The same corpus judged twice can
  score differently on the copy dimension. That is why copy is an average with a
  threshold and the three security dimensions are absolute.
- **The corpus carries fixture credentials.** `captures/` holds a live session
  token, the plaintext code from `admin.grant_created`, and the fixture PIN string.
  They are test data against a `RefreshDatabase` schema and are worthless outside
  the run, but the directory is gitignored and should stay that way.
