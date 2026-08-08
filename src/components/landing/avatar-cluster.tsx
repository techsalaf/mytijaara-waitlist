import { useEffect, useState } from "react";

/**
 * Displays placeholder avatar circles with staggered animation.
 * Originally fetched real waitlist users, but that endpoint is protected.
 * Keeping this as a purely visual component with colored placeholders.
 */
export function AvatarCluster() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Colored circles (used during SSR and always shown now)
  const colors = [
    "bg-primary",
    "bg-gold",
    "bg-[color-mix(in_oklab,var(--primary)_70%,var(--gold))]",
    "bg-[color-mix(in_oklab,var(--gold)_60%,var(--primary))]",
    "bg-primary/80",
    "bg-gold/80",
  ];

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex -space-x-3">
      {colors.slice(0, 6).map((c, i) => (
        <div
          key={i}
          className={`h-10 w-10 rounded-full ring-2 ring-background shadow-md ${c} transition-transform duration-300 hover:scale-110 hover:z-10`}
          style={{
            animation: `fadeInUp 0.4s ease-out ${i * 0.1}s both`,
          }}
          aria-hidden
        />
      ))}
    </div>
  );
}
