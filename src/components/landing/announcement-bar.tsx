import { ArrowRight } from "lucide-react";

/**
 * Optional top-of-page bar. Rendered only when the CMS `announcement` section
 * has `enabled: true`. Admin controls the text and the destination href.
 */
export function AnnouncementBar({ text, href }: { text: string; href: string }) {
  if (!text) return null;
  return (
    <div className="bg-primary text-primary-foreground text-center py-2.5 px-4 text-sm font-medium">
      <a href={href} className="inline-flex items-center gap-2 hover:underline focus:underline">
        {text}
        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </a>
    </div>
  );
}
