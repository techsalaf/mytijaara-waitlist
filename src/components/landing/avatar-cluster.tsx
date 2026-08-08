import { useEffect, useState } from "react";

type AvatarData = {
  name: string;
  initials: string;
};

/**
 * Displays real waitlist user avatars with initials and names on hover.
 * Shows 1-6 avatars depending on total count, with colored placeholders as fallback.
 */
export function AvatarCluster() {
  const [isClient, setIsClient] = useState(false);
  const [avatars, setAvatars] = useState<AvatarData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    fetch("/api/v1/waitlist/avatars")
      .then((res) => res.json())
      .then((data) => {
        setAvatars(data.data.avatars);
        setTotal(data.data.total);
      })
      .catch(() => {
        // Fallback to placeholder colored circles on error
      })
      .finally(() => setLoading(false));
  }, []);

  // Colored circles fallback
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

  // Show 1-6 avatars based on total count
  const displayCount = Math.min(total, 6);
  const toShow = avatars.slice(0, displayCount);

  // If no avatars yet or loading failed, show colored placeholders
  if (toShow.length === 0 || loading) {
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

  return (
    <div className="flex -space-x-3">
      {toShow.map((avatar, i) => (
        <div
          key={i}
          className="group relative h-10 w-10 rounded-full bg-primary text-primary-foreground ring-2 ring-background shadow-md transition-transform duration-300 hover:scale-110 hover:z-10 grid place-items-center text-xs font-semibold"
          style={{
            animation: `fadeInUp 0.4s ease-out ${i * 0.1}s both`,
          }}
          title={avatar.name}
        >
          {avatar.initials}
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
            {avatar.name}
          </span>
        </div>
      ))}
    </div>
  );
}
