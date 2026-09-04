import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  HelpCircle,
  Search,
  Sparkles,
  ShoppingBag,
  Store,
  Bike,
  Wrench,
  ShieldCheck,
  ChevronRight,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { loadPublicPageData } from "@/lib/public-page-data";
import { PublicLayout } from "@/components/landing/public-layout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  loader: () => loadPublicPageData(),
  head: () => ({
    meta: [
      { title: "FAQ & Help Center — MyTijaara | Frequently Asked Questions" },
      {
        name: "description",
        content:
          "Find answers to common questions about MyTijaara: ordering food and groceries, booking verified artisans, escrow payments, vendor onboarding, and rider delivery.",
      },
    ],
  }),
  component: FaqPage,
});

type FaqCategory = "all" | "customers" | "vendors" | "riders" | "artisans" | "payments";

const FAQ_ITEMS: {
  category: FaqCategory;
  q: string;
  a: string;
}[] = [
  // Customers
  {
    category: "customers",
    q: "What services can I order on MyTijaara?",
    a: "MyTijaara brings together hot food delivery from local restaurants, fresh groceries, supermarket items, 24/7 pharmacy supplies, verified artisans (plumbers, electricians, mechanics), same-day package delivery, and car rentals all inside one single app.",
  },
  {
    category: "customers",
    q: "How fast is delivery for food and groceries?",
    a: "Our smart neighborhood dispatch pairs your order with the nearest verified rider. Most food orders arrive in 25–40 minutes, and same-day parcels can be tracked live in real-time.",
  },
  {
    category: "customers",
    q: "Can I order on my computer or browser without installing the app?",
    a: "Yes! You can visit app.mytijaara.com on any mobile phone, tablet, or desktop browser to browse menus, add items to cart, and checkout seamlessly.",
  },
  // Payments & Escrow
  {
    category: "payments",
    q: "How does 100% Escrow Protection work on MyTijaara?",
    a: "When you pay for an item or hire an artisan, your money is held securely in an automated escrow vault. The funds are only released to the merchant or artisan after you confirm successful delivery or satisfactory service completion.",
  },
  {
    category: "payments",
    q: "What payment methods are supported in Nigeria?",
    a: "We support instant Nigerian bank transfers, debit cards (Mastercard, Visa, Verve), virtual bank accounts, and Pay-on-Delivery for selected verified locations.",
  },
  {
    category: "payments",
    q: "Are there any hidden conversion fees?",
    a: "None! All prices on MyTijaara are quoted transparently in Nigerian Naira (₦) with zero foreign conversion charges or surprise platform markups.",
  },
  // Vendors
  {
    category: "vendors",
    q: "How do I register my restaurant, grocery, or pharmacy store?",
    a: "Go to dashboard.mytijaara.com or tap 'Partner with Us' on the Download page. Submit your store name, business CAC/ID documents, and menu/catalog. Our merchant team will verify and activate your store within 24 hours.",
  },
  {
    category: "vendors",
    q: "When and how do vendors get paid?",
    a: "Vendor payouts are processed on a swift, automated schedule directly into your designated Nigerian commercial bank account with clear settlement receipts.",
  },
  {
    category: "vendors",
    q: "Do I need special equipment to receive orders?",
    a: "No! You can manage your store and incoming orders right from any Android phone, iPhone, tablet, or laptop via the MyTijaara Merchant Dashboard.",
  },
  // Riders
  {
    category: "riders",
    q: "What do I need to become a MyTijaara Delivery Rider?",
    a: "You need a registered motorcycle, bicycle, or vehicle, a valid driver's license or rider ID, a smartphone with internet access, and proof of address.",
  },
  {
    category: "riders",
    q: "How are riders paid?",
    a: "Riders earn competitive delivery fee commissions plus 100% of customer tips, with weekly direct bank payouts and instant performance bonuses.",
  },
  // Artisans
  {
    category: "artisans",
    q: "How do artisans get vetted and receive booking requests?",
    a: "Artisans undergo background verification, trade reference checks, and identity validation. Once approved, customers in your immediate local area can book your services with clear hourly or fixed escrow pricing.",
  },
];

function FaqPage() {
  const { launchConfig, serverNow, cms, branding } = Route.useLoaderData();
  const [activeCategory, setActiveCategory] = useState<FaqCategory>("all");
  const [search, setSearch] = useState("");

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      !search.trim() ||
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <PublicLayout launchConfig={launchConfig} serverNow={serverNow} cmsData={cms} branding={branding}>
      <div className="min-h-screen pb-24">
        {/* Header */}
        <section className="relative overflow-hidden bg-primary-gradient py-24 text-primary-foreground sm:py-32">
          <div className="pointer-events-none absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-gold opacity-15 blur-3xl" />
          <div className="pointer-events-none absolute -right-40 top-10 h-[400px] w-[400px] rounded-full bg-primary-foreground/10 blur-3xl" />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              Knowledge & FAQ Hub
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
              Frequently Asked Questions
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/90 sm:text-xl">
              Find clear answers about downloading the app, placing orders, escrow safety, vendor onboarding, and rider delivery.
            </p>

            {/* Live Search Input */}
            <div className="mt-8 mx-auto max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search keywords (e.g. escrow, vendor payout, delivery time, iphone)..."
                  className="h-13 rounded-full bg-white pl-12 pr-4 text-sm text-slate-900 shadow-2xl focus:ring-2 focus:ring-gold"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Category Tabs & FAQ Accordion */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-2 pb-8 border-b border-border/60">
            {[
              { id: "all", label: "All Questions", icon: HelpCircle },
              { id: "customers", label: "Ordering & App", icon: ShoppingBag },
              { id: "payments", label: "Escrow & Payments", icon: ShieldCheck },
              { id: "vendors", label: "Vendors & Stores", icon: Store },
              { id: "riders", label: "Riders & Couriers", icon: Bike },
              { id: "artisans", label: "Artisans & Pros", icon: Wrench },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeCategory === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(tab.id as FaqCategory)}
                className={`rounded-full text-xs font-semibold gap-1.5 ${
                  activeCategory === tab.id ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Accordion */}
          <div className="mt-10">
            {filteredFaqs.length > 0 ? (
              <Accordion type="single" collapsible className="space-y-4">
                {filteredFaqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="rounded-2xl border border-border bg-card px-6 shadow-sm transition-all hover:border-primary/30"
                  >
                    <AccordionTrigger className="text-left font-display text-base font-bold text-foreground hover:no-underline py-5">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground pb-5">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="rounded-3xl border border-dashed border-border p-12 text-center">
                <HelpCircle className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <h3 className="mt-3 text-base font-bold text-foreground">No questions found matching "{search}"</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try searching with another keyword or reach out to our team directly.
                </p>
              </div>
            )}
          </div>

          {/* Support CTA Callout */}
          <div className="mt-16 rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center sm:p-10">
            <h3 className="font-display text-xl font-bold text-foreground">Still have questions?</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Our support agents and merchant managers in Lagos are ready to assist you right now.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow transition-transform hover:scale-105"
              >
                Contact Support <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="https://whatsapp.com/channel/0029VaXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-xs font-bold text-white shadow transition-transform hover:scale-105"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Help Channel
              </a>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
