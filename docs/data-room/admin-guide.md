# Administrator guide

Everything is administered at **`/admin/data-room`**, inside the existing admin
panel, with the existing admin login. The API sits under
`/api/v1/admin/dataroom/*` behind `auth:sanctum` plus a per-endpoint permission.

Your admin account does **not** give you visitor access. If you want to see the
room as an investor sees it, issue yourself a grant and authenticate at `/dataroom`
like anyone else. That separation is deliberate and is not configurable.

## Permissions you need

| To do this | You need |
| --- | --- |
| Read the room, preview a document as admin | `data-room.view` |
| Upload a document or a new version | `data-room.upload` |
| Edit metadata, manage folders, reorder, restore | `data-room.manage-documents` |
| Anything to do with grants, templates, the matrix | `data-room.manage-access` |
| Analytics and audit logs | `data-room.view-activity` |
| Change settings, pull an emergency lever | `data-room.manage-settings` |
| Permanently delete a document | `data-room.delete` |

`super_admin` holds all seven. `admin` holds five: `manage-settings` and `delete`
are withheld, so an ordinary admin can run the round but cannot change the security
policy or destroy bytes.

## Day one, in order

### 1. Confirm the room is closed to the public

Nothing links to `/dataroom` from the public site. Check
`GET /api/v1/dataroom/gate` returns three fields and nothing else.

### 2. Create the folder structure

Five categories ship seeded at sort orders 10 to 50:

```
01 Corporate Governance      10
02 Financials & Models       20
03 Pitch Deck & Strategy     30
04 Product & Technology      40
05 Commercial & Traction     50
```

The gaps are intentional. A new folder can slot between two existing ones without
renumbering. Add more through the folders screen; nothing about the structure is
hard-coded.

### 3. Upload documents

Allowed: PDF, DOCX, XLSX, PPTX, CSV, PNG, JPG, JPEG, ZIP, TXT, MD. Max 50 MB.

