/**
 * The access grant table.
 *
 * Every action here is a request the backend independently authorizes and
 * independently validates. The buttons offered per row come from
 * `allowedStatusActions`, which mirrors the transitions the API accepts: a revoked
 * grant offers nothing, because revocation is terminal server-side and an
 * "Activate" button would only produce a 422 the operator has to decode.
 *
 * `codeHint` is the last four characters of the code. The rest is unrecoverable,
 * which is the point: this table cannot leak a credential because it never holds
 * one.
 */

import { useMemo } from "react";
import { KeyRound, MoreHorizontal, PauseCircle, PlayCircle, ShieldOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/admin/ui-bits";
import { StatusPill } from "./bits";
import {
  allowedStatusActions,
  grantStatusView,
  sortGrantsForOperator,
} from "@/lib/dataroom/admin-format";
import { formatDateTime, formatRelative } from "@/lib/dataroom/format";
import type { DataRoomAdminGrant } from "@/lib/api/dataroom-admin";

export type GrantTableAction =
  | { kind: "status"; status: "active" | "suspended" | "revoked" }
  | { kind: "regenerate" }
  | { kind: "delete" }
  | { kind: "open" };

export type GrantTableProps = {
  grants: DataRoomAdminGrant[];
  onAction: (grant: DataRoomAdminGrant, action: GrantTableAction) => void;
  emptyAction?: React.ReactNode;
};

const STATUS_ACTION_LABEL: Record<"active" | "suspended" | "revoked", string> = {
  active: "Reactivate",
  suspended: "Suspend",
  revoked: "Revoke",
};

const STATUS_ACTION_ICON = {
  active: PlayCircle,
  suspended: PauseCircle,
  revoked: ShieldOff,
} as const;

export function GrantTable({ grants, onAction, emptyAction }: GrantTableProps) {
  const rows = useMemo(() => sortGrantsForOperator(grants), [grants]);

  if (!rows.length) {
    return (
      <EmptyState
        illustration="inbox"
        title="No access grants yet"
        description="Nobody can open the data room until a grant exists. The URL alone admits nobody."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Access grants, ordered with the ones needing attention first
        </caption>
        <thead>
          <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">
              Visitor
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Status
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Scope
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Expires
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Uses
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Last seen
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((grant) => {
            const view = grantStatusView(grant.status);
            const actions = allowedStatusActions(grant.status);
            return (
              <tr key={grant.id} className="align-middle hover:bg-muted/30">
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onAction(grant, { kind: "open" })}
                    className="text-left font-medium hover:underline"
                  >
                    {grant.visitorName ?? grant.visitorEmail}
                  </button>
                  <div className="text-xs text-muted-foreground">
                    {grant.visitorEmail}
                    {grant.organization ? ` · ${grant.organization}` : ""}
                  </div>
                  {grant.codeHint && (
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      code ends {grant.codeHint}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <StatusPill view={view} />
                  {grant.storedStatus !== grant.status && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      stored as {grant.storedStatus}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {grant.allDocumentsAccess ? (
                    <span>Whole room</span>
                  ) : (
                    <span>
                      {grant.folders?.length ?? 0} categories, {grant.documents?.length ?? 0}{" "}
                      documents
                    </span>
                  )}
                  <div className="text-muted-foreground">
                    {grant.downloadsPermitted ? "Downloads allowed" : "View only"}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {grant.neverExpires ? (
                    <span className="text-[color-mix(in_oklab,var(--gold)_70%,black)]">Never</span>
                  ) : (
                    formatDateTime(grant.expiresAt)
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {grant.currentUses}
                  {grant.maxUses == null ? "" : ` / ${grant.maxUses}`}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {formatRelative(grant.lastAccessedAt)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${grant.visitorEmail}`}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAction(grant, { kind: "open" })}>
                        View history
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction(grant, { kind: "regenerate" })}>
                        <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
                        Reissue code
                      </DropdownMenuItem>
                      {actions.length > 0 && <DropdownMenuSeparator />}
                      {actions.map((status) => {
                        const Icon = STATUS_ACTION_ICON[status];
                        return (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => onAction(grant, { kind: "status", status })}
                            className={status === "revoked" ? "text-destructive" : undefined}
                          >
                            <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                            {STATUS_ACTION_LABEL[status]}
                          </DropdownMenuItem>
                        );
                      })}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onAction(grant, { kind: "delete" })}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Delete grant
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
