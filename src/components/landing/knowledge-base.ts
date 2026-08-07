/* ------------------------------------------------------------------ */
/* MyTijaara Assistant — Knowledge Base                                */
/* Deterministic, weighted keyword matching. Zero API/token cost.      */
/*                                                                      */
/* HOW IT WORKS                                                         */
/* Each topic has a list of trigger PATTERNS (regexes). When a user     */
/* message comes in, every topic is scored by how many of its own      */
/* patterns match. The topic with the highest score wins. This beats   */
/* a linear if-chain because:                                          */
/*   - "car rental" no longer gets swallowed by a generic "services"   */
/*     regex that fires first                                          */
/*   - a message can weakly match five topics and strongly match one — */
/*     the strong one wins instead of whichever was checked first      */
/*   - adding a new topic never requires reordering existing ones      */
/*                                                                      */
/* HOW TO EXTEND                                                        */
/* Add a new entry to TOPICS. Give it 4-8 pattern variants covering     */
/* the direct phrasing, a casual/Pidgin phrasing, and a typo-tolerant   */
/* one where it matters. Keep response copy in Tija's voice: warm,     */
/* concise, honest when something isn't known yet, never robotic.      */
/* ------------------------------------------------------------------ */

export const LAUNCH_DATE = "October 02, 2026";
export const LAUNCH_CITY = "Ibadan";
export const CONFERENCE_NAME = "the TAA National Conference";

interface Topic {
  id: string;
  /** Regex patterns — ANY match adds to this topic's score */
  patterns: RegExp[];
  /** Optional: patterns that strongly indicate this topic over others */
  strongPatterns?: RegExp[];
  response: string;
}

/* ------------------------------------------------------------------ */
/* Topics                                                               */
/* ------------------------------------------------------------------ */

