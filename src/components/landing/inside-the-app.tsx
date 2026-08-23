import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { Reveal } from "./reveal";
import { useCmsData } from "@/lib/cms-context";

type InsideTheAppCmsData = {
  badge?: string;
  heading?: string;
  subheading?: string;
};

const DEFAULT_INSIDE: InsideTheAppCmsData = {
  badge: "Inside the app",
  heading: "Nine screens. One tidy life.",
  subheading:
    "A peek at the real MyTijaara — from food to fuel money, groceries to getaways. Swipe, drag, or tap any screen to see it up close.",
};

type Screen = { src: string; caption: string; tag: string };

/**
 * The nine real product screens, in the order they read as a story: arrive,
 * pick where you are, then one screen per service, ending on the wallet.
 *
 * These were `/placeholder-phone.svg` nine times over, which is why the section
 * showed the same grey phone outline nine times. The files live in
 * `public/screens/` and are served from the site root, so the paths below are
 * absolute. `src/components/landing/landing-assets.test.ts` reads this array and
 * asserts every file exists on disk, so a renamed asset fails the build instead
 * of shipping a 404.
 */
export const INSIDE_SCREENS: Screen[] = [
  { src: "/screens/screen-customer-1.webp", caption: "Everything on one home screen", tag: "Home" },
  { src: "/screens/screen-customer-2.webp", caption: "Deliver to anywhere in Nigeria", tag: "Locations" },
  { src: "/screens/screen-customer-5-food.webp", caption: "Craving jollof? Order in taps", tag: "Food" },
  { src: "/screens/screen-customer-4-groceries.webp", caption: "Fresh groceries, same day", tag: "Groceries" },
  { src: "/screens/screen-customer-7-pharmacy.webp", caption: "Genuine meds, delivered fast", tag: "Pharmacy" },
  { src: "/screens/screen-customer-6-parcel.webp", caption: "Send parcels across Nigeria", tag: "Parcels" },
  { src: "/screens/screen-customer-8-artisans.webp", caption: "Book a trusted artisan today", tag: "Artisans" },
  { src: "/screens/screen-customer-9-rentals.webp", caption: "Rent a car for the weekend", tag: "Car Rental" },
  { src: "/screens/screen-customer-3.webp", caption: "One wallet for every payment", tag: "Wallet" },
];

function ScreenCard({ src, caption, tag, onOpen }: Screen & { onOpen: () => void }) {
  return (
    <div className="group relative w-[220px] shrink-0 sm:w-[248px]">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full cursor-pointer overflow-hidden rounded-[2rem] transition-transform duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover:-translate-y-1"
        aria-label={`Open preview: ${caption}`}
      >
        <img
          src={src}
          alt={caption}
          loading="lazy"
          draggable={false}
          className="block h-[460px] w-full select-none object-contain sm:h-[520px]"
        />
      </button>
      <div className="mt-4 px-1">
        <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          {tag}
        </span>
        <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{caption}</p>
      </div>
    </div>
  );
}

function ScreenModal({ screen, onClose }: { screen: Screen | null; onClose: () => void }) {
  useEffect(() => {
    if (!screen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [screen, onClose]);

  if (!screen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={screen.caption}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/85 p-4 backdrop-blur-md animate-fade-up"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-4 top-4 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-card text-foreground shadow-soft transition hover:scale-105 sm:right-6 sm:top-6"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="relative flex max-h-full max-w-full flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={screen.src}
          alt={screen.caption}
          className="max-h-[82vh] w-auto max-w-full rounded-[2rem] object-contain shadow-elegant"
        />
        <div className="text-center">
          <span className="inline-flex items-center rounded-full bg-gold/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-foreground">
            {screen.tag}
          </span>
          <p className="mt-2 text-sm font-semibold text-primary-foreground">{screen.caption}</p>
        </div>
      </div>
    </div>
  );
}

export function InsideTheApp() {
  const cms = useCmsData("inside_the_app", DEFAULT_INSIDE);
  if (!cms) return null;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const halfWidthRef = useRef(0);
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const [active, setActive] = useState<Screen | null>(null);

  const loop = [...INSIDE_SCREENS, ...INSIDE_SCREENS];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      halfWidthRef.current = track.scrollWidth / 2;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);

    let raf = 0;
    let last = performance.now();
    const speed = 40; // px per second

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!pausedRef.current && !draggingRef.current && halfWidthRef.current > 0) {
        offsetRef.current -= speed * dt;
        if (offsetRef.current <= -halfWidthRef.current) {
          offsetRef.current += halfWidthRef.current;
        }
        track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    movedRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    if (Math.abs(dx) > 4) movedRef.current = true;
    let next = dragStartOffsetRef.current + dx;
    const half = halfWidthRef.current;
    if (half > 0) {
      next = ((next % half) - half) % half;
      if (next > 0) next -= half;
    }
    offsetRef.current = next;
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${next}px, 0, 0)`;
    }
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  return (
    <section id="download" className="relative overflow-hidden bg-background py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
              {cms.badge ?? DEFAULT_INSIDE.badge}
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {cms.heading ?? DEFAULT_INSIDE.heading}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {cms.subheading ?? DEFAULT_INSIDE.subheading}
            </p>
          </Reveal>
        </div>

        <div className="relative mt-16">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-32" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-32" />

          <div
            className="overflow-hidden touch-pan-y"
            onMouseEnter={() => (pausedRef.current = true)}
            onMouseLeave={() => (pausedRef.current = false)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{ cursor: "grab" }}
          >
            <div
              ref={trackRef}
              className="flex w-max gap-6 will-change-transform"
              style={{ transform: "translate3d(0,0,0)" }}
            >
              {loop.map((s, i) => (
                <ScreenCard
                  key={`s-${i}`}
                  {...s}
                  onOpen={() => {
                    if (movedRef.current) return;
                    setActive(s);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <ScreenModal screen={active} onClose={() => setActive(null)} />
    </section>
  );
}
