import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Floating "back to top" button — appears once the user scrolls 300 px down.
 * Uses pure CSS transitions (no external animation library).
 * Positioned bottom-right above the AI assistant button.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className={[
        "fixed bottom-24 right-6 z-40",
        "grid h-10 w-10 place-items-center rounded-full",
        "border border-border bg-card/80 text-foreground shadow-soft backdrop-blur-sm",
        "transition-all duration-200 ease-out",
        "hover:border-primary/50 hover:bg-primary hover:text-primary-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "hover:scale-105 active:scale-95",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-3 pointer-events-none",
      ].join(" ")}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