const TOPICS: Topic[] = [
  /* ---------------------------- Greeting ---------------------------- */
  {
    id: "greeting",
    patterns: [
      /\b(hi|hello|hey|good\s?morning|good\s?afternoon|good\s?evening|howdy|what'?s\s?up|sup|yo)\b/,
    ],
    response:
      "Hey there! 👋 I'm Camila, your MyTijaara assistant. Ask me anything about the app, our services, the waitlist, or how to become a vendor or rider.",
  },

  /* ------------------------------ About ------------------------------ */
  {
    id: "about",
    patterns: [
      /\b(what\s?is\s?mytijaara|about\s?mytijaara|who\s?are\s?you|tell\s?me\s?about|describe\s?mytijaara|explain\s?mytijaara|overview)\b/,
      /\bwhat\s?is\s?this\s?(app|platform|thing)\b/,
    ],
    response:
      "MyTijaara is Nigeria's most complete delivery and services super-app 🇳🇬\n\nOne app for food, groceries, pharmacy, eCommerce, parcel delivery, car rental, and trusted on-demand artisans (that's our DemXer module). We're starting right here in Ibadan before growing across Nigeria and beyond.\n\nWe believe commerce works best when it's built on trust — so every vendor, rider, and artisan on the platform is verified before they can serve you.",
  },

  /* ---------------------------- Origin story -------------------------- */
  {
    id: "origin_story",
    patterns: [
      /\b(why\s?(was|were|did)\s?(this|mytijaara|you)\s?(start|begin|create|found))\b/,
      /\b(founding|founder'?s?\s?story|origin\s?story|how\s?did\s?mytijaara\s?start|whatsapp\s?status)\b/,
      /\b(why\s?(the\s?)?name|meaning\s?of\s?tijaara|why\s?call(ed)?\s?mytijaara)\b/,
    ],
    response:
      "MyTijaara started with a simple observation: hardworking Nigerians selling on WhatsApp Status — food, clothes, pastries — pleading for patronage, trapped in tiny circles of contacts. They weren't lacking talent. They were lacking visibility.\n\nThat, plus a frustrating week trying to find a trustworthy plumber and electrician, planted the idea: what if there was one trusted platform where people could find and be found?\n\n\"Tijaara\" is Arabic for trade — commerce built on trust, not just transactions. \"My\" makes it personal: this belongs to the people who use it.",
  },

  /* ------------------------------ Waitlist ----------------------------- */
  {
    id: "waitlist",
    patterns: [
      /\b(waitlist|join|sign\s?up|signup|register|enroll|get\s?access|early\s?access|how\s?do\s?i\s?join)\b/,
    ],
    strongPatterns: [/\bwaitlist\b/],
    response:
      `Joining takes about 30 seconds 🎉\n\nJust scroll up to the waitlist form, drop your email, and you're in. You'll get early access before general public rollout on ${LAUNCH_DATE}, plus first dibs on launch perks.`,
  },

  /* ------------------------------ Launch date --------------------------- */
  {
    id: "launch",
    patterns: [
      /\b(launch|when\s?(will|does|is)|release\s?date|go\s?live|available|ready|open(ing)?)\b/,
      /\bwhen\b.{0,20}\b(start|begin|live)\b/,
    ],
    strongPatterns: [/\bwhen\b/, /\blaunch\s?date\b/],
    response:
      `We're officially launching on ${LAUNCH_DATE} 🚀 — right here in ${LAUNCH_CITY}, with a grand launch tied to ${CONFERENCE_NAME}.\n\nJoin the waitlist now and you'll get access before the general public. We'll notify you the moment it's live.`,
  },

  /* ------------------------------ TAA / event ----------------------------- */
  {
    id: "conference",
    patterns: [
      /\b(taa|conference|launch\s?event|grand\s?launch)\b/,
    ],
    strongPatterns: [/\btaa\b/, /\bconference\b/],
    response:
      `Our grand launch is timed around ${CONFERENCE_NAME}, where we'll be introducing MyTijaara to a much wider audience. It's a big moment for us — the culmination of months of building. Join the waitlist and you won't miss it.`,
  },

  /* ------------------------------ Services (overview) --------------------- */
  {
    id: "services",
    patterns: [
      /\b(services?|what\s?(can|do)\s?(i|you)\s?(order|do|get)|modules?|features?|offer(ings?)?|everything\s?you\s?(offer|have))\b/,
    ],
    response:
      "MyTijaara covers seven everyday needs in one app:\n\n🍛 Food — restaurants & home cooks near you\n🛒 Groceries — markets & supermarkets\n💊 Pharmacy — verified medication delivery\n🛍️ eCommerce — a marketplace of local sellers\n📦 Parcel delivery — same-day, tracked\n🚗 Car rental — short and long term\n🔧 On-demand artisans (DemXer) — trusted plumbers, electricians & more\n\nOne app, one trust relationship, everything.",
  },

  /* ------------------------------ Food ---------------------------------- */
  {
    id: "food",
    patterns: [/\b(food|restaurant|eat|meal|jollof|order\s?food|home\s?cook)\b/],
    strongPatterns: [/\bfood\s?delivery\b/],
    response:
      "Our Food module connects you to restaurants and home cooks near you, with real-time order tracking so you know exactly when your meal is on the way. Once we launch in Ibadan, you'll be able to browse and order right from the app.",
  },

  /* ------------------------------ Groceries ------------------------------ */
  {
    id: "groceries",
    patterns: [/\b(grocer(y|ies)|market|supermarket|foodstuff|provisions)\b/],
    response:
      "The Grocery module brings local markets and supermarkets to your doorstep — from fresh produce to household essentials. No more fighting traffic or market stress for the weekly shop.",
  },

  /* ------------------------------ Pharmacy -------------------------------- */
  {
    id: "pharmacy",
    patterns: [/\b(pharmac(y|ies)|medic(ine|ation)|drug|chemist|prescription)\b/],
    response:
      "Pharmacy is one of our most important modules — verified pharmacy partners delivering genuine medication reliably. We built this one with extra care, because access to real medicine shouldn't depend on how close you live to a pharmacy.",
  },

  /* ------------------------------ eCommerce -------------------------------- */
  {
    id: "ecommerce",
    patterns: [/\b(ecommerce|e-commerce|shop(ping)?|marketplace|buy\s?(products|things|items))\b/],
    response:
      "Our eCommerce module is a multi-vendor marketplace — fashion, electronics, gadgets, crafts, accessories. Every seller gets their own storefront, and every buyer gets a platform they can trust.",
  },

  /* ------------------------------ Parcel ---------------------------------- */
  {
    id: "parcel",
    patterns: [/\b(parcel|package|courier|send\s?(a\s?)?(item|package|thing)|ship(ping)?|logistics)\b/],
    response:
      "Parcel delivery on MyTijaara is same-day and scheduled, fully tracked — great for individuals, small businesses, and fashion brands who need reliable delivery within the city.",
  },

  /* ------------------------------ Car rental -------------------------------- */
  {
    id: "car_rental",
    patterns: [/\b(car\s?rental|rent\s?a\s?car|hire\s?a\s?car|vehicle\s?rental|chauffeur)\b/],
    strongPatterns: [/\bcar\s?rental\b/],
    response:
      "You'll be able to search vehicles by destination, trip type, price range, and seating capacity — whether it's a personal trip, a corporate booking, or an event. Self-drive and chauffeur options both planned.",
  },

  /* ------------------------------ DemXer / artisans --------------------------- */
  {
    id: "demxer",
    patterns: [
      /\b(demxer|artisan|plumber|electrician|repair|handyman|technician|on-?demand\s?service|cleaner|carpenter|mechanic\b(?!.{0,10}car\s?rental))\b/,
    ],
    strongPatterns: [/\bdemxer\b/],
    response:
      "DemXer is our on-demand services module — born from a very real problem: not being able to find a trustworthy plumber or electrician when we needed one urgently.\n\nPlumbers, electricians, cleaners, carpenters, mechanics and more, all verified before they can take a booking. It's how MyTijaara turns \"does anyone know a good [artisan]?\" into a solved problem.",
  },

  /* ------------------------------ Referral ---------------------------------- */
  {
    id: "referral",
    patterns: [/\b(referral|refer|invite|friend|share\s?(my\s?)?link|reward|bonus|priority\s?queue)\b/],
    response:
      "Our referral program rewards you for spreading the word 🎁\n\nShare your unique referral link — every friend who joins the waitlist moves you up the priority queue and unlocks extra launch perks. The more you invite, the earlier your access.",
  },

  /* ------------------------------ Location ---------------------------------- */
  {
    id: "location",
    patterns: [/\b(nigeria|ibadan|lagos|abuja|city|cities|location|where|area|state|region|which\s?city)\b/],
    strongPatterns: [/\bibadan\b/],
    response:
      `We're launching first in ${LAUNCH_CITY} on ${LAUNCH_DATE} — that's our home base and where we're building deep, real trust before expanding. More Nigerian cities will follow as we grow, then further across Africa.`,
  },

  /* ------------------------------ Payment ---------------------------------- */
  {
    id: "payment",
    patterns: [/\b(pay(ment)?|price|cost|fee|money|naira|ngn|charge|bank|card|transfer|wallet|how\s?much)\b/],
    response:
      "MyTijaara is built for Nigerian payment methods — bank cards, bank transfers, and wallet payments, powered by Paystack. Fast, secure, naira-denominated. Pricing details for each module will be shared as we get closer to launch.",
  },

  /* ------------------------------ Safety / trust ---------------------------------- */
  {
    id: "safety",
    patterns: [/\b(safe|secure|trust(ed|worthy)?|privacy|data|scam|legit|real|verified|security|ndpr)\b/],
    response:
      "Trust is our first product, not an afterthought 🔒\n\nEvery vendor, rider, and artisan is verified before they can serve customers. We use industry-standard encryption, we never sell your data, and we handle everything in line with Nigeria's data protection regulation (NDPR).",
  },

  /* ------------------------------ Support / contact ---------------------------------- */
  {
    id: "support",
    patterns: [/\b(contact|support|help|team|email|reach\s?(you|us)|talk\s?to|customer\s?service)\b/],
    response:
      "Need a human? Reach us at:\n\n📧 hello@mytijaara.com\n📲 @mytijaara on all social platforms\n\nWe're a small, hands-on founding team — real people read every message.",
  },

  /* ------------------------------ Download / app store ---------------------------------- */
  {
    id: "download",
    patterns: [/\b(app|ios|android|download|install|phone|mobile|play\s?store|app\s?store)\b/],
    response:
      "The app isn't live yet — that's exactly what the waitlist is for 📱\n\nJoin now and you'll be first to know when we go live on Android (Play Store first, with iOS to follow). We'll notify you the moment it drops.",
  },

  /* ------------------------------ Become a vendor ---------------------------------- */
  {
    id: "vendor_signup",
    patterns: [
      /\b(become\s?a\s?vendor|sell\s?on\s?mytijaara|list\s?my\s?(business|shop|store)|vendor\s?sign\s?up|register\s?my\s?business|onboard\s?(my\s?)?business)\b/,
      /\b(i\s?(want|would\s?like)\s?to\s?sell|i\s?(have|own)\s?a\s?(shop|business|restaurant|store))\b/,
    ],
    strongPatterns: [/\bbecome\s?a\s?vendor\b/, /\bsell\s?on\s?mytijaara\b/],
    response:
      "We'd genuinely love to have you as a founding vendor! 🙌\n\nBeing a vendor from day one in Ibadan means getting visibility before the general public even knows we exist.\n\nA couple of quick things — what kind of business is it (food, fashion, groceries, services, etc.), and are you already in Ibadan? Drop those details here or email hello@mytijaara.com and our team will personally follow up to get you onboarded.",
  },

  /* ------------------------------ Become a rider ---------------------------------- */
  {
    id: "rider_signup",
    patterns: [
      /\b(become\s?a\s?rider|ride(r)?\s?sign\s?up|delivery\s?rider|okada\s?rider|i\s?(want|would\s?like)\s?to\s?(ride|deliver)|join\s?as\s?a\s?rider)\b/,
    ],
    strongPatterns: [/\bbecome\s?a\s?rider\b/],
    response:
      "We're actively recruiting founding riders in Ibadan 🏍️\n\nRiders earn honestly and get first access to orders as we launch. Are you currently in Ibadan, and do you have your own bike? Share that here or email hello@mytijaara.com with your name and location, and our team will reach out directly to get you set up.",
  },

  /* ------------------------------ Become an artisan ---------------------------------- */
  {
    id: "artisan_signup",
    patterns: [
      /\b(become\s?an?\s?artisan|join\s?demxer|list\s?my\s?(service|skill)|i\s?(am|'?m)\s?a\s?(plumber|electrician|carpenter|mechanic|technician)\b.{0,15}\bjoin)\b/,
      /\bhow\s?do\s?i\s?(join|sign\s?up)\s?as\s?an?\s?artisan\b/,
    ],
    response:
      "DemXer is built for skilled people exactly like you 🔧\n\nWe verify every artisan before they go live, which is what makes the whole thing trustworthy for customers. What's your trade, and are you based in Ibadan? Share that here or email hello@mytijaara.com and our team will personally follow up.",
  },

  /* ------------------------------ Team / company ---------------------------------- */
  {
    id: "team",
    patterns: [/\b(who\s?(built|made|runs)\s?this|founder|ceo|rasheed|team\s?behind|nekxr)\b/],
    response:
      "MyTijaara is built by Rasheed Amuda and a founding volunteer team, under Nekxr Digital Lab, right here in Ibadan. It's a community-first project from day one — most of the early team joined because they believed in the mission before there was any pay involved.",
  },

  /* ------------------------------ Community / mission ---------------------------------- */
  {
    id: "mission",
    patterns: [/\b(mission|vision|purpose|why\s?does\s?this\s?matter|values|believe\s?in)\b/],
    response:
      "We exist to create opportunities through trusted commerce and connected communities. Not just another delivery app — a platform built on the belief that when a community takes care of its own, everyone thrives.\n\nOur north star: become Africa's most trusted platform through which people create opportunities for one another.",
  },
];

const FALLBACK =
  "I'm not sure I caught that — sorry! 😅\n\nHere's what I can help with: the waitlist, our services (food, groceries, pharmacy, eCommerce, parcels, car rental, DemXer artisans), the launch date, becoming a vendor or rider, payment methods, or how to contact us.";

/* ------------------------------------------------------------------ */
/* Scoring matcher                                                      */
/* ------------------------------------------------------------------ */

export function getResponse(input: string): string {
  const q = input.toLowerCase().trim();
  if (!q) return FALLBACK;

  let best: Topic | null = null;
  let bestScore = 0;
  let tied = false;

  for (const topic of TOPICS) {
    let score = 0;
    for (const p of topic.patterns) if (p.test(q)) score += 1;
    if (topic.strongPatterns) {
      for (const p of topic.strongPatterns) if (p.test(q)) score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
      tied = false;
    } else if (score === bestScore && score > 0 && topic !== best) {
      // Two topics matched equally strongly — the generic "about" topic
      // in particular should never win a tie against something specific,
      // so treat genuine ties (other than involving "about") as ambiguous
      // and prefer whichever is NOT the generic about/services catch-all.
      if (best?.id === "about" || best?.id === "services") {
        bestScore = score;
        best = topic;
      } else {
        tied = true;
      }
    }
  }

  if (tied && best) {
    // Ambiguous but confident match beats silence — keep best, which is
    // the first non-generic topic that reached this score.
  }

  return best ? best.response : FALLBACK;
}