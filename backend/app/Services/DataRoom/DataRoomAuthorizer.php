<?php

namespace App\Services\DataRoom;

use App\Models\DataRoomAccessGrant;
use App\Models\DataRoomDocument;
use Illuminate\Database\Eloquent\Builder;

/**
 * The single source of truth for "may this grant touch this resource".
 *
 * Both the HTTP layer and the model delegate here so there is exactly one
 * implementation of the rule. Every method takes the grant as loaded from the
 * validated session, never from client input.
 */
class DataRoomAuthorizer
{
    /** Memoized per request so a folder listing does not re-query per document. */
    private array $documentIdCache = [];

    private array $folderIdCache = [];

    public function __construct(private readonly DataRoomPolicyResolver $policy) {}

    /**
     * Can this grant read the document at all?
     *
     * Order matters: an unpublished document is invisible regardless of grant,
     * because publishing is the admin's explicit act of making something
     * shareable.
     */
    public function canAccess(DataRoomAccessGrant $grant, DataRoomDocument $document): bool
    {
        if ($document->status !== 'published') {
            return false;
        }

        if (! $grant->isActive()) {
            return false;
        }

        if ($grant->all_documents_access) {
            return true;
        }

        if (in_array($document->id, $this->allowedDocumentIds($grant), true)) {
            return true;
        }

        return $document->folder_id !== null
            && in_array($document->folder_id, $this->allowedFolderIds($grant), true);
    }

    /**
     * Can this grant download the document?
     *
     * Four independent switches, all of which must be on: the global setting,
     * the grant, the document, and the per-document pivot override. Any single
     * "no" wins, which is what makes an emergency "disable all downloads"
     * effective without touching individual rows.
     */
    public function canDownload(DataRoomAccessGrant $grant, DataRoomDocument $document): bool
    {
        if (! $this->canAccess($grant, $document)) {
            return false;
        }

        if (! $this->policy->downloadsEnabled()) {
            return false;
        }

        if (! $grant->downloads_permitted || ! $document->downloads_permitted) {
            return false;
        }

        if ($grant->all_documents_access) {
            return true;
        }

        $pivot = $grant->documents()
            ->where('dataroom_documents.id', $document->id)
            ->first()?->pivot;

        if ($pivot) {
            return (bool) $pivot->can_download;
        }

        $folderPivot = $grant->folders()
            ->where('dataroom_folders.id', $document->folder_id)
            ->first()?->pivot;

        return $folderPivot ? (bool) $folderPivot->can_download : false;
    }

    /** A query scoped to exactly the published documents this grant may read. */
    public function accessibleDocumentsQuery(DataRoomAccessGrant $grant): Builder
    {
        $query = DataRoomDocument::query()->where('status', 'published');

        if ($grant->all_documents_access) {
            return $query;
        }

        $docIds = $this->allowedDocumentIds($grant);
        $folderIds = $this->allowedFolderIds($grant);

        // No permissions at all: return a query that cannot match. whereRaw(0=1)
        // keeps the return type a Builder so callers can chain uniformly.
        if ($docIds === [] && $folderIds === []) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function (Builder $q) use ($docIds, $folderIds) {
            if ($docIds !== []) {
                $q->orWhereIn('id', $docIds);
            }
            if ($folderIds !== []) {
                $q->orWhereIn('folder_id', $folderIds);
            }
        });
    }

    /** @return array{total:int,accessible:int,restricted:int} */
    public function counts(DataRoomAccessGrant $grant): array
    {
        $total = DataRoomDocument::where('status', 'published')->count();
        $accessible = $this->accessibleDocumentsQuery($grant)->count();

        return [
            'total' => $total,
            'accessible' => $accessible,
            'restricted' => max(0, $total - $accessible),
        ];
    }

    /** @return list<int> */
    public function allowedDocumentIds(DataRoomAccessGrant $grant): array
    {
        return $this->documentIdCache[$grant->id] ??= $grant->documents()
            ->pluck('dataroom_documents.id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /** @return list<int> */
    public function allowedFolderIds(DataRoomAccessGrant $grant): array
    {
        return $this->folderIdCache[$grant->id] ??= $grant->folders()
            ->pluck('dataroom_folders.id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * Download permission for every document this grant can read, resolved in
     * two queries instead of one per card. Used by list endpoints so the UI's
     * download affordance matches what the server will actually allow.
     *
     * @return array<int,bool> document id => may download
     */
    public function downloadPermissionMap(DataRoomAccessGrant $grant): array
    {
        $globallyOn = $this->policy->downloadsEnabled() && $grant->downloads_permitted;

        if (! $globallyOn) {
            return [];
        }

        $documents = $this->accessibleDocumentsQuery($grant)
            ->get(['id', 'folder_id', 'downloads_permitted']);

        if ($grant->all_documents_access) {
            $map = [];
            foreach ($documents as $doc) {
                $map[(int) $doc->id] = (bool) $doc->downloads_permitted;
            }

            return $map;
        }

        $docPivots = $grant->documents()->pluck('can_download', 'dataroom_documents.id')->all();
        $folderPivots = $grant->folders()->pluck('can_download', 'dataroom_folders.id')->all();

        $map = [];
        foreach ($documents as $doc) {
            $id = (int) $doc->id;

            if (! $doc->downloads_permitted) {
                $map[$id] = false;

                continue;
            }

            // A direct document grant takes precedence over the folder grant,
            // so an admin can allow a folder broadly then tighten one file.
            if (array_key_exists($id, $docPivots)) {
                $map[$id] = (bool) $docPivots[$id];

                continue;
            }

            $map[$id] = $doc->folder_id !== null && (bool) ($folderPivots[$doc->folder_id] ?? false);
        }

        return $map;
    }
}
