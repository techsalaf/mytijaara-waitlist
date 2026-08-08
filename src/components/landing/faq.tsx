import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Reveal } from "./reveal";
import { useFaqs, useCmsData } from "@/lib/cms-context";
import { trackEvent } from "@/lib/analytics/track";

const HARDCODED_FAQS = [
  { q: "What is MyTijaara?", a: "MyTijaara is one app that lets you order food, buy groceries and medicine, book artisans, send parcels, rent cars and shop from local businesses — all in Nigeria." },
  { q: "Where is MyTijaara available?", a: "We're launching first in Lagos, Abuja and Port Harcourt, then rolling out across Nigeria. Join the waitlist and we'll let you know as soon as we're in your city." },
  { q: "How much does it cost to use?", a: "The app is free to download. You only pay for what you order, at prices set by our vendors and partners. Delivery fees are shown clearly before you check out." },
  { q: "How do I pay?", a: "You can pay with cards, bank transfers or on delivery — whatever works best for you." },
  { q: "How can I become a vendor, rider or artisan?", a: "Pick your role on the waitlist form above. We'll reach out with next steps as we onboard partners in your area." },
  { q: "Is my information safe?", a: "Yes. We take your privacy seriously and only use your information to give you a great experience with MyTijaara." },
];

type FaqCmsData = { heading?: string; subheading?: string };
const DEFAULT_FAQ: FaqCmsData = {
  heading: "Answers, straight up.",
  subheading: "Short answers to the questions we hear the most.",
};

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const dbFaqs = useFaqs();
  const cms = useCmsData("faqs", DEFAULT_FAQ);
  const FAQS = dbFaqs.length > 0
    ? dbFaqs.map((f) => ({ q: f.question, a: f.answer }))
    : HARDCODED_FAQS;
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-primary">
              FAQ
            </span>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {cms.heading}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {cms.subheading}
            </p>
          </Reveal>
        </div>
        <div className="mt-14 divide-y divide-border rounded-3xl border border-border bg-card">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => {
                    const next = isOpen ? null : i;
                    setOpen(next);
                    if (next !== null) trackEvent("faq_open", { question: f.q });
                  }}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-primary-soft/40 sm:px-8"
                >
                  <span className="font-display text-base font-semibold sm:text-lg">{f.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-primary transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid overflow-hidden transition-all duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground sm:px-8 sm:text-base">
                      {f.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
