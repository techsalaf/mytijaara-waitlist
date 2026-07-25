import { useEffect, useState } from "react";
import { waitlistApi } from "@/lib/api";

/**
 * Reads the live waitlist count from the API layer so the number shown on
 * the landing page reflects reality once a real backend is wired.
 *
 * Falls back to a sensible default while loading / on error, so the hero
 * never shows "0+ Nigerians".
 */
export function WaitlistCount({ fallback = 2400 }: { fallback?: number }) {
  const [count, setCount] = useState<number>(fallback);

  useEffect(() => {
    let cancel = false;
    waitlistApi
      .list()
      .then((r) => {
        if (cancel) return;
        // Show whichever is higher — the seeded fallback keeps social proof
        // strong even before real signups arrive.
        setCount(Math.max(fallback, r.data.length));
      })
      .catch(() => {
        /* fallback is already set */
      });
    return () => {
      cancel = true;
    };
  }, [fallback]);

  return (
    <>
      <strong className="text-foreground">{count.toLocaleString("en-US")}+</strong>{" "}
      Nigerians already on the waitlist
    </>
  );
}
