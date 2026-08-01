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
            'text' => '🎉 MyTijaara is coming to Lagos. Join the waitlist today.',
            'href' => '#waitlist',
        ]],
        ['section' => 'navigation', 'title' => 'Navigation', 'order' => 1, 'data' => [
            'logo' => 'MyTijaara',
            'links' => [
                ['label' => 'Services', 'href' => '#services'],
                ['label' => 'Why MyTijaara', 'href' => '#why'],
                ['label' => 'How it works', 'href' => '#how'],
                ['label' => 'FAQ', 'href' => '#faq'],
            ],
            'cta' => ['label' => 'Join the Waitlist', 'href' => '#waitlist'],
        ]],
        ['section' => 'hero', 'title' => 'Hero', 'order' => 2, 'data' => [
            'badge' => '🚀 Launching soon',
            'title' => 'One app for food, shopping, deliveries and trusted services',
            'subtitle' => 'MyTijaara brings groceries, meals, pharmacy, and verified artisans together in a single Nigerian super app.',
            'primaryCta' => ['label' => 'Join the Waitlist', 'href' => '#waitlist'],
            'secondaryCta' => ['label' => 'Learn More', 'href' => '#services'],
        ]],
        ['section' => 'services', 'title' => 'Services', 'order' => 3, 'data' => [
            'heading' => 'Everything you need, in one app',
            'items' => [
                ['icon' => 'shopping-cart', 'title' => 'Groceries', 'description' => 'Fresh produce and everyday essentials delivered fast.'],
                ['icon' => 'utensils', 'title' => 'Food', 'description' => 'Order from your favourite local restaurants.'],
                ['icon' => 'pill', 'title' => 'Pharmacy', 'description' => 'Trusted medication and health products at your door.'],
                ['icon' => 'wrench', 'title' => 'Artisans', 'description' => 'Book verified plumbers, electricians and more.'],
            ],
        ]],
        ['section' => 'why', 'title' => 'Why MyTijaara', 'order' => 4, 'data' => [
            'heading' => 'Built for how Nigeria actually shops',
            'points' => [
                ['title' => 'Trusted vendors', 'description' => 'Every vendor and artisan is verified.'],
                ['title' => 'Fair pricing', 'description' => 'Transparent prices with no hidden fees.'],
                ['title' => 'Fast delivery', 'description' => 'Riders across your city, ready to move.'],
            ],
        ]],
        ['section' => 'how', 'title' => 'How It Works', 'order' => 5, 'data' => [
            'heading' => 'Get started in three steps',
            'steps' => [
                ['step' => 1, 'title' => 'Download', 'description' => 'Get the MyTijaara app when we launch.'],
                ['step' => 2, 'title' => 'Order', 'description' => 'Browse food, groceries, pharmacy and services.'],
                ['step' => 3, 'title' => 'Relax', 'description' => 'We deliver to your door, fast.'],
            ],
        ]],
        ['section' => 'inside_the_app', 'title' => 'Inside the App', 'order' => 6, 'data' => [
            'heading' => 'A closer look',
            'screens' => [],
        ]],
        ['section' => 'built_for_nigerians', 'title' => 'Built for Nigerians', 'order' => 7, 'data' => [
            'heading' => 'Made in Nigeria, for Nigeria',
            'body' => 'Naira-first pricing, local payment methods, and support that understands your city.',
        ]],
        ['section' => 'partners', 'title' => 'Partners', 'order' => 8, 'data' => [
            'heading' => 'Trusted by vendors across Nigeria',
            'logos' => [],
        ]],
        ['section' => 'testimonials', 'title' => 'Testimonials', 'order' => 9, 'data' => [
            'heading' => 'What early users are saying',
        ]],
        ['section' => 'faqs', 'title' => 'FAQs', 'order' => 10, 'data' => [
            'heading' => 'Frequently asked questions',
        ]],
        ['section' => 'footer', 'title' => 'Footer', 'order' => 11, 'data' => [
            'tagline' => 'One app for food, shopping, deliveries and trusted services.',
            'columns' => [
                ['title' => 'Company', 'links' => [['label' => 'About', 'href' => '#'], ['label' => 'Careers', 'href' => '#']]],
                ['title' => 'Legal', 'links' => [['label' => 'Privacy', 'href' => '#'], ['label' => 'Terms', 'href' => '#']]],
            ],
            'copyright' => '© 2026 MyTijaara. All rights reserved.',
        ]],
        ['section' => 'social', 'title' => 'Social Links', 'order' => 12, 'data' => [
            'twitter' => 'https://twitter.com/mytijaara',
            'instagram' => 'https://instagram.com/mytijaara',
            'facebook' => 'https://facebook.com/mytijaara',
            'tiktok' => 'https://tiktok.com/@mytijaara',
        ]],
        ['section' => 'statistics', 'title' => 'Statistics', 'order' => 13, 'data' => [
            'items' => [
                ['label' => 'On the waitlist', 'value' => '2,847+'],
                ['label' => 'Cities at launch', 'value' => '1'],
                ['label' => 'Vendor partners', 'value' => '120+'],
            ],
        ]],
        ['section' => 'seo', 'title' => 'SEO', 'order' => 14, 'data' => [
            'title' => 'MyTijaara — One app for food, shopping, deliveries and trusted services',
            'description' => 'Join the MyTijaara waitlist. Groceries, food, pharmacy and verified artisans in one Nigerian super app.',
            'ogImage' => '',
            'keywords' => 'nigeria, super app, food delivery, groceries, pharmacy, artisans',
        ]],
    ];

    public function run(): void
    {
        foreach (self::SECTIONS as $s) {
            CmsSection::firstOrCreate(
                ['section' => $s['section']],
                [
                    'title' => $s['title'],
                    'data' => $s['data'],
                    'draft' => null,
                    'enabled' => true,
                    'published' => true,
                    'order' => $s['order'],
                ],
            );
        }
    }
}
