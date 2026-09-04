/**
 * Icon registry for CMS-authored content cards.
 *
 * The CMS stores an icon as a *name* (`"Wrench"`), because a database row
 * cannot hold a React component. The page needs a component. This module is the
 * only bridge between the two, and it is a fixed map on purpose:
 *
 *   - `lucide-react` is tree-shaken. Resolving `icons[name]` dynamically would
 *     pull the entire 1,500-icon set into the client bundle.
 *   - An admin typing a name that does not exist must get a sane card, not a
 *     crashed page. `resolveContentIcon` always returns something renderable.
 *   - The admin editor needs a list to offer in a dropdown, so the names have to
 *     be enumerable at build time. `CONTENT_ICON_NAMES` is that list.
 *
 * Each entry carries the tint the design system uses for that concept, so an
 * administrator picks "Pharmacy" and gets the blue card without knowing a single
 * Tailwind class.
 */
import {
  Bike,
  Car,
  Globe,
  Package,
  Pill,
  Send,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  UtensilsCrossed,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type ContentIcon = {
  Icon: LucideIcon;
  /** Border + background + foreground tint for the icon tile. */
  tint: string;
};

export const CONTENT_ICONS: Record<string, ContentIcon> = {
  UtensilsCrossed: { Icon: UtensilsCrossed, tint: "bg-orange-500/10 text-orange-600 border-orange-200" },
  ShoppingBag: { Icon: ShoppingBag, tint: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  Pill: { Icon: Pill, tint: "bg-blue-500/10 text-blue-600 border-blue-200" },
  Wrench: { Icon: Wrench, tint: "bg-amber-500/10 text-amber-600 border-amber-200" },
  Package: { Icon: Package, tint: "bg-purple-500/10 text-purple-600 border-purple-200" },
  ShieldCheck: { Icon: ShieldCheck, tint: "bg-green-500/10 text-green-700 border-green-200" },
  Zap: { Icon: Zap, tint: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
  Sparkles: { Icon: Sparkles, tint: "bg-gold/15 text-gold-foreground border-gold/30" },
  Car: { Icon: Car, tint: "bg-sky-500/10 text-sky-600 border-sky-200" },
  Bike: { Icon: Bike, tint: "bg-rose-500/10 text-rose-600 border-rose-200" },
  Truck: { Icon: Truck, tint: "bg-indigo-500/10 text-indigo-600 border-indigo-200" },
  Store: { Icon: Store, tint: "bg-teal-500/10 text-teal-600 border-teal-200" },
  Smartphone: { Icon: Smartphone, tint: "bg-primary/10 text-primary border-primary/20" },
  Globe: { Icon: Globe, tint: "bg-cyan-500/10 text-cyan-600 border-cyan-200" },
  Wallet: { Icon: Wallet, tint: "bg-lime-500/10 text-lime-700 border-lime-200" },
  Send: { Icon: Send, tint: "bg-violet-500/10 text-violet-600 border-violet-200" },
};

/** Names the admin editor offers, in registry order. */
export const CONTENT_ICON_NAMES = Object.keys(CONTENT_ICONS);

export const FALLBACK_CONTENT_ICON: ContentIcon = CONTENT_ICONS.Sparkles;

/**
 * Never throws and never returns undefined: an unknown or empty name falls back
 * to a neutral card so a typo in the admin panel cannot blank a public page.
 */
export function resolveContentIcon(name?: string | null): ContentIcon {
  if (!name) return FALLBACK_CONTENT_ICON;
  return CONTENT_ICONS[name] ?? FALLBACK_CONTENT_ICON;
}
