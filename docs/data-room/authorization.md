# Authorization model

## One authority

`backend/app/Services/DataRoom/DataRoomAuthorizer.php` is the only implementation
of "may this grant touch this resource". Controllers call it. The model's
`canAccessDocument()` delegates to it rather than duplicating the rule. There is
one place to read, one place to change, and one place a bug can hide.

Every method takes the grant as loaded from the validated session
(`$request->attributes->get('dataroom_grant')`). No method accepts an id, a flag,
a permission name or a folder list from the client.

## Read access

```php
public function canAccess(DataRoomAccessGrant $grant, DataRoomDocument $document): bool
{
    if ($document->status !== 'published') return false;
    if (! $grant->isActive())              return false;
    if ($grant->all_documents_access)      return true;
    if (in_array($document->id, $this->allowedDocumentIds($grant), true)) return true;

    return $document->folder_id !== null
        && in_array($document->folder_id, $this->allowedFolderIds($grant), true);
}
```

Order is deliberate. An unpublished document is invisible to every grant,
including an all-access one, because publishing is the administrator's explicit
act of making something shareable. Draft, archived, restricted and superseded
documents are not reachable by any visitor at all.

Three ways to be permitted, checked cheapest first:

1. `all_documents_access` on the grant.
2. A row in `dataroom_access_grant_documents` for that exact document.
3. A row in `dataroom_access_grant_folders` for that document's folder.

Anything else is denied. A grant with no rows in either junction table can read
nothing, and `accessibleDocumentsQuery()` returns `whereRaw('1 = 0')` for it
rather than an unfiltered query.

### Single-document access works

A grant with one row in `dataroom_access_grant_documents` and nothing else reads
exactly that document. Send someone only the Financial Model and they
authenticate normally, see the folder tree's shape, and get 404 on everything
else. `DataRoomAuthorizationTest` asserts this directly.

## Download: four independent gates

```php
public function canDownload(DataRoomAccessGrant $grant, DataRoomDocument $document): bool
{
    if (! $this->canAccess($grant, $document))   return false;   // read access first
    if (! $this->policy->downloadsEnabled())     return false;   // 1. global setting
    if (! $grant->downloads_permitted
        || ! $document->downloads_permitted)     return false;   // 2. grant  3. document
    if ($grant->all_documents_access)            return true;
    // 4. per-document pivot, else per-folder pivot
}
```

All four must say yes. Any single no wins, which is what makes "disable all
downloads" effective in one settings write without touching a single grant or
document row.

The fourth gate has a precedence rule: a direct document pivot beats the folder
pivot, so an administrator can open a folder broadly and then tighten one file
inside it. If neither pivot exists the answer is `false`, not a default-open.

`downloadPermissionMap()` resolves the same answer for a whole list in two
queries instead of one per card, so the UI's download affordance matches what the
server will actually do. It is a UI convenience only — `download` re-runs
`canDownload()` on the single document before streaming a byte.

## Denial is indistinguishable from absence

```php
$doc = DataRoomDocument::where('uuid', $uuid)->where('status', 'published')->first();

if (! $doc) {
    // audit: "unknown document uuid"
    return response()->json(['message' => 'This document is not available.'], 404);
}

if (! $this->authorizer->canAccess($grant, $doc)) {
    // audit: "unauthorized view"
    return response()->json(['message' => 'This document is not available.'], 404);
}
```

Same status, same body, different audit rows. A visitor cannot use the endpoint to
learn that a document exists that they are not allowed to see. This is why the
error is 404 and not 403: a 403 would confirm existence.

`visitor.document_denied` and `visitor.document_unknown` sit next to each other in
the eval corpus for exactly this reason.

Download denial is the one place 403 is correct: read access already proved the
document exists to this visitor, so the only new information is the download
policy, which they need to know.

## What a locked card is allowed to say

Folders are listed even when nothing inside them is accessible, so a visitor
understands the shape of the room and knows what to ask for. What is withheld:

- The folder's `description`, unless the folder or at least one document in it is
  accessible.
- The document's `description`, `fileSize` and `version`.

Title, file type and confidentiality level remain visible. A description can
itself be confidential ("Q3 bridge terms with Acme"), which is why it is on the
withheld side of the line while the title is not.

## Search respects the boundary

```php
$docs = $this->authorizer->accessibleDocumentsQuery($grant)
    ->where(fn ($q) => $q->where('title', 'like', ...)
        ->orWhere('description', 'like', ...)
        ->orWhere('tags', 'like', ...));
```

The permission scope is applied first and the text match narrows it. A search
whose only match is withheld returns an empty array, not a locked card, because a
locked result would confirm that a document matching that term exists.
`visitor.search_withheld` covers this in the eval corpus; a search index that
forgets the boundary is the classic version of this bug.

## Activity is per-visitor

`GET /dataroom/activity` filters on `access_grant_id = $grant->id` and on a
whitelist of five action names. A visitor sees their own trail and no one else's,
and cannot see admin actions.

## Admin authorization

The admin side uses the existing Spatie RBAC. Seven permissions, gated per
endpoint rather than per group, so reading the room does not imply issuing access
to it.

| Permission | Covers |
| --- | --- |
| `data-room.view` | overview, settings read, folder/document lists, admin preview |
| `data-room.upload` | `POST /documents`, `POST /documents/{id}/versions` |
| `data-room.manage-documents` | document metadata, folder CRUD, reorder, restore |
| `data-room.manage-access` | every grant route, templates, permission matrix |
| `data-room.view-activity` | analytics, audit logs |
| `data-room.manage-settings` | `PATCH /settings`, `POST /emergency` |
| `data-room.delete` | `DELETE /documents/{id}` |

`RoleSeeder` gives `super_admin` all 49 permissions and `admin` 37, withholding
`data-room.manage-settings` and `data-room.delete`. An ordinary admin can run the
round; only a super admin can change the security policy, pull the emergency
levers, or destroy bytes.

## The client is never trusted

Payload fields such as `downloadsPermitted`, `accessible` and `previewSupported`
exist so the UI can render a sensible affordance. None of them is consulted on the
next request. The pattern the build was told never to ship as a security
mechanism:

```js
if (user.canDownload) { showDownloadButton(); }   // UX only
```

is exactly what those fields are for, and the server independently re-answers
"can this grant download this document" every single time bytes are requested.

## Tests

`backend/tests/Feature/DataRoomAuthorizationTest.php`: folder-granted access,
document-granted access, single-document isolation, unauthorized document 404,
nonexistent document 404 with identical body, unpublished document invisible to an
all-access grant, download allowed, download denied by each of the four gates
independently, folder pivot vs document pivot precedence, locked card field
withholding, search scope, empty-permission grant sees nothing, and activity
isolation between two grants.
