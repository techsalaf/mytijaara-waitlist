import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, RotateCcw, Save } from "lucide-react";

/**
 * Shell for a settings tab: skeleton while loading, a retry card when the load
 * fails, and a Save button that is disabled with a reason when there is nothing
 * to write. No tab should hand-roll these three states again.
 */
export function SettingsForm<T>({
  title,
  description,
  state,
  successMessage,
  actions,
  children,
}: {
  title: string;
  description?: string;
  state: {
    form: T | null;
    loading: boolean;
    saving: boolean;
    error: string | null;
    dirty: boolean;
    updatedAt: string | null;
    reload: () => void;
    save: (message?: string) => Promise<boolean>;
  };
  successMessage: string;
  /** Extra controls shown left of Save (a test button, for example). */
  actions?: React.ReactNode;
  children: (form: T) => React.ReactNode;
}) {
  const { form, loading, saving, error, dirty, updatedAt } = state;

  return (
    <SectionCard
      title={title}
      description={description}
      actions={
        <>
          {actions}
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90"
            disabled={loading || saving || !form || !dirty}
            title={!dirty && !loading ? "No changes to save" : undefined}
            onClick={() => void state.save(successMessage)}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Could not load these settings
          </div>
          <p className="mt-1 text-xs text-red-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={state.reload}>
            <RotateCcw className="mr-2 h-3 w-3" /> Retry
          </Button>
        </div>
      ) : loading || !form ? (
        <SettingsSkeleton />
      ) : (
        <>
          {children(form)}
          {updatedAt && (
            <p className="mt-5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              Last saved {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </>
      )}
    </SectionCard>
  );
}

export function SettingsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: rows * 2 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded-md bg-muted/60" />
        </div>
      ))}
    </div>
  );
}
