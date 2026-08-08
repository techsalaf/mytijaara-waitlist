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
        "grid h-12 w-12 place-items-center rounded-full",
        "border-2 border-primary/20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-elegant backdrop-blur-md",
        "hover:border-primary/40 hover:shadow-glow hover:from-primary hover:to-primary/90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "transition-all duration-300 hover:scale-110 active:scale-95",
        visible ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 250ms cubic-bezier(0.4, 0, 0.2, 1), transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <ArrowUp className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" strokeWidth={2.5} />
    </button>
  );
}
