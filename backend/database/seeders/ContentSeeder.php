<?php

namespace Database\Seeders;

use App\Models\Faq;
use App\Models\Testimonial;
use Illuminate\Database\Seeder;

class ContentSeeder extends Seeder
{
    /** FAQs + testimonials mirror src/lib/mock-data.ts. */
    public function run(): void
    {
        $faqs = [
            ['question' => 'When will MyTijaara launch?', 'answer' => "We're rolling out to Lagos in Q3 2026, followed by Abuja and Port Harcourt.", 'order' => 1, 'published' => true],
            ['question' => 'Is MyTijaara free to use?', 'answer' => 'Yes, downloading and using MyTijaara is free. You only pay for what you order.', 'order' => 2, 'published' => true],
            ['question' => 'How do I become a vendor?', 'answer' => 'Join the vendor waitlist from the app or contact us at vendors@mytijaara.com.', 'order' => 3, 'published' => true],
            ['question' => 'Which cities are supported?', 'answer' => 'Lagos at launch, with Abuja, Port Harcourt, and Kano following within 90 days.', 'order' => 4, 'published' => true],
            ['question' => 'How does the referral program work?', 'answer' => 'Invite friends with your unique code and earn ₦500 credit for each verified signup.', 'order' => 5, 'published' => false],
        ];
        foreach ($faqs as $f) {
            Faq::firstOrCreate(['question' => $f['question']], $f);
        }

        $testimonials = [
            ['name' => 'Kelechi Umeh', 'role' => 'Small business owner, Lagos', 'quote' => 'Finally, an app that gets what Nigerian merchants actually need.', 'rating' => 5, 'published' => true, 'avatar' => 'KU', 'order' => 1],
            ['name' => 'Amara Eze', 'role' => 'Student, Abuja', 'quote' => "Groceries, food, pharmacy — all in one place. I don't need 5 apps anymore.", 'rating' => 5, 'published' => true, 'avatar' => 'AE', 'order' => 2],
            ['name' => 'Segun Adeyemi', 'role' => 'Rider, Ibadan', 'quote' => 'The earnings are transparent and the app is smooth. Big win for riders.', 'rating' => 5, 'published' => true, 'avatar' => 'SA', 'order' => 3],
            ['name' => 'Halima Musa', 'role' => 'Diaspora, London', 'quote' => 'I can send groceries to my parents in Kano from London. Game changer.', 'rating' => 5, 'published' => false, 'avatar' => 'HM', 'order' => 4],
        ];
        foreach ($testimonials as $t) {
            Testimonial::firstOrCreate(['name' => $t['name']], $t);
        }
    }
}
