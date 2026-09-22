import { useEffect, useRef, useState } from "react";
import { Apple, Play, QrCode, Sparkles, PartyPopper, ArrowRight, RotateCcw } from "lucide-react";
import QRCode from "qrcode";

import { useLaunch } from "./launch-state-provider";
import { celebrateCeremony, prefersReducedMotion } from "@/lib/launch/celebrate";
import { trackEvent } from "@/lib/analytics/track";

export function LaunchCeremony({
  onComplete,
  isRehearsal = false,
}: {
  onComplete?: () => void;
  isRehearsal?: boolean;
}) {
  const { config, setCeremonyPreview } = useLaunch();
  const [phase, setPhase] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [qrUrl, setQrUrl] = useState<string>("");
  const celebrationRef = useRef<{ stop: () => void } | null>(null);
  const reducedMotion = prefersReducedMotion();

  // Generate QR code for mobile download on projector
  useEffect(() => {
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/download`
      : "https://mytijaara.com/download";
    QRCode.toDataURL(url, {
      width: 280,
      margin: 1.5,
      color: { dark: "#004A28", light: "#FFFFFF" },
    })
      .then(setQrUrl)
      .catch(() => {});
  }, []);

  // Orchestrate ceremony progression
  useEffect(() => {
    trackEvent("ceremony_started", { rehearsal: isRehearsal });

    // Fire ceremony particle engine
    if (config.ceremony?.enabled !== false && !reducedMotion) {
      celebrationRef.current = celebrateCeremony({
        durationSeconds: config.ceremony?.ceremonyDurationSeconds ?? 30,
        ambientParticles: config.ceremony?.ambientParticles !== false,
      });
    }

    const t2 = window.setTimeout(() => setPhase(2), 1600);
    const t3 = window.setTimeout(() => setPhase(3), 4500);
    const t4 = window.setTimeout(() => setPhase(4), 9000);

    const totalSeconds = config.ceremony?.ceremonyDurationSeconds ?? 30;
    const t5 = window.setTimeout(() => {
      setPhase(5);
      onComplete?.();
    }, totalSeconds * 1000);

    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
      window.clearTimeout(t5);
      celebrationRef.current?.stop();
    };
  }, [config.ceremony, isRehearsal, onComplete, reducedMotion]);

  const headline = config.ceremony?.liveHeadline || "MYTIJAARA IS LIVE";
  const subheadline =
    config.ceremony?.liveSubheadline ||
    "Nigeria's everyday operating system is officially open. Order food, groceries, book vetted artisans, and dispatch parcels right now.";

  return (
    <section
      id="launch-ceremony"
      aria-label="Launch Event Ceremony"
      className="relative overflow-hidden bg-primary-gradient py-16 sm:py-24 text-primary-foreground min-h-[580px] flex items-center justify-center"
    >
      {/* Dynamic ambient gold & green light bloom */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${
          phase >= 2 ? "opacity-100" : "opacity-40"
        }`}
        aria-hidden="true"
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[500px] sm:h-[700px] sm:w-[700px] rounded-full bg-gold/25 blur-[120px] animate-pulse-slow" />
        <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-primary-foreground/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center z-10 w-full">
        {/* Phase 1 & 2: Brand Reveal */}
        <div
          className={`transition-all duration-1000 ${
            phase >= 2
              ? "scale-100 opacity-100 blur-0"
              : "scale-90 opacity-0 blur-sm motion-reduce:opacity-100 motion-reduce:scale-100"
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/20 px-5 py-2 text-xs sm:text-sm font-bold uppercase tracking-widest text-gold shadow-lg backdrop-blur-md">
            <Sparkles className="h-4 w-4 animate-spin-slow motion-reduce:animate-none" />
            <span>Official Launch Moment</span>
          </div>

          <h1 className="mt-6 font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white drop-shadow-md">
            <span className="bg-gradient-to-r from-gold via-white to-gold bg-clip-text text-transparent">
              {headline}
            </span>
          </h1>

          <div className="mx-auto mt-3 h-1 w-24 sm:w-36 rounded-full bg-gold-gradient shadow-glow" />

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-xl lg:text-2xl text-primary-foreground/90 font-medium leading-relaxed">
            {subheadline}
          </p>
        </div>

        {/* Phase 4 & 5: Conversion Callout */}
        <div
          className={`mt-10 transition-all duration-1000 ${
            phase >= 4
              ? "translate-y-0 opacity-100"
              : "translate-y-6 opacity-0 pointer-events-none motion-reduce:opacity-100 motion-reduce:translate-y-0"
          }`}
        >
          <div className="mx-auto max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-gold">
              Scan • Download • Order
            </div>
            <h2 className="mt-1 font-display text-xl sm:text-3xl font-extrabold text-white">
              Get MyTijaara in your hands now
            </h2>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
              {/* QR Code */}
              {qrUrl && (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-2xl bg-white p-2.5 shadow-xl">
                    <img
                      src={qrUrl}
                      alt="Scan to open download page"
                      className="h-28 w-28 sm:h-32 sm:w-32 object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-primary-foreground/75">
                    Scan with camera
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 w-full sm:w-auto text-left">
                {config.live.stores.map((store) => {
                  const Icon = store.platform === "ios" ? Apple : Play;
                  return (
                    <a
                      key={store.platform}
                      href={store.comingSoon ? "/download" : store.href}
                      target={store.comingSoon ? undefined : "_blank"}
                      rel="noreferrer"
                      onClick={() =>
                        trackEvent("ceremony_store_click", { platform: store.platform })
                      }
                      className="inline-flex items-center gap-3.5 rounded-2xl border border-white/25 bg-white/15 px-5 py-3 transition-all hover:bg-white/25 hover:scale-105 active:scale-95 shadow-md"
                    >
                      <Icon className="h-6 w-6 text-white" />
                      <div className="leading-tight">
                        <div className="text-[10px] uppercase font-semibold text-white/70">
                          {store.sublabel}
                        </div>
                        <div className="text-sm font-bold text-white">{store.label}</div>
                      </div>
                      {store.comingSoon && (
                        <span className="ml-auto rounded-full bg-gold/25 px-2 py-0.5 text-[9px] font-bold text-gold uppercase">
                          Soon
                        </span>
                      )}
                    </a>
                  );
                })}

                <a
                  href="/download"
                  onClick={() => trackEvent("ceremony_download_page_click")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-gold/90 hover:scale-105 active:scale-95 shadow-lg"
                >
                  <span>Open Download Page</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Rehearsal controls helper if in preview mode */}
        {isRehearsal && (
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-gold/40 bg-black/40 px-4 py-2 text-xs font-semibold backdrop-blur">
            <span className="text-gold">Rehearsal Preview Active</span>
            <button
              type="button"
              onClick={() => setCeremonyPreview("none")}
              className="inline-flex items-center gap-1 text-white hover:text-gold transition-colors underline"
            >
              <RotateCcw className="h-3 w-3" /> Exit Preview
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
