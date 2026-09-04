import { ArrowRight } from "lucide-react";

/** The three styles the CMS editor offers. Anything else falls back to primary. */
export type AnnouncementStyle = "primary" | "gold" | "dark";

const STYLES: Record<AnnouncementStyle, string> = {
  primary: "bg-primary text-primary-foreground",
  gold: "bg-gold-gradient text-gold-foreground",
  dark: "bg-primary-dark text-primary-foreground",
};

/**
 * Optional top-of-page bar. Rendered only when the CMS `announcement` section
 * is enabled and carries text.
 *
 * `label` and `style` are honoured here because the editor writes both and
 * previews both. It used to render neither: an administrator could pick
 * "Premium gold", see gold in the admin preview, save, and watch the live bar
 * stay green — and the "Learn more" link label never appeared at all. The
 * editor's preview block is the contract this component has to match.
 */
export function AnnouncementBar({
  text,
  href,
  label,
  style = "primary",
}: {
  text: string;
  href: string;
  label?: string;
  style?: AnnouncementStyle;
}) {
  if (!text) return null;

  const palette = STYLES[style] ?? STYLES.primary;

  return (
    <div className={`${palette} px-4 py-2.5 text-center text-sm font-medium`}>
      <a href={href} className="inline-flex items-center gap-2 hover:underline focus:underline">
        {text}
        {label ? <span className="font-semibold underline">{label}</span> : null}
        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </a>
    </div>
  );
}
