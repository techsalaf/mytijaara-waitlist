import { useEffect, useState } from "react";
import { waitlistApi } from "@/lib/api";
import type { WaitlistUser } from "@/lib/types";

/**
 * Fetches recent waitlist users and displays their avatars with initials.
 * Shows up to 4 user initials in a clustered overlay fashion.
 *
 */
export function AvatarCluster() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    let cancel = false;
    waitlistApi
      .list({ per_page: 4 })
      .then((r) => {
        if (cancel) return;
        setUsers(r.data.slice(0, 4));
      })
      .catch(() => {
        /* silently fail, show empty state */
      });
    return () => {
      cancel = true;
    };
  }, []);

  // Fallback colored circles (used during SSR and while loading)
  const colors = [
    "bg-primary",
    "bg-gold",
    "bg-[color-mix(in_oklab,var(--primary)_70%,var(--gold))]",
    "bg-[color-mix(in_oklab,var(--gold)_60%,var(--primary))]",
  ];

  if (!isClient || users.length === 0) {
    return (
      <div className="flex -space-x-2">
        {colors.slice(0, 4).map((c, i) => (
          <div
            key={i}
            className={`h-8 w-8 rounded-full ring-2 ring-background ${c}`}
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex -space-x-2">
      {users.map((user) => {
        const initials = user.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        return (
          <div
            key={user.id}
            className="h-8 w-8 rounded-full ring-2 ring-background bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary"
            title={user.name}
          >
            {initials}
          </div>
        );
      })}
    </div>
  );
}
