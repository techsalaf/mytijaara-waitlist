import { useEffect, useState } from "react";
import { waitlistApi } from "@/lib/api";
import type { WaitlistUser } from "@/lib/types";

/**
 * Fetches recent waitlist users and displays their avatars with initials.
 * Shows up to 6 user initials in a clustered overlay fashion with staggered
 * animation and enhanced visual hierarchy.
 */
export function AvatarCluster() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    let cancel = false;
    waitlistApi
      .list({ per_page: 6 })
      .then((r) => {
        if (cancel) return;
        setUsers(r.data.slice(0, 6));
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
    "bg-primary/80",
    "bg-gold/80",
  ];

  if (!isClient || users.length === 0) {
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
      {users.map((user, i) => {
        const initials = user.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        return (
          <div
            key={user.id}
            className="group relative h-10 w-10 rounded-full ring-2 ring-background bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-xs font-bold text-primary shadow-md transition-all duration-300 hover:scale-125 hover:z-10 hover:shadow-lg hover:from-primary/30 hover:to-primary/20 cursor-pointer"
            style={{
              animation: `fadeInUp 0.4s ease-out ${i * 0.1}s both`,
            }}
            title={user.name}
          >
            {initials}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap bg-foreground/90 text-background text-[10px] px-2 py-1 rounded shadow-lg">
              {user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
