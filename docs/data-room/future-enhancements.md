# Future enhancements

Ordered by ratio of value to disruption. Everything in tier 1 fits the existing
shape; nothing in it requires a schema rewrite or a change to the authorization
layer.

## Tier 1 — fits today's architecture

### Email delivery of credentials

The app already has a mail layer for the waitlist. A `DataRoomInvitationMail` sent
from `store()` and `regenerate()`, behind a `send_invitation` boolean so it is never
automatic, closes
[limitation 4](known-limitations.md#4-no-email-delivery-of-credentials) and gives the
audit log a `credentials_sent` row.

Send the code and the room URL in separate messages if the round warrants it. The
code should still be shown on screen; email delivery is an addition, not a
replacement.

### Malware scanning

Zero code. Install ClamAV, set `DATA_ROOM_AV_ENABLED=true` and
`DATA_ROOM_CLAMSCAN_PATH`, re-cache config. The pipeline stage, the quarantine
directory, the exit-code handling and the honest `scanned: false` reporting already
exist. See [deployment.md](deployment.md#optional-malware-scanning).

### Email OTP as a second factor

The flow was arranged for this. There is one insertion point, between "code
verified" and "session issued": the grant is known, no token has been minted, and
both throttle keys are still live. It needs a short-lived pending record, a six-digit
code, its own throttle key, and a second endpoint. Nothing about the session model,
the middleware or `DataRoomAuthorizer` changes.

Worth doing before a round with more than a handful of external parties, since the
access code is currently the single factor.

### Session and grant sweeper

A scheduled command deleting dead `dataroom_sessions` rows and reconciling the
stored `status` column with `effectiveStatus()`. Both are hygiene, not security:
expiry is already enforced on every request, which is why this was left out rather
than shipped half-done. Closes
[limitation 7](known-limitations.md#7-expiry-is-derived-not-swept).

### Automated encrypted backups

The commands in [backup-and-recovery.md](backup-and-recovery.md) are correct and
tested; nothing runs them on a timer. A scheduled job doing dump plus tarball plus
checksum manifest plus GPG plus off-host upload, with the checksum verification as a
post-restore gate, is the remaining operational step.

### Nested folders

`dataroom_folders` is flat. Adding `parent_id` and a recursive read is contained:
nothing in the authorization layer assumes flatness beyond `documents.folder_id`
being a single hop. The folder pivot would need a decision on whether a grant on a
parent implies its children; the honest default is no, matching the current
document-beats-folder precedence.

### Redis-backed rate limiting

`CACHE_STORE=redis` and the counters stop fragmenting across PHP processes. One env
change, plus `TrustProxies` so every visitor behind a proxy does not collapse onto
one key. Closes
[limitation 8](known-limitations.md#8-rate-limiting-is-per-process-cache-per-ip).

## Tier 2 — new surface, same foundations

### Office document preview

LibreOffice headless converting DOCX, XLSX and PPTX to PDF on upload, cached as a
derived artifact next to the original. The viewer already handles PDFs, so the
visitor path does not change. Two decisions: convert on upload or on first request,
and whether the derived PDF is watermarked from the same `watermarkLines()`. Closes
[limitation 2](known-limitations.md#2-office-documents-have-no-in-browser-preview)
without ever posting a cap table to an external service.

### Watermarking beyond PDFs

Images through GD or Imagick is straightforward. Office formats become
straightforward once the conversion above exists, because everything becomes a PDF
first. The fail-open behaviour should stay: denying a legitimate investor over a
file-format quirk is worse than serving an unstamped page, and which path was taken
is recorded either way.

### Q&A thread per document

The natural next diligence feature. A visitor asks a question against a document,
an administrator answers, both are scoped by the same grant. It reuses
`DataRoomAuthorizer` unchanged: a question is only visible if the document is. Two
tables and a controller.

### Per-visitor expiry warning email

24 hours before `expires_at`, one message. The badge already exists in the UI; this
catches the investor who has not logged in that week. Needs the scheduler and a
sent-flag column so it fires once.

### Bulk grant issuance

A CSV of email addresses plus one template, producing one grant each and a
downloadable credential sheet. Useful the day a round opens to a syndicate. The
credential sheet is the sensitive artifact and should be generated once, streamed,
and never stored.

### Data room analytics for the founder

`dataroom_document_views` already carries what is needed for time-on-document and
return-visit patterns. Two constraints hold: do not infer investment intent, and
present engagement neutrally. A visitor who downloads everything may be diligent or
may be redistributing; the data does not distinguish and the UI must not pretend.

## Tier 3 — different product

### Multi-round and multi-tenant

Today's model is one room, one round. Supporting the Series A alongside the pre-seed,
or a second entity, means a `room_id` on documents, folders, grants and settings, and
a scoping decision at every authorizer entry point. Doable, but it touches the one
file that must stay easy to read. Not worth it until a second round is actually
imminent.

### Dynamic per-page watermark rendering

Rendering the PDF server-side per request rather than stamping a copy, so the
watermark cannot be stripped by re-saving. Real anti-exfiltration is a different
class of product (streamed page images, no file ever delivered). It also breaks the
"download and read on a plane" workflow investors actually use. The current position
is deliberate: deterrence and traceability, honestly labelled.

### DocSend-style link sharing

A code-free link with view tracking. It conflicts directly with the current identity
model, where a visitor is a grant tied to an email address, and it weakens the audit
trail to "someone with the link". If it is ever wanted, it should be a separate,
clearly labelled mode, not a relaxation of the existing one.

### Storage encryption at rest

Beyond filesystem-level encryption. Application-level envelope encryption per
document would protect against a stolen disk image but adds a key management
problem, breaks the streaming path (`readStream` + `fpassthru`), and would need the
checksum semantics reconsidered. Filesystem or volume encryption at the host is the
better first move and needs no code.

### Legal review

Not an engineering task, and the reason
[limitation 9](known-limitations.md#9-no-legal-review-of-any-text) exists. The
acknowledgement text, the confidentiality labels and any data-protection claim need
counsel before the room opens to parties who are not already under an NDA. No
compliance claim is made for any framework today, and none should be added by an
engineer.

## Explicitly not planned

- **Visitor self-registration.** Nothing a visitor does may create or widen their
  own identity. That property is load-bearing.
- **Admin accounts implying visitor access.** An administrator wanting to see the
  room issues themselves a grant. Non-negotiable and not configurable.
- **Cookie-based visitor sessions.** Bearer tokens are what keep the cookie jar
  unshared with the public site and with Sanctum, which is what makes the domain
  separation real rather than nominal. The XSS trade-off is named in
  [limitation 5](known-limitations.md#5-sessions-are-bearer-tokens-not-cookies).
- **Signed storage URLs.** A URL that outlives the grant that produced it is the
  exact failure the streaming path exists to prevent.
- **Preventing printing or screenshots.** Cannot be done from a browser. Claiming
  otherwise would be the dishonest kind of security feature.
