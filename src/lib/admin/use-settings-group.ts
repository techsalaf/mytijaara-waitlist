import { useCallback, useEffect, useState } from "react";
import { settingsApi, type SettingsGroup } from "@/lib/api/settings";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

/**
 * Load and save one settings group.
 *
 * Every Settings tab used to keep its own copy of this logic, and every copy
 * posted field names the backend does not accept. `SettingsController::rules()`
 * silently drops unknown keys, so those saves merged nothing while the page
 * still toasted "Saved". Centralising it means there is one place where the
 * field names have to match the contract, and one place that reports failure.
 */

/** Message from an ApiError, preferring the first field-level validation error. */
export function settingsError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.firstError;
  return err instanceof Error ? err.message : fallback;
}

export type SettingsGroupState<T> = {
  /** Server values merged over the defaults. Null until the first load lands. */
  form: T | null;
  loading: boolean;
  saving: boolean;
  /** Load failure. Rendered as a retry card rather than swallowed into a toast. */
  error: string | null;
  /** True when the form differs from what the server last confirmed. */
  dirty: boolean;
  /** ISO timestamp of the last write, straight from `meta.updated_at`. */
  updatedAt: string | null;
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Replace several fields at once. */
  patch: (values: Partial<T>) => void;
  reload: () => void;
  /** PATCHes the whole form. Returns true when the row was written. */
  save: (successMessage?: string) => Promise<boolean>;
};

export function useSettingsGroup<T extends Record<string, unknown>>(
  group: SettingsGroup,
  /**
   * Shape and fallbacks for the fields this tab owns. Only these keys are sent,
   * so two tabs can share a group without overwriting each other's fields.
   */
  defaults: T,
): SettingsGroupState<T> {
  const [form, setForm] = useState<T | null>(null);
  const [saved, setSaved] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    settingsApi
      .get<Record<string, unknown>>(group)
      .then((response) => {
        if (!active) return;
        const data = response.data ?? {};
        // Take only the keys this tab declares. An unexpected key from the
        // server would otherwise be posted straight back and rejected.
        const next = { ...defaults };
        for (const key of Object.keys(defaults) as Array<keyof T>) {
          if (data[key as string] !== undefined && data[key as string] !== null) {
            next[key] = data[key as string] as T[keyof T];
          }
        }
        setForm(next);
        setSaved(next);
        setUpdatedAt((response.meta?.updated_at as string | undefined) ?? null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(settingsError(err, "Unable to load these settings."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // `defaults` is a literal re-created each render; the group plus the manual
    // nonce are what actually decide when a refetch is due.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, nonce]);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const patch = useCallback((values: Partial<T>) => {
    setForm((prev) => (prev ? { ...prev, ...values } : prev));
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const save = useCallback(
    async (successMessage = "Settings saved.") => {
      if (!form) return false;
      setSaving(true);
      try {
        const response = await settingsApi.update<Record<string, unknown>>(group, form);
        // Trust the server's echo, not the local form: redacted secrets and
        // coerced types come back changed.
        const data = response.data ?? {};
        const next = { ...form };
        for (const key of Object.keys(form) as Array<keyof T>) {
          if (data[key as string] !== undefined && data[key as string] !== null) {
            next[key] = data[key as string] as T[keyof T];
          }
        }
        setForm(next);
        setSaved(next);
        setUpdatedAt((response.meta?.updated_at as string | undefined) ?? null);
        toast.success(successMessage);
        return true;
      } catch (err) {
        toast.error(settingsError(err, "The save was rejected. Nothing was changed."));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [form, group],
  );

  const dirty = form !== null && saved !== null && JSON.stringify(form) !== JSON.stringify(saved);

  return { form, loading, saving, error, dirty, updatedAt, set, patch, reload, save };
}
