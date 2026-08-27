/**
 * Workspace layout. Session provider plus the shell.
 *
 * There is no route-level guard here beyond the provider: the provider redirects
 * when there is no token or the token is dead, and every child screen's data
 * comes from an endpoint that authorizes independently. A guard that only checked
 * for the presence of a token would be decoration.
 */

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DataRoomSessionProvider } from "@/components/dataroom/session";
import { DataRoomShell } from "@/components/dataroom/shell";

export const Route = createFileRoute("/dataroom/workspace")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  return (
    <DataRoomSessionProvider>
      <DataRoomShell>
        <Outlet />
      </DataRoomShell>
    </DataRoomSessionProvider>
  );
}
