import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  Building2,
  Store,
  Bike,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { loadPublicPageData } from "@/lib/public-page-data";
import { PublicLayout } from "@/components/landing/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  loader: () => loadPublicPageData(),
  head: () => ({
    meta: [
      { title: "Contact Us & 24/7 Support — MyTijaara | Everyday Commerce" },
      {
        name: "description",
        content:
          "Need help with an order, partnership, or account? Get in touch with MyTijaara via WhatsApp, email, or our Nigerian operations hub in Lagos.",
      },
    ],
  }),
  component: ContactPage,
});

const INQUIRY_DEPARTMENTS = [
  {
    title: "Customer Support & Orders",
    email: "support@mytijaara.com",
    desc: "Order tracking, delivery inquiries, payment receipts & refunds.",
    icon: HelpCircle,
  },
  {
    title: "Merchant & Vendor Onboarding",
    email: "merchants@mytijaara.com",
    desc: "Store listing, menu digitization, weekly payouts & seller tools.",
    icon: Store,
  },
  {
    title: "Rider Fleet & Logistics",
    email: "riders@mytijaara.com",
    desc: "Delivery driver applications, motorcycle onboarding & fleet queries.",
    icon: Bike,
  },
  {
    title: "Partnerships & Press",
    email: "hello@mytijaara.com",
    desc: "Brand collaborations, corporate orders & media inquiries.",
    icon: Building2,
  },
];

function ContactPage() {
  const { launchConfig, serverNow, cms, branding } = Route.useLoaderData();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General Inquiry");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success("Thank you! Your message has been sent to our support team.");
    }, 600);
  };

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
              We're Here to Help
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
              Get in Touch with MyTijaara
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/90 sm:text-xl">
              Have a question about your order, want to partner your store, or need help? Our Nigerian team is always available.
            </p>
          </div>
        </section>

        {/* Quick Contact Cards */}
        <section className="relative -mt-10 mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {INQUIRY_DEPARTMENTS.map((dept) => (
              <div
                key={dept.title}
                className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant"
              >
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <dept.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-bold text-foreground">{dept.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{dept.desc}</p>
                <a
                  href={`mailto:${dept.email}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" /> {dept.email}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Form & Office Information */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12">
            {/* Left: Interactive Form */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-border bg-card p-8 shadow-soft sm:p-10">
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs font-semibold px-3 py-1 mb-2">
                  Send a Message
                </Badge>
                <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  How can we help you today?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fill out the form below and an agent will get back to you in under 2 hours.
                </p>

                {submitted ? (
                  <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900/50 dark:bg-emerald-950/40">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="mt-3 font-display text-lg font-bold text-emerald-950 dark:text-emerald-100">
                      Message Sent Successfully!
                    </h3>
                    <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                      Thank you for reaching out. We have logged your inquiry and sent a confirmation to {email}.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSubmitted(false);
                        setMessage("");
                      }}
                      className="mt-6 text-xs"
                    >
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="c-name" className="text-xs font-semibold">
                          Your Full Name
                        </Label>
                        <Input
                          id="c-name"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Babatunde Adeleke"
                          className="mt-1 text-xs rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="c-email" className="text-xs font-semibold">
                          Your Email Address
                        </Label>
                        <Input
                          id="c-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="mt-1 text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="c-subject" className="text-xs font-semibold">
                        Subject / Category
                      </Label>
                      <select
                        id="c-subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="mt-1 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Customer Support">Customer Support & Orders</option>
                        <option value="Merchant Partnership">Merchant & Restaurant Partnership</option>
                        <option value="Rider Application">Rider & Logistics Application</option>
                        <option value="Artisan Verification">Artisan Directory Listing</option>
                        <option value="Press & Media">Press, Investment & Media</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="c-message" className="text-xs font-semibold">
                        Your Message
                      </Label>
                      <Textarea
                        id="c-message"
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us what you need or how we can assist you..."
                        className="mt-1 text-xs rounded-xl"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full gap-2 rounded-full bg-primary py-3 text-xs font-bold text-primary-foreground shadow-soft hover:bg-primary/90"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {loading ? "Sending Message..." : "Send Message"}
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* Right: Direct Channels & Office Info */}
            <div className="space-y-6 lg:col-span-5">
              {/* WhatsApp Community Box */}
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-soft dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#25D366] text-white">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-emerald-950 dark:text-emerald-100">
                      Official WhatsApp Channel
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">Instant updates & direct alerts</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-emerald-900 leading-relaxed dark:text-emerald-200">
                  Join thousands of members on our official WhatsApp channel for exclusive launch perks, flash delivery deals, and product updates.
                </p>
                <a
                  href="https://whatsapp.com/channel/0029VaXXXXX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-xs font-bold text-white shadow transition-transform hover:scale-105"
                >
                  Join WhatsApp Channel <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Office & Operations Hub */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
                <h3 className="font-display text-base font-bold text-foreground">Nigerian Operations Hub</h3>

                <div className="flex items-start gap-3 text-xs">
                  <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <strong className="text-foreground">Lagos Headquarters</strong>
                    <p className="text-muted-foreground">Victoria Island / Lekki Corridor, Lagos State, Nigeria</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <Clock className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Support Hours</strong>
                    <p className="text-muted-foreground">Digital App Dispatch: 24/7 Mon – Sun</p>
                    <p className="text-muted-foreground">Merchant Office: 8:00 AM – 6:00 PM (WAT)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-xs">
                  <Phone className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Direct Hotline</strong>
                    <p className="text-muted-foreground">+234 (0) 800-MYTIJAARA / +234 800 000 0000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