Each upload runs validate → quarantine → scan → promote → checksum. If the response
shows `malwareScanned: false`, no scanner is provisioned in this deployment. That is
the default state and it is reported honestly rather than hidden; see
[known-limitations.md](known-limitations.md#1-no-malware-scanning-is-provisioned)
and [deployment.md](deployment.md#optional-malware-scanning) to turn it on.

Set per document:

- **Status.** Only `published` is visitor-reachable. Upload as `draft` while you
  are still checking a file. An unpublished document is invisible to every grant,
  including a full-access one.
- **Confidentiality level.** Descriptive metadata for the reader. It does **not**
  affect access; `canAccess()` never reads it. Do not use it as a permission.
- **Downloads permitted.** Gate 3 of 4.
- **Start Here order.** Sets the dashboard reading list. Leave null for everything
  you do not want featured. Five show.

### 4. Verify the folder-level shape

Open the documents list filtered by folder. What a visitor sees for a folder they
cannot reach is the folder name only, no description and no contents. That is
intended: they learn the shape of the room and know what to ask for.

### 5. Issue the first grant

See [Creating an access grant](#creating-an-access-grant) below.

## Creating an access grant

Four steps, one API call.

**Step 1, visitor.** Email (immutable afterwards), name, organization, role title.
The email is half the credential.

**Step 2, access window.** Duration `1h`, `6h`, `24h`, `3d`, `7d`, `14d`, `30d`,
`custom` with an explicit date, or `never`. `never` requires the confirmation
checkbox. Optional start date, which makes the grant `pending` until it arrives.
Optional max uses, counted per authentication rather than per request.

**Step 3, permissions.** Either pick a template or build the scope by hand. A
template seeds the scope and anything you change afterwards wins, so what the
review step shows is exactly what gets saved. Templates are copied, not linked:
editing a template later never changes an already-issued grant.

Three levels:

- Room-wide: `all_documents_access`. Every published document.
- Folder: opens a category, with its own download flag.
- Document: one file, with download and print flags.

A document-level setting beats the folder-level one for downloads, so you can open
a category broadly and tighten one file inside it.

Single-document access works. Grant only the Financial Model and the investor
authenticates normally, sees the folder tree's shape, and gets 404 on everything
else.

A grant must have some scope. An empty one is rejected:

> A grant must include at least one document or category, or full access.

**Step 4, review, then create.** The response shows the plaintext code **once**:

```
MTJ-8F4K-92QX
```

Copy it now. Only the bcrypt hash and the last four characters are stored. If it is
lost, regenerate; there is no recovery. The four-character hint exists so you can
match a grant to a code someone quotes at you on a call.

### Sending the credentials

Manual, by design. Nothing is emailed automatically. Send the email address and the
code out of band, and the two separately if the round warrants it. The consequence
is that the system has no record of how a code reached its recipient; that is
recorded in
[known-limitations.md](known-limitations.md#4-no-email-delivery-of-credentials).

Do not paste the code into the grant's `notes` field. Notes are internal but they
are stored in plaintext and defeat the point of hashing.

## Managing a live grant

| Action | Effect |
| --- | --- |
| Suspend | pauses access, reversible. Every live session for that grant is deleted immediately and the count is reported |
| Revoke | terminal. Cannot be undone. Sessions destroyed immediately |
| Extend | new duration or explicit date. `never` still needs confirmation. The transition is audited as `old -> new` |
| Regenerate | new code shown once, old hash overwritten. The old code stops working instantly |
| Delete | soft delete. History is preserved |

A suspended or revoked investor loses access on their next click, not at the end of
a session timeout. Nothing is cached.

**Revocation cannot be reversed.** Moving a revoked grant back to active is refused:

> A revoked grant cannot be reactivated. Issue a new grant instead.

Reissue as a new grant with a new code. That keeps the audit story unambiguous.

## Grant detail view

`GET /grants/{id}` gives you, in one request:

- the grant with its `effectiveStatus()`, which layers the clock and the use
  counter over the stored column
- the last 200 audit rows: action, details, target title, IP, timestamp
- live sessions: IP, user agent, last active, both expiry clocks

"What happened to this investor's access" is that one screen.

## Permission matrix

`GET /permission-matrix` renders documents down and grants across. Use it to answer
"who can see the cap table" without opening ten grants. It is a read; change
permissions on the grant itself.

## Activity and audit

Two different records, on purpose.

**Analytics** (`/analytics`) aggregates `dataroom_document_views`: most viewed, most
downloaded, daily trend, per-visitor engagement. Read it as behaviour, not
intent. A investor who downloads everything may be diligent, or may be forwarding
it. The data does not distinguish, and the UI does not pretend to.

**Audit logs** (`/audit-logs`) are the forensic record. Filter by date, visitor,
organization, document, action, and success or failure. This is where a generic 401
becomes readable: the visitor saw one sentence, the log says `unknown email`, `code
mismatch` or `status: revoked`.

Your own actions are logged too, with your `user_id`. Audit logging is on the
always-logged list, so it cannot be switched off and then worked around.

## Settings

`PATCH /settings`, needs `manage-settings`.

| Setting | Effect |
| --- | --- |
| Enabled | false takes the room offline for everyone |
| Global PIN enabled / hash | optional shared barrier. See below |
| Default access duration (days) | prefills the wizard |
| Session timeout (minutes) | idle clock |
| Max failed attempts | throttle ceiling |
| Downloads enabled | gate 1 of 4. One write disables every download in the room |
| Watermark enabled | ANDed with the deployment config |
| Audit logging enabled | does not cover administrative actions |
| Emergency lockdown | see below |

Every one of these is a floor, not a ceiling. `config/dataroom.php` sets the
maximum the deployment allows and you can only tighten it. If you set the session
timeout to 120 minutes and the config says 30, 30 wins.

The PIN is a barrier, not a factor. Everyone admitted shares it, so it identifies
nobody. Generate the hash with `php artisan dataroom:hash-pin`. A PIN switch turned
on with no hash configured is treated as no PIN rather than as an open door.

## Emergency controls

`POST /emergency`. Each requires you to type the confirmation phrase exactly.

| Action | Phrase | What it does |
| --- | --- | --- |
| Lock entire data room | `LOCK ENTIRE DATA ROOM` | every request 403 before the token is even read |
| Revoke all active sessions | `REVOKE ALL SESSIONS` | every session row deleted. Grants still valid, everyone re-authenticates |
| Disable all downloads | `DISABLE ALL DOWNLOADS` | reading continues, no bytes leave as attachments |
| Disable all access grants | `DISABLE ALL ACCESS GRANTS` | every active grant suspended. Reversible per grant |

Use lockdown when you do not yet know what happened. Use revoke-all-sessions when
you believe a token leaked but the codes are fine. Use disable-all-downloads when a
document turns out to be wrong and you want to stop redistribution while you fix
it.

Lockdown and "disabled" show the visitor the same sentence on purpose, so an
outsider cannot tell an incident from routine maintenance.

## Versioning

Uploading a new version writes new bytes, appends a version row and repoints the
document. Prior bytes stay on disk. Visitors always get the current version.

A bad upload is fixed by uploading the correct version, not by deleting anything.
Disk grows monotonically; only `DELETE /documents/{id}?purge=1` removes bytes, and
that needs `data-room.delete`.

## Things that will surprise you once

- Setting a document to `restricted` does not restrict it to a subset. It makes it
  invisible to everyone. Use grant scope for partial access.
- `confidentiality_level` is a label. It is shown on locked cards and never checked
  by the authorizer.
- A grant with `all_documents_access` still cannot see a draft.
- The visitor's UI download button is an affordance. The server re-checks all four
  gates on every request, so a stale button produces a 403, not a leak.
- A grant's stored `status` column can read `active` while the API reports
  `expired`. `effectiveStatus()` is the truth; the column is authoritative only for
  `revoked` and `suspended`.

## Weekly routine

1. Audit logs filtered to failures. Repeated `code mismatch` on one email means a
   code was mistyped or is being guessed.
2. Grants list. Revoke anything past its useful life rather than letting it expire
   silently; an expired grant is dead but a revoked one is a decision on record.
3. Analytics. Which documents nobody opens usually means the reading list is wrong,
   not that the document is unwanted.
4. Live sessions on any grant you did not expect to be active.
