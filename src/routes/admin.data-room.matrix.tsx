/**
 * `/admin/data-room/matrix` — the read-back before anything is sent.
 *
 * This tab exists so an operator can check what a grant actually reaches before
 * handing over a code, rather than inferring it from the wizard's checkboxes. The
 * cells are computed by the backend from the same pivot rows the authorizer
 * reads, so a surprise here is a real surprise, not a rendering difference.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { loadState } from "@/components/admin/dataroom/bits";
import { useResource } from "@/components/admin/dataroom/use-resource";
import { PermissionMatrix } from "@/components/admin/dataroom/permission-matrix";
import { dataRoomAdminApi } from "@/lib/api/dataroom-admin";

export const Route = createFileRoute("/admin/data-room/matrix")({
  component: DataRoomMatrixRoute,
});

function DataRoomMatrixRoute() {
  const load = useCallback(async () => (await dataRoomAdminApi.permissionMatrix()).data, []);
  const res = useResource(load, "Could not load the permission matrix.");

  const state = loadState({
    loading: res.loading,
    error: res.error,
    forbidden: res.forbidden,
    onRetry: () => void res.reload(),
    label: "the permission matrix",
  });
  if (state || !res.data) return state;

  return (
    <SectionCard
      title="Permission matrix"
      description="Every document against every grant, as the server decides it. Draft and archived rows are shown so you can see they are invisible to visitors."
      actions={
        <Button
          variant="outline"
          size="sm"
          disabled={res.refreshing}
          onClick={() => void res.reload()}
        >
          <RefreshCw
            className={res.refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"}
            aria-hidden="true"
          />
          Refresh
        </Button>
      }
    >
      <PermissionMatrix matrix={res.data} />
    </SectionCard>
  );
}
