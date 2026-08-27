# Storage model

## Where bytes live

One private Laravel disk, `backend/config/filesystems.php:53`:

```php
'dataroom' => [
    'driver' => 'local',
    'root' => env('DATA_ROOM_STORAGE_ROOT', storage_path('app/dataroom')),
    'serve' => false,
    'visibility' => 'private',
    'throw' => false,
    'report' => false,
],
```

- `storage/app/dataroom/` is outside the document root. `public/` is the only
  web-served directory and nothing under it points here.
- `'serve' => false` means Laravel will not register a route for this disk.
- **Never run `php artisan storage:link` against it.** The one thing the spec
  forbade outright was `/public/uploads/financial-model.xlsx`; a symlink would
  recreate exactly that.
- `'throw' => false, 'report' => false` so a missing file yields a controlled 404
  instead of an exception that could surface a filesystem path.

Layout:

```
storage/app/dataroom/
  quarantine/    <uuid>.<ext>   transient, pre-scan
  documents/     <uuid>.<ext>   validated bytes, current and historical versions
```

Filenames are `Str::uuid()` plus the validated extension. Nothing the client sent
influences a path. A filename containing `../`, a null byte or a quote cannot
traverse, because the client name is never part of the path at all — it survives
only as a normalized display label in `original_filename`.

## Upload pipeline

`backend/app/Services/DataRoom/DocumentUploader.php`.

```
validate  ->  quarantine  ->  scan  ->  promote  ->  checksum
```

**1. Extension.** `resolveExtension()` rejects a null byte in the name, then
lowercases **every** dot-separated segment and rejects the upload if any of them
appears in `forbidden_extensions`. `deck.pdf.exe` and `model.php.pdf` both fail,
which a last-segment-only check would miss in one direction each. The final
segment must then be a key in the `allowed` map.

**2. MIME.** `assertMimeMatchesExtension()` compares `$file->getMimeType()`
against the extension's allowed list. That call runs `finfo` over the temp file's
actual bytes. `getClientMimeType()`, the browser-supplied header, is never
consulted. A `.pdf` carrying a PE header or a PHP shell is rejected before
anything is written.

**3. Size.** `max_kb`, default 51200 (50 MB).

**4. Quarantine.** Bytes land in `quarantine/<uuid>.<ext>` first, never directly in
`documents/`.

**5. Scan.** `clamscan --no-summary --stdout <path>` through `symfony/process`
when `dataroom.antivirus.enabled` is true.

```php
return match ($process->getExitCode()) {
    0 => true,
    1 => throw new RuntimeException('That file was rejected by the malware scanner.'),
    default => throw new RuntimeException('The upload could not be scanned and was rejected.'),
};
```

