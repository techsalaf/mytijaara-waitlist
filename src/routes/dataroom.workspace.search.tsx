/**
 * Search.
 *
 * The query goes to the server, which searches only what this grant can reach.
 * Filtering a full result set in the browser would leak the titles of documents
 * the visitor cannot open, so no client-side filtering happens here at all.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { dataRoomApi, type DataRoomDocumentCard } from "@/lib/api/dataroom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDataRoomSession } from "@/components/dataroom/session";
import { DataRoomBreadcrumbs } from "@/components/dataroom/shell";
import { DocumentCard } from "@/components/dataroom/cards";

export const Route = createFileRoute("/dataroom/workspace/search")({
  component: SearchPage,
});

const MIN_QUERY = 2;

function SearchPage() {
  const { handleError } = useDataRoomSession();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DataRoomDocumentCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped on every keystroke so a slow earlier response cannot overwrite a
  // newer one.
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const rows = await dataRoomApi.search(trimmed);
          if (id !== requestId.current) return;
          setResults(rows);
        } catch (caught) {
          if (id !== requestId.current) return;
          if (handleError(caught)) return;
          setError("Search is unavailable right now. Please try again.");
        } finally {
          if (id === requestId.current) setLoading(false);
        }
      })();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, handleError]);

  return (
    <div>
      <DataRoomBreadcrumbs
        trail={[{ label: "Data room", to: "/dataroom/workspace" }, { label: "Search" }]}
      />

      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Searches the documents your access covers. Titles and descriptions only.
      </p>

      <div className="mt-6 max-w-xl space-y-1.5">
        <Label htmlFor="dataroom-search">Search documents</Label>
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="dataroom-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Financial model, cap table, deck…"
            className="pl-9"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="mt-6" aria-live="polite">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Searching…
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : results === null ? (
          <p className="text-sm text-muted-foreground">
            Type at least {MIN_QUERY} characters to search.
          </p>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
            <p className="font-medium">No matching documents</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing your access covers matches that. Ask the MyTijaara team if you are looking for
              something specific.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} document{results.length === 1 ? "" : "s"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((doc) => (
                <DocumentCard key={doc.uuid} document={doc} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
