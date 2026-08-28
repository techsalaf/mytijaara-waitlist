# Data room eval rubric

The judge reads one captured API response at a time and answers a fixed set of
questions about it. Every question is a reading task: it asks whether the text a
real outsider receives says something it should not, or fails to say something a
real investor needs. None of it is arithmetic, none of it is a regex. The
deterministic checks live in the gate lane (`backend/tests/Feature/DataRoom*`)
and are not repeated here.

## What the judge is given

A single JSON object with four keys:

- `name` — the case identifier, e.g. `auth.unknown_email`
- `status` — the HTTP status the client received
- `headers` — `Cache-Control` and `X-Robots-Tag` as sent
- `body` — the decoded response body, verbatim

Plus the case's declared audience, one of:

- `outsider` — nobody has authenticated. Anyone on the internet can produce this
  response by sending the same request.
- `visitor` — an authenticated grant holder with partial access.
- `operator` — an authenticated administrator at /admin/data-room, holding one or
  more `data-room.*` permissions. Every `admin.*` case is this audience,
  including the 401 and 403 refusals, because the caller is an administrator
  either way.

## Dimension 1 — leakage (threshold 100%)

Every case is scored on this dimension. A single failure fails the lane. There is
no partial credit, because a payload that names one document a visitor cannot open
has already told an attacker that document exists.

Score `pass` only if all of the following hold.

**L1. No existence disclosure.** For an `outsider` case, the body must not make it
possible to tell whether the email address, the access code, or a grant exists.
Four different underlying causes (address unknown, address known but code wrong,
grant revoked, grant expired) must be indistinguishable from the text alone.
Wording like "that code has expired", "no such investor", "this account is
suspended" fails. So does a different status code for a different cause. Does not
apply to an `operator` case: naming a grant's exact status is the whole point of
the admin screen.

**L2. No secret material.** The body must not contain a password hash, a bcrypt
string (`$2y$`), an access code the recipient did not just supply, a PIN, a PIN
hash, a storage path, a filesystem path, a signed storage URL, or a stack trace.
The session token in `auth.success` is the one legitimate exception: that response
is the act of issuing it to the person who just proved they own the grant. On the
operator side there is exactly one more: the `accessCode` in `admin.grant_created`
and `admin.grant_regenerated`, which is the act of minting a credential for the
operator who asked for it. Dimension 4 governs those two cases in detail.

**L3. No internal identifiers.** Autoincrement primary keys, table names, column
names, Eloquent class names, and internal folder or document row ids must not
appear. External references must be opaque (UUIDs). A `uuid` field is fine. Row
ids are permitted in an `operator` case, because the admin API addresses its own
records by id; table names, column names and class names are not permitted in any
audience.

**L4. No content past the authorization boundary.** For a `visitor` case, the body
must not carry the title, description, filename, size, checksum, version, or any
other metadata of a document that visitor cannot view. A locked item may be
acknowledged as locked, and may carry a neutral label, but must not carry its
description. `visitor.document_denied`, `visitor.document_unknown`, and
`visitor.search_withheld` are the cases where this is most likely to be violated:
a withheld document and a nonexistent one must read identically.

**L5. No other visitor.** No case may name, count, or otherwise describe any
visitor, organization, or grant other than the one making the request. Does not
apply to an `operator` case: an administrator's list of grants is a list of
visitors by design.

**L6. No internal error surface.** No exception class, no file and line, no SQL, no
framework version, no "Whoops" page. A 500 with a generic message is a pass on this
point; a 500 that names a class is a fail.

Output for this dimension: `pass` or `fail`, plus, on a fail, the exact substring
that violated it and which of L1 to L6 it violated.

## Dimension 2 — investor-facing copy (threshold 85%)

Scored only on cases a human actually reads as prose: the `message` on any error,
and the visitor-facing text in `gate.*`, `auth.*`, `visitor.dashboard`,
`visitor.folders`, and `visitor.document_denied`. Cases with no human-readable
prose are skipped, not scored zero.

Operator cases are scored on this dimension too, wherever they carry a `message`:
`admin.forbidden_*`, `admin.emergency_wrong_phrase`, `admin.grant_unscoped`,
`admin.grant_reactivation_refused` and `admin.grant_regenerate_refused`. The band
below reads "investor"; for an operator case read it as "administrator". Two
differences in how it is applied:

- A refusal that names the cause is a fail on the visitor side and is expected on
  the operator side, as long as the cause is a rule and not a secret. "A revoked
  grant cannot be reactivated. Issue a new grant instead." is a 4.
- The bare 403 envelope ("This action is unauthorized.") is a 3, not a 2. It is
  shared by the whole admin API and the client turns it into specific guidance
  naming the missing permission; a per-endpoint message here would be a second
  place to keep that copy correct.

Score each applicable case 0 to 4:

- **4** — Reads as though an institutional data room wrote it. Tells the reader what
  to do next without explaining why they were refused. Calm, specific about the
  action, vague about the cause. No blame.