Enabled-but-broken fails closed: a scanner that cannot execute rejects the upload
rather than waving it through. When scanning is disabled the stage returns
`false` and the quarantine file is promoted unscanned. That is reported honestly
all the way out to the API response and the audit row. See
[known-limitations.md](known-limitations.md#1-no-malware-scanning-is-provisioned).

**6. Promote.** `move()` from `quarantine/` to `documents/`. On failure the
quarantine copy is deleted and the upload errors; there is no half-stored state.

**7. Checksum.** `hash_file('sha256', ...)` over the promoted file, stored in
`dataroom_documents.checksum`.

### Filename normalization

`normalizeFilename()` produces the `Content-Disposition` label:

- `basename()` after `\` → `/`, so any directory portion is discarded rather than
  underscored. A label like `_.._.._etc_passwd.pdf` tells a recipient nothing
  useful.
- Strips everything outside `A-Za-z0-9 ._-`, collapses whitespace, trims leading
  dots, caps at 120 characters.
- Falls back to `document` if nothing survives, then appends the validated
  extension.

The result cannot carry a path, a quote or a control character into a response
header.

## How bytes reach a visitor

Only through `GET /api/v1/dataroom/documents/{uuid}/preview` and `/download`.
Both run the full chain before touching the disk:

```
DataRoomAuthenticate:   room open -> session valid -> neither clock expired -> grant active
authorizeDocument():    uuid resolves to a published document -> canAccess()
download() only:        canDownload()  (four gates)
                        bytes exist on disk
                        watermark if policy allows and the type supports it
                        stream
```

Response headers on both:

```
Content-Type: <from a fixed map, never from the client>
Content-Disposition: inline|attachment; filename="<normalized>"
X-Robots-Tag: noindex, nofollow, noarchive
Cache-Control: private, no-store, max-age=0
Pragma: no-cache
```

`Content-Type` comes from `DataRoomDocument::mimeType()`, a fixed match with
`application/octet-stream` as the fallback. An unexpected type downloads rather
than renders, which is what stops a stored-XSS through `Content-Type`. `svg`,
`html` and `htm` are in `forbidden_extensions` for the same reason.

Bytes are streamed with `readStream` + `fpassthru`, so a 50 MB financial model
does not need 50 MB of PHP memory. Watermarked PDFs are the exception: they are
built in memory and returned with an explicit `Content-Length`.

## No URL ever reaches the client

There are no signed URLs, no temporary URLs, no CDN links and no storage
hostnames anywhere in a visitor payload. `file_path` is not in any serialized
response — the eval corpus checks for it structurally in the gate lane and by
reading in the eval lane.

The only document identifier a visitor ever holds is `uuid`. Autoincrement ids
never leave the server for visitor traffic. A UUID is not a secret and is not
treated as one: holding one gets an unauthorized visitor a 404, identical to the
one they get for a UUID that does not exist.

This is a deliberate trade. Streaming through PHP costs more than handing out a
signed URL. What it buys: the permission check and the byte delivery cannot drift
apart, there is no window during which a URL outlives the grant that produced it,
and a revocation takes effect immediately rather than when a signature lapses.

## Watermarking

`PdfWatermarker` stamps each page using `setasign/fpdi` with five lines from
`watermarkLines()`: `CONFIDENTIAL`, `Prepared for: <email>`, the organization,
`MyTijaara Investor Data Room`, and the date.

Both layers must agree — `config('dataroom.watermark_enabled')` and the settings
row — and only PDFs are stamped. When FPDI cannot re-import a source PDF,
`stamp()` returns null and the caller streams the original unstamped. That is a
deliberate fail-open: denying a legitimate investor over a PDF quirk is worse than
serving an unstamped page, and which path was taken is recorded. Details in
[known-limitations.md](known-limitations.md#3-watermarking-covers-pdfs-only-and-can-fail-open).

## Previewable types

`isPreviewable()` returns true for `pdf`, `png`, `jpg`, `jpeg` only. Everything
else shows "Preview unavailable for this file type" and offers a download if all
four gates allow it. No third-party viewer is called, because that would mean
posting a confidential cap table to an external service.

## Versioning on disk

A new version writes a new `documents/<new-uuid>.<ext>`, appends a
`dataroom_document_versions` row and repoints the parent. Prior bytes stay. Disk
therefore grows monotonically; the only thing that removes bytes is
`DELETE /admin/dataroom/documents/{id}?purge=1`, gated on `data-room.delete`.

## Backup implication

The database and `storage/app/dataroom` are one unit. A database-only backup
restores rows whose `file_path` points at nothing, and a files-only backup
restores bytes nothing references. Checksums are the tool for verifying a restore.
See [backup-and-recovery.md](backup-and-recovery.md).

## Tests

`backend/tests/Feature/DataRoomUploadSecurityTest.php`: `.exe` rejected,
double-extension rejected in both orders, PHP payload with a `.pdf` name rejected
on MIME mismatch, `.svg` rejected, path traversal in the filename cannot escape
the disk, null byte rejected, oversize rejected, filename normalization output,
checksum correctness, quarantine emptied after promotion, and that a valid PDF
lands in `documents/` under a generated name.
