<?php

namespace Database\Seeders;

use App\Models\CmsSection;
use Illuminate\Database\Seeder;

class CmsSectionSeeder extends Seeder
{
    /**
     * The 15 landing sections from docs/API_CONTRACT.md §9.
     * Content mirrors the design-locked frontend copy. `data` is the published
     * payload; `draft` starts null. Order controls landing render order.
     */
    public const SECTIONS = [
        ['section' => 'announcement', 'title' => 'Announcement Bar', 'order' => 0, 'data' => [
            'enabled' => false,
            'text' => '🎉 MyTijaara is coming to Ibadan. Join the waitlist today.',
            'href' => '#waitlist',
            'label' => 'Learn more',
            'style' => 'primary',
        ]],
        ['section' => 'navigation', 'title' => 'Navigation', 'order' => 1, 'data' => [
            'logo' => 'MyTijaara',
            'links' => [
                ['label' => 'Services', 'href' => '#services'],
                ['label' => 'Why MyTijaara', 'href' => '#why'],
                ['label' => 'How it works', 'href' => '#how'],
                ['label' => 'FAQ', 'href' => '#faq'],
                ['label' => 'Referral Rewards', 'href' => '/referral-rewards'],
            ],
            'cta' => ['label' => 'Join the Waitlist', 'href' => '#waitlist'],
        ]],
        ['section' => 'hero', 'title' => 'Hero', 'order' => 2, 'data' => [
            'eyebrow' => 'Built for Nigerians — Launching soon',
            'eyebrowLive' => 'Built for Nigerians — Now live',
            'heading' => 'Your everyday life,',
            'headingHighlight' => 'seamlessly delivered.',
            'subtitle' => 'Order food and daily essentials, book trusted local artisans, and send parcels across your city — in the app or straight through WhatsApp. Built for everyday life in Nigeria.',
            'imageUrl' => '',
            'secondaryCtaLabel' => 'See How It Works',
            'services' => [
                ['icon' => 'UtensilsCrossed', 'label' => 'Food'],
                ['icon' => 'ShoppingBasket', 'label' => 'Groceries'],
                ['icon' => 'MessageCircle', 'label' => 'WhatsApp'],
                ['icon' => 'Package', 'label' => 'Parcels'],
                ['icon' => 'Wrench', 'label' => 'Artisans'],
                ['icon' => 'Car', 'label' => 'Rides'],
            ],
        ]],
        ['section' => 'services', 'title' => 'Services', 'order' => 3, 'data' => [
            'heading' => 'The everyday operating system for Nigeria.',
            'subheading' => 'Food, daily shopping, verified artisans, and package logistics — powered in the app and integrated with WhatsApp.',
            'items' => [
                ['title' => 'Hot food delivery', 'description' => 'Local favourites and top restaurants delivered to your doorstep in minutes.'],
                ['title' => 'Groceries & market', 'description' => 'Fresh produce, household supplies, and essentials packed with care.'],
                ['title' => 'WhatsApp shopping', 'description' => 'Browse vendor catalogs, order, and pay without leaving your WhatsApp chats.'],
                ['title' => 'Vetted local artisans', 'description' => 'Electricians, plumbers, carpenters, and technicians rated by neighbours.'],
                ['title' => 'Same-day parcel runs', 'description' => 'Fast, GPS-tracked parcel delivery across your city with recipient PIN verification.'],
                ['title' => 'Pharmacy essentials', 'description' => 'Everyday health essentials and OTC medicines delivered promptly.'],
                ['title' => 'Merchant sales engine', 'description' => 'Automated orders, inventory tracking, and prompt bank settlement for local sellers.'],
                ['title' => '100% Escrow safety', 'description' => 'Funds stay protected until you receive and verify your order or service.'],
            ],
        ]],
        ['section' => 'why', 'title' => 'Why MyTijaara', 'order' => 4, 'data' => [
            'heading' => 'Built for how Nigeria actually works.',
            'subheading' => 'We built MyTijaara to eliminate daily friction: no more endless WhatsApp screenshots, unverified transfer receipts, or unreliable dispatch riders.',
            'points' => [
                ['title' => 'Everyday simplicity', 'description' => 'One home for meals, market runs, vetted artisans, and deliveries — without app clutter.'],
                ['title' => 'WhatsApp-native commerce', 'description' => 'Order and sell directly where trade already happens, backed by live inventory and automated checkout.'],
                ['title' => 'Escrow-backed trust', 'description' => 'Payments stay safe until both customer and vendor confirm successful completion.'],
                ['title' => 'Real-time transparency', 'description' => 'Live GPS rider dispatch, recipient PIN codes, and upfront naira pricing with zero surprises.'],
            ],
        ]],
        ['section' => 'how', 'title' => 'How It Works', 'order' => 5, 'data' => [
            'heading' => 'Get started in four easy steps.',
            'steps' => [
                ['title' => 'Download the app', 'description' => 'Sign up in under a minute with just your phone number.'],
                ['title' => 'Choose what you need', 'description' => 'Food, groceries, an artisan, a ride — pick from one home screen.'],
                ['title' => 'Track it live', 'description' => 'See your rider or artisan on the way, in real time.'],
                ['title' => 'Relax', 'description' => 'Pay how you want. Rate your experience. Do it again tomorrow.'],
            ],
        ]],
        ['section' => 'inside_the_app', 'title' => 'Inside the App', 'order' => 6, 'data' => [
            'badge' => 'Inside the app',
            'heading' => 'Nine screens. One tidy life.',
            'subheading' => 'A peek at the real MyTijaara — from food to fuel money, groceries to getaways. Swipe, drag, or tap any screen to see it up close.',
        ]],
        ['section' => 'built_for_nigerians', 'title' => 'Built for Nigerians', 'order' => 7, 'data' => [
            'heading' => 'Made here. For here.',
            'body' => 'We know Nigerian streets, Nigerian shops, Nigerian tastes — MyTijaara is built with all of it in mind. Not a copy of something from abroad.',
            'points' => [
                'Pay how you already pay — card, transfer or on delivery.',
                'Prices in naira. No surprise conversions.',
                'Support that speaks your language, based in Nigeria.',
                'Works with the shops and services on your street.',
            ],
            'headingLive' => 'Made here. For here.',
            'bodyLive' => 'Powering everyday trade, hot food, artisans, and essentials across Nigerian neighborhoods. Built for the rhythm of Nigerian life.',
            'pointsLive' => [
                'Pay how you already pay — card, instant bank transfer, or on delivery.',
                'Transparent naira pricing with zero surprise conversions.',
                '24/7 responsive customer support based right here in Nigeria.',
                'Live GPS delivery dispatch and automated escrow safety.',
            ],
        ]],
        ['section' => 'partners', 'title' => 'Partners', 'order' => 8, 'data' => [
            'badge' => 'Grow with us',
            'heading' => 'A better way to earn.',
            'subheading' => 'Vendors, riders and artisans — MyTijaara helps you find more customers.',
        ]],
        ['section' => 'testimonials', 'title' => 'Testimonials', 'order' => 9, 'data' => [
            'heading' => 'What early users are saying',
        ]],
        ['section' => 'faqs', 'title' => 'FAQs', 'order' => 10, 'data' => [
            'heading' => 'Frequently asked questions',
        ]],
        ['section' => 'footer', 'title' => 'Footer', 'order' => 11, 'data' => [
            'tagline' => 'Everything you need, all in one place. Built for everyday life in Nigeria.',
            'columns' => [
                [
                    'title' => 'Product',
                    'links' => [
                        ['label' => 'Everyday moments', 'href' => '#moments'],
                        ['label' => 'What you can do', 'href' => '#services'],
                        ['label' => 'How it works', 'href' => '#how'],
                        ['label' => 'FAQ', 'href' => '#faq'],
                        ['label' => 'Referral Perks', 'href' => '/referral-rewards'],
                    ],
                ],
                [
                    'title' => 'Partners',
                    'links' => [
                        ['label' => 'Vendors', 'href' => '#partners'],
                        ['label' => 'Riders', 'href' => '#partners'],
                        ['label' => 'Artisans', 'href' => '#partners'],
                        ['label' => 'Contact sales', 'href' => 'mailto:hello@mytijaara.com'],
                    ],
                ],
                [
                    'title' => 'Company',
                    'links' => [
                        ['label' => 'About', 'href' => '/about'],
                        ['label' => 'Careers', 'href' => '/careers'],
                        ['label' => 'Privacy policy', 'href' => '/privacy'],
                        ['label' => 'Terms of service', 'href' => '/terms'],
                        ['label' => 'Cookie policy', 'href' => '/cookies'],
                    ],
                ],
            ],
            // `{year}` and `{heart}` are substituted by the footer renderer.
            'copyright' => '© {year} MyTijaara Ltd. Made with {heart} in Nigeria.',
        ]],
        // The floating social widget's URLs live in `site_settings` (Settings →
        // Social), which covers seven platforms and is what both the widget and
        // the footer read. This row exists only to carry the section's on/off
        // switch, so it deliberately holds no URLs: two screens writing the same
        // field means one of them silently loses.
        ['section' => 'social', 'title' => 'Social Links', 'order' => 12, 'data' => []],
        ['section' => 'statistics', 'title' => 'Statistics', 'order' => 13, 'data' => [
            'items' => [
                ['label' => 'Local Restaurants', 'value' => '50+', 'enabled' => true],
                ['label' => 'Trusted Pharmacies', 'value' => '20+', 'enabled' => true],
                ['label' => 'Verified Artisans', 'value' => '100+', 'enabled' => true],
                ['label' => 'Supermarkets', 'value' => '15+', 'enabled' => true],
                ['label' => 'Delivery Riders', 'value' => '80+', 'enabled' => true],
            ],
        ]],
        ['section' => 'seo', 'title' => 'SEO', 'order' => 14, 'data' => [
            'title' => 'MyTijaara — The Everyday Super App for Nigeria',
            'description' => 'Order hot food and groceries, book vetted artisans, and send parcels across your city — in the app and via WhatsApp. Everyday life, seamlessly delivered.',
            'canonicalUrl' => 'https://mytijaara.com',
            'keywords' => 'nigeria, super app, food delivery, groceries, whatsapp commerce, vetted artisans, logistics, the gojek of africa',
            'ogTitle' => 'MyTijaara — The Everyday Super App for Nigeria',
            'ogDescription' => 'Join thousands of Nigerians using MyTijaara for hot meals, daily market shopping, verified artisans, package delivery, and WhatsApp-native commerce.',
            'ogImage' => '/og-image.png',
            'twitterHandle' => '@mytijaara',
        ]],
        ['section' => 'download', 'title' => 'Download App', 'order' => 15, 'data' => [
            'badge' => 'Get the App',
            'heading' => 'Experience MyTijaara on your device',
            'subheading' => 'Order food, shop groceries & pharmacy items, book artisans, send parcels, and rent cars — all in one super app built for Nigeria.',
            // No label: the store badge wording is fixed by Google's and Apple's
            // brand guidelines, so the page renders it verbatim.
            'playStore' => [
                'enabled' => true,
                'comingSoon' => false,
                'url' => 'https://play.google.com/store/apps/details?id=com.mytijaara.app',
            ],
            'appStore' => [
                'enabled' => true,
                'comingSoon' => true,
                'url' => 'https://apps.apple.com/app/mytijaara/id000000000',
            ],
            'webApp' => [
                'enabled' => true,
                'url' => 'https://app.mytijaara.com',
                'label' => 'Order Online (Web App)',
                'description' => 'No installation required — browse menus, buy essentials, and order services directly in your browser.',
            ],
            'vendorPartner' => [
                'enabled' => true,
                'url' => 'https://dashboard.mytijaara.com',
                'label' => 'Partner with us as a Vendor',
                'description' => 'Sell food, groceries, pharmacy or retail products to thousands of customers.',
            ],
            'riderPartner' => [
                'enabled' => true,
                'url' => 'https://dashboard.mytijaara.com',
                'label' => 'Earn with us as a Delivery Rider',
                'description' => 'Flexible hours, prompt payouts, and guaranteed orders across your city.',
            ],
            // Rendered by the "What you can do with MyTijaara" grid on /download.
            // `icon` is a name from `src/lib/cms/content-icons.tsx`, which maps it
            // to a lucide component and its tint; an unknown name falls back to a
            // neutral card rather than breaking the page.
            'features' => [
                ['icon' => 'UtensilsCrossed', 'title' => 'Hot Food Delivery', 'desc' => 'Order from your favourite local bukas and top fast-food chains delivered hot in under 35 mins.', 'enabled' => true],
                ['icon' => 'ShoppingBag', 'title' => 'Supermarket & Groceries', 'desc' => 'Fresh vegetables, packaged food, drinks, and household supplies packed and delivered.', 'enabled' => true],
                ['icon' => 'Pill', 'title' => 'Pharmacy & Health', 'desc' => 'Prescriptions, over-the-counter medicine, supplements, and first-aid supplies with discreet delivery.', 'enabled' => true],
                ['icon' => 'Wrench', 'title' => 'Vetted Local Artisans', 'desc' => 'Book trusted plumbers, electricians, mechanics, and painters with verified reviews and fixed pricing.', 'enabled' => true],
                ['icon' => 'Package', 'title' => 'Same-Day Parcel Delivery', 'desc' => 'Send documents and parcels across town with real-time GPS tracking and recipient PIN verification.', 'enabled' => true],
                ['icon' => 'ShieldCheck', 'title' => 'Secure Escrow Payments', 'desc' => 'Your money stays in automated escrow until you inspect and confirm your order or service.', 'enabled' => true],
            ],
        ]],
        ['section' => 'about', 'title' => 'About Page', 'order' => 16, 'data' => [
            'hero' => [
                'heading' => 'The everyday operating system for Nigerian life & trade.',
                'subheading' => 'One single platform that unifies daily commerce, hot meals, groceries, trusted artisans, parcels, and transport — powered in the app and integrated with WhatsApp.',
            ],
            'mission' => [
                'heading' => 'Our Mission & Commitment',
                'body' => 'MyTijaara exists to eliminate friction from everyday commerce across Nigeria. We believe you shouldn\'t need five different apps and endless WhatsApp chats to manage your day. From ordering hot lunch to booking an emergency plumber, every transaction should be fast, reliable, transparent, and protected by escrow.',
            ],
            'vision' => [
                'badge' => 'The Vision & Moniker',
                'heading' => 'Why we are called "The Gojek of Africa"',
                'p1' => 'In Southeast Asia, Gojek transformed everyday life by organizing informal motorbike transport and local street stalls into an on-demand digital powerhouse for hundreds of millions of people.',
                'p2' => 'Across Nigeria and Africa, commerce already pulses through bustling neighborhood markets and endless WhatsApp Status posts. Hardworking merchants plead for patronage, trapped in small contact lists, while buyers juggle unreliable dispatch riders and payment anxiety.',
                'p3' => 'MyTijaara is engineering that exact multi-service infrastructure for Africa. By combining meals, groceries, vetted artisans, and express parcel logistics with WhatsApp-native storefronts and automated escrow protection, we are turning informal street commerce into an unstoppable, trusted ecosystem.',
            ],
            'values' => [
                'heading' => 'What drives everything we build',
                'items' => [
                    ['title' => 'Deeply Local, Proudly Nigerian', 'body' => 'Engineered specifically for Nigerian cities, market streets, and real-world logistics challenges — not an imported copy.'],
                    ['title' => 'WhatsApp-Native Commerce', 'body' => 'Empowering everyday vendors and customers to trade where they already chat, with automated catalogs and live order tracking.'],
                    ['title' => '100% Escrow Trust', 'body' => 'Buyers only release payment upon verified delivery; vendors and artisans receive guaranteed, prompt payouts.'],
                    ['title' => 'Empowering Local Micro-Merchants', 'body' => 'Giving neighbourhood bukaterias, pharmacy stores, and artisans world-class digital tools to expand their sales.'],
                    ['title' => 'Speed & Real-time Transparency', 'body' => 'GPS live dispatch, clear naira pricing with zero surprise charges, and responsive 24/7 in-country human support.'],
                ],
            ],
        ]],
        ['section' => 'launch_pass', 'title' => 'Launch Pass & NATCON Campaign', 'order' => 17, 'data' => [
            'campaignTitle' => 'My Launch Pass',
            'eventName' => 'TAA NATCON 2026',
            'eventDate' => 'October 2, 2026',
            'eventDateShort' => '02 • 10 • 26',
            'headlineGeneral' => "I'M ON THE LIST",
            'headlineAttendee' => "I'LL BE THERE",
            'supportingCopyGeneral' => "I'm getting ready for MyTijaara. Officially launching October 2, 2026 at TAA NATCON 2026. Something big is coming.",
            'supportingCopyAttendee' => "I'll be witnessing the official launch of MyTijaara LIVE at TAA NATCON 2026. 02 • 10 • 26.",
            'liveHeadlineGeneral' => 'MYTIJAARA IS LIVE',
            'liveHeadlineAttendee' => 'I WAS THERE',
            'taaLogoUrl' => '/images/taa-natcon-logo.svg',
            'sharingMessage' => "I'm on the MyTijaara Launch List! Officially launching Oct 2 at TAA NATCON 2026. Join with me:",
            'sharingMessageAttendee' => "I'll be witnessing the official launch of MyTijaara LIVE at TAA NATCON 2026! Join the waitlist before launch:",
            'referralCta' => 'Join the Waitlist',
            'cardFooterText' => "MyTijaara × TAA NATCON 2026 • Nigeria's Everyday Super App",
            'enableAttendeeQuestion' => true,
            'enablePostFormat' => true,
            'enableStoryFormat' => true,
        ]],
    ];

    public function run(): void
    {
        foreach (self::SECTIONS as $s) {
            CmsSection::updateOrCreate(
                ['section' => $s['section']],
                [
                    'title' => $s['title'],
                    'data' => $s['data'],
                    'enabled' => true,
                    'published' => true,
                    'order' => $s['order'],
                ],
            );
        }
    }
}
