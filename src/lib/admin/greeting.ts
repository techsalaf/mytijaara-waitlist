/**
 * Time-of-day greeting for the dashboard header.
 *
 * The header used to read `title="Good morning, Adaeze 👋"` — a hardcoded name
 * and a hardcoded time of day, so it greeted the wrong person at the wrong hour.
 * Both halves are pure functions of (clock, session), so they live here with
 * tests rather than inline in JSX.
 */

/** "Good morning" / "Good afternoon" / "Good evening" for the given instant. */
export function greeting(at: Date = new Date()): string {
  const hour = at.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * First name only, for the greeting line.
 *
 * A null/blank session must not render "Good morning, undefined", so this
 * returns null and the caller drops the comma along with the name.
 */
export function firstName(fullName: string | null | undefined): string | null {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first ? first : null;
}
