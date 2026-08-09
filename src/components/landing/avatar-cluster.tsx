import { useEffect, useState } from "react";
import { waitlistApi } from "@/lib/api/waitlist";
import { Plus } from "lucide-react";

type AvatarData = {
  name: string;
  initials: string;
};

// Visually distinct, accessible background color palettes for avatars
const PALETTES = [
  { bg: "#1F5C3A", text: "#FFFFFF" }, // Deep Emerald (Primary)
  { bg: "#D4A017", text: "#1A1A1A" }, // Muted Gold (Accent)
  { bg: "#2E5A88", text: "#FFFFFF" }, // Deep Sapphire Blue
  { bg: "#8C4A27", text: "#FFFFFF" }, // Warm Terracotta / Clay
  { bg: "#5C2C6F", text: "#FFFFFF" }, // Royal Plum / Violet
  { bg: "#2A7B62", text: "#FFFFFF" }, // Jade Teal
];

function getAvatarColors(index: number, name: string) {
  let hash = index;
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % PALETTES.length;
  }
  return PALETTES[hash % PALETTES.length];
}

/**
 * Displays real waitlist user avatars with initials and names on hover.
 * Shows up to 6 avatars. If fewer than 6, shows actual waitlisters first,
 * followed by styled open spot slots representing available waitlist spots.
 */
export function AvatarCluster() {
  const [isClient, setIsClient] = useState(false);
  const [avatars, setAvatars] = useState<AvatarData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    waitlistApi
      .avatars()
      .then((data) => {
        setAvatars(data.data.avatars || []);
      })
      .catch(() => {
        setAvatars([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!isClient) {
    return null;
  }

  const actualCount = Math.min(avatars.length, 6);
  const toShow = avatars.slice(0, actualCount);
  const openSpots = Math.max(0, 6 - actualCount);

  if (loading) {
    return (
      <div className="flex -space-x-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-10 animate-pulse rounded-full bg-muted/80 ring-2 ring-background shadow-md"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center -space-x-3">
      {/* Actual waitlist members */}
      {toShow.map((avatar, i) => {
        const { bg, text } = getAvatarColors(i, avatar.name);
        return (
          <div
            key={i}
            className="group relative h-10 w-10 rounded-full ring-2 ring-background shadow-md transition-all duration-300 hover:scale-110 hover:z-10 grid place-items-center text-xs font-bold"
            style={{
              backgroundColor: bg,
              color: text,
              animation: `fadeInUp 0.4s ease-out ${i * 0.08}s both`,
            }}
            title={avatar.name}
          >
            {avatar.initials}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-normal text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 pointer-events-none z-20">
              {avatar.name}
            </span>
          </div>
        );
      })}

      {/* Available spot slots when under 6 waitlisters */}
      {openSpots > 0 &&
        Array.from({ length: openSpots }).map((_, idx) => {
          const spotNum = actualCount + idx + 1;
          return (
            <div
              key={`spot-${idx}`}
              className="group relative h-10 w-10 rounded-full border-2 border-dashed border-primary/40 bg-primary/5 text-primary ring-2 ring-background shadow-sm transition-all duration-300 hover:scale-105 hover:border-primary hover:bg-primary/10 grid place-items-center text-xs font-semibold"
              style={{
                animation: `fadeInUp 0.4s ease-out ${(actualCount + idx) * 0.08}s both`,
              }}
              title={`Waitlist spot #${spotNum} is available — join now!`}
            >
              <Plus className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-normal text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 pointer-events-none z-20">
                Spot #{spotNum} open
              </span>
            </div>
          );
        })}
    </div>
  );
}
