/**
 * A single countdown unit (days / hours / minutes / seconds).
 *
 * Zero layout shift by design: the card has fixed padding, the digits use
 * tabular figures and a reserved min-width, so 09 -> 10 never reflows.
 */
export function CountdownCard({
  value,
  label,
  delay = 0,
}: {
  value: number;
  label: string;
  delay?: number;
}) {
  const text = String(value).padStart(2, "0");

  return (
    <div
      className="group relative flex flex-col items-center rounded-3xl border border-primary-foreground/15 bg-primary-foreground/[0.08] px-3 py-5 text-center shadow-soft backdrop-blur-md transition-transform duration-300 hover:-translate-y-1 sm:px-6 sm:py-7"
      style={{ animation: `fade-up 0.7s ease-out ${delay}ms both` }}
    >
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <span
        className="block overflow-hidden font-display text-4xl font-bold leading-none tracking-tight text-primary-foreground tabular-nums sm:text-6xl"
        style={{ minWidth: "2ch" }}
      >
        <span key={text} className="inline-block animate-digit-in">
          {text}
        </span>
      </span>
      <span className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/60 sm:text-xs">
        {label}
      </span>
    </div>
  );
}