- **3** — Correct and professional, but generic or slightly stiff. A reader knows
  what happened and roughly what to do.
- **2** — Understandable but unhelpful: no next step, or an odd register (too
  casual, too technical, or apologetic to the point of sounding evasive).
- **1** — Confusing, contradictory, or alarming to a legitimate investor. Reads like
  a developer message that escaped.
- **0** — Would embarrass the company in front of an investor, or is empty where the
  reader needed words.

The dimension score is the mean of the applicable case scores, divided by 4.

Two constraints that override the band above and force a maximum of 2:

- Copy that reveals the cause of a refusal scores at most 2, no matter how well it
  is written. Dimension 1 already fails it; this keeps the two scores consistent.
  Applies to `outsider` and `visitor` cases only.
- Copy that claims a legal effect ("you agree", "this constitutes a binding NDA",
  "legally compliant with") scores at most 2. The build was explicit that no
  language reviewed by counsel exists yet.

## Dimension 3 — caching and indexing posture (threshold 100%)

Every case is scored. This dimension is nearly deterministic and is here only
because the judge already has the headers in front of it; the gate lane asserts
the same thing on the responses that stream bytes.

`pass` requires:

- `Cache-Control` on any authenticated or credential-bearing response contains
  `no-store` and `private`. A public `gate` response may be `no-cache, private`.
- Nothing that carries document metadata is publicly cacheable.

Output: `pass` or `fail` with the offending header value.

## Dimension 4 — operator payload discipline (threshold 100%)

Scored only on `operator` cases. Every other case reports `n/a` and is not
counted. Absolute, for the same reason as dimension 1: the admin API is where the
credentials actually live, so one response that hands back a code the operator
already delivered is the whole failure.

An operator is trusted with the room's contents. That is exactly why this
dimension is narrow: it is not about what the operator may know, it is about what
the API is allowed to be able to say.

Score `pass` only if all of the following hold.

**O1. A code is minted once and never read back.** A plaintext access code may
appear only in `admin.grant_created` and `admin.grant_regenerated`, the two
responses that issue one. Every other operator case, including
`admin.grant_show`, `admin.grants_list` and `admin.permission_matrix`, must carry
at most a `codeHint` of four characters. A field that returns a full code on a
read is a fail even though the caller is an administrator: it would mean the code
is recoverable, and the whole grant model says it is not.

**O2. No hash and no PIN.** No bcrypt string (`$2y$`), no `access_code_hash`, no
`global_pin_hash`, no `token_hash`, and no PIN in any form. `admin.settings` and
`admin.settings_pin_set` are where this is most likely to be violated: the
settings payload may say whether a PIN is configured and must never say what it
is.

**O3. No storage path.** No `file_path`, no disk-relative path, no absolute
filesystem path, no signed storage URL. `originalFilename` is fine, since the
operator uploaded it; the location the bytes actually live at is not.

**O4. An irreversible control states its blast radius and its reversal.** For
`admin.emergency_*`, the response must let the operator see what actually
happened in numbers, not adjectives: how many sessions were destroyed, how many
grants were suspended, and the resulting policy state. A refusal
(`admin.emergency_wrong_phrase`) must name the phrase required, since it is a
typing gate in front of a human and not a secret. A control that reports success
with no count, or that suspends grants without saying how many, is a fail.

**O5. No internal error surface.** Same as L6, restated because the admin surface
is the one with the most write paths: no exception class, no file and line, no
SQL, no framework version.

Output for this dimension: `pass` or `fail`, plus, on a fail, the exact substring
that violated it and which of O1 to O5 it violated.

## Verdict format

The judge returns exactly one JSON object per case, nothing else, no prose before
or after, no code fence:

```json
{
  "case": "auth.unknown_email",
  "leakage": { "verdict": "pass", "violated": null, "evidence": null },
  "copy": { "score": 4, "applicable": true, "note": "Names the action, not the cause." },
  "headers": { "verdict": "pass", "evidence": null },
  "operator": { "verdict": "n/a", "violated": null, "evidence": null },
  "notes": "Indistinguishable from the known-email case."
}
```

`violated` is one of `L1` to `L6` or null under `leakage`, and one of `O1` to `O5`
or null under `operator`. `evidence` is the exact offending substring, or null.
`operator.verdict` is `n/a` on any case whose audience is not `operator`. `note`
and `notes` are at most one sentence each.

## Pass thresholds

The lane passes only if all four hold:

| Dimension | Threshold |
| --- | --- |
| Leakage | 100% of cases pass |
| Copy | mean score >= 0.85 |
| Headers | 100% of cases pass |
| Operator | 100% of operator cases pass |

Leakage, headers and operator discipline are absolute because they are security
properties: an average is meaningless when one bad response is the whole breach.
Copy is an average because "is this sentence good" is a judgment with real
variance, and holding it to 100% would make the lane flaky rather than strict.
