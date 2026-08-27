/**
 * One document: viewer on the left, metadata and the download control on the
 * right.
 *
 * A uuid the grant cannot reach returns 404, the same status a uuid that does not
 * exist returns. That is the backend refusing to confirm the document's
 * existence, so this screen must render both cases identically rather than
 * distinguishing "not found" from "not yours".
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { dataRoomApi, type DataRoomDocumentDetail } from "@/lib/api/dataroom";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { useDataRoomSession } from "@/components/dataroom/session";
import { DataRoomBreadcrumbs } from "@/components/dataroom/shell";
import { DocumentMetadataPanel, DocumentViewer } from "@/components/dataroom/viewer";

export const Route = createFileRoute("/dataroom/workspace/documents/$uuid")({
  component: DocumentPage,
});

function DocumentPage() {
  const { uuid } = Route.useParams();
  const navigate = useNavigate();
  const { handleError } = useDataRoomSession();
  const [doc, setDoc] = useState<DataRoomDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDoc(await dataRoomApi.document(uuid));
    } catch (caught) {
      if (handleError(caught)) return;
      setError(
        caught instanceof ApiError && caught.status === 404
          ? // One message for both cases, matching the server.
            "This document is not available to you."
          : "This document could not be loaded. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [uuid, handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Opening document…
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="space-y-4">
        <DataRoomBreadcrumbs
          trail={[{ label: "Data room", to: "/dataroom/workspace" }, { label: "Document" }]}
        />
        <div
          role="alert"
          className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm"
        >
          <h1 className="text-lg font-semibold">Not available</h1>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {error ?? "This document is not available to you."} If you believe you should have
            access, contact the MyTijaara team.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void navigate({ to: "/dataroom/workspace" })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to the data room
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DataRoomBreadcrumbs
        trail={[
          { label: "Data room", to: "/dataroom/workspace" },
          ...(doc.folderName ? [{ label: doc.folderName, to: "/dataroom/workspace" }] : []),
          { label: doc.title },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <DocumentViewer document={doc} />
        <DocumentMetadataPanel document={doc} />
      </div>
    </div>
  );
}
