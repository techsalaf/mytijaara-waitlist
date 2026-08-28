/**
 * One loader for every data room admin tab.
 *
 * The admin pages elsewhere in this app each hand-roll the same
 * loading/error/refresh triple with `useState` and `useEffect`. Six more copies
 * would be six more places for the error branch to be wrong, so the pattern is
 * written once here.
 *
 * A 403 is passed through untouched. It means the signed-in administrator lacks
 * the `data-room.*` permission for that endpoint, which is a real answer the
 * operator needs to read, not a failure to paper over.
 */

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

export type Resource<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** True when the load failed because this administrator lacks the permission. */
  forbidden: boolean;
  reload: () => Promise<void>;
  /** Replace the held value without a round trip, after a successful write. */
  set: (value: T) => void;
};

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.firstError;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function useResource<T>(load: () => Promise<T>, fallback: string): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const run = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const value = await load();
        setData(value);
        setForbidden(false);
      } catch (err) {
        setForbidden(err instanceof ApiError && err.status === 403);
        setError(errorMessage(err, fallback));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // `load` is expected to be a `useCallback` in the caller. An inline arrow
    // would refetch on every render.
    [load, fallback],
  );

  useEffect(() => {
    void run(false);
  }, [run]);

  const reload = useCallback(() => run(true), [run]);

  return { data, loading, refreshing, error, forbidden, reload, set: setData };
}
