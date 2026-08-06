import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Floating "back to top" button — appears once the user scrolls 300 px down.
 * Inline styles drive opacity + transform so the transition is reliable across
 * all browsers regardless of how Tailwind wires up CSS custom properties.
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
        "fixed bottom-24 right-6 z-40 cursor-pointer",
        "grid h-10 w-10 place-items-center rounded-full",
        "border border-border bg-card/80 text-foreground shadow-soft backdrop-blur-sm",
        "hover:border-primary/50 hover:bg-primary hover:text-primary-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "hover:scale-105 active:scale-95",
        visible ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 200ms ease-out, transform 200ms ease-out",
      }}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
