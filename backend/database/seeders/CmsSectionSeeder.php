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
            'heading' => 'Everything you need,',
            'headingHighlight' => 'all in one place.',
            'subtitle' => 'Order food, groceries and pharmacy items, book trusted artisans, send packages, rent cars, and shop from businesses around you — all from one app built for Nigerians.',
            'imageUrl' => '',
            'secondaryCtaLabel' => 'See How It Works',
            'services' => [
                ['icon' => 'UtensilsCrossed', 'label' => 'Food'],
                ['icon' => 'ShoppingBasket', 'label' => 'Groceries'],
                ['icon' => 'Pill', 'label' => 'Pharmacy'],
                ['icon' => 'Package', 'label' => 'Parcels'],
                ['icon' => 'Car', 'label' => 'Cars'],
                ['icon' => 'Wrench', 'label' => 'Artisans'],
            ],
        ]],
        ['section' => 'services', 'title' => 'Services', 'order' => 3, 'data' => [
            'heading' => 'One app. All your errands.',
            'subheading' => 'Stop jumping between five different apps. MyTijaara puts it all in one place.',
            'items' => [
                ['title' => 'Order food', 'description' => 'Local favourites and top restaurants delivered hot.'],
                ['title' => 'Buy groceries', 'description' => 'Fresh produce and weekly essentials in one basket.'],
                ['title' => 'Pharmacy items', 'description' => 'Prescription refills and everyday health needs.'],
                ['title' => 'Shop local', 'description' => 'Discover businesses and vendors around you.'],
                ['title' => 'Send parcels', 'description' => 'Same-day delivery across town, tracked end-to-end.'],
                ['title' => 'Rent a car', 'description' => 'Trusted rentals for the day, week, or that big trip.'],
                ['title' => 'Book artisans', 'description' => 'Electricians, plumbers, cleaners — vetted and rated.'],
                ['title' => 'Home services', 'description' => 'From laundry to fumigation, handled the right way.'],
            ],
        ]],
        ['section' => 'why', 'title' => 'Why MyTijaara', 'order' => 4, 'data' => [
            'heading' => 'Simpler days. Made in Nigeria.',
            'subheading' => 'We built MyTijaara so you can spend less time managing errands and more time on what actually matters.',
            'points' => [
                ['title' => 'One app for everything', 'description' => 'Food, shopping, parcels, artisans and more — no more switching apps.'],
                ['title' => 'Made for Nigeria', 'description' => 'Built around how we actually live, order and pay.'],
                ['title' => 'Trusted partners', 'description' => 'Every rider, artisan and vendor is verified before they join.'],
                ['title' => 'Fast and reliable', 'description' => 'Real-time tracking so you always know what\'s happening.'],
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
            'title' => 'MyTijaara — Everything you need, all in one place',
            'description' => 'Join the MyTijaara waitlist. Order food, groceries, pharmacy items, book trusted artisans, send packages, and rent cars in Nigeria.',
            'canonicalUrl' => 'https://mytijaara.com',
            'keywords' => 'nigeria, super app, food delivery, groceries, pharmacy, artisans, logistics, car rental',
            'ogTitle' => 'MyTijaara — Everything you need, all in one place',
            'ogDescription' => 'Join thousands of Nigerians on the MyTijaara waitlist for priority access to food, shopping, deliveries, and trusted local services.',
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
