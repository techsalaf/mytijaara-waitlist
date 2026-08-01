<?php

namespace Database\Seeders;

use App\Models\WaitlistEntry;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class WaitlistSeeder extends Seeder
{
    private int $seed = 42;

    private function rand(): float
    {
        $this->seed = ($this->seed * 9301 + 49297) % 233280;

        return $this->seed / 233280;
    }

    /** @param array<int,mixed> $arr */
    private function pick(array $arr): mixed
    {
        return $arr[(int) floor($this->rand() * count($arr))];
    }

    /**
     * 247 deterministic entries mirroring generateWaitlist() in
     * src/lib/mock-data.ts. Same PRNG seed => stable dataset across runs.
     */
    public function run(): void
    {
        $firstNames = ['Chidi', 'Aisha', 'Emeka', 'Fatima', 'Ibrahim', 'Ngozi', 'Yusuf', 'Adaeze', 'Tunde', 'Zainab', 'Segun', 'Blessing', 'Kelechi', 'Halima', 'Obinna', 'Amara', 'Musa', 'Chinaza', 'Bola', 'Sade', 'Nkechi', 'Femi', 'Rukayat', 'Uche', 'Damilola', 'Kemi', 'Olumide', 'Grace', 'Ifeanyi', 'Hauwa'];
        $lastNames = ['Okonkwo', 'Bello', 'Adeyemi', 'Ibrahim', 'Nwosu', 'Musa', 'Okafor', 'Yakubu', 'Eze', 'Suleiman', 'Adegoke', 'Okoro', 'Lawal', 'Obi', 'Aliyu', 'Balogun', 'Ahmed', 'Onyekachi', 'Sanni', 'Uzoma'];
        $cities = ['Lagos', 'Abuja', 'Kano', 'Port Harcourt', 'Ibadan', 'Benin City', 'Kaduna', 'Enugu', 'Jos', 'Owerri', 'Uyo', 'Warri', 'Abeokuta', 'Ilorin', 'Onitsha'];
        $states = ['Lagos', 'FCT', 'Kano', 'Rivers', 'Oyo', 'Edo', 'Kaduna', 'Enugu', 'Plateau', 'Imo', 'Akwa Ibom', 'Delta', 'Ogun', 'Kwara', 'Anambra'];
        $sources = ['organic', 'referral', 'instagram', 'twitter', 'facebook', 'tiktok', 'google'];
        $devices = ['iOS', 'Android', 'Web'];
        $browsers = ['Chrome', 'Safari', 'Firefox', 'Edge'];
        $countries = ['Nigeria', 'Nigeria', 'Nigeria', 'Ghana', 'United Kingdom', 'United States'];
        $statuses = ['active', 'active', 'active', 'active', 'invited', 'onboarded', 'unsubscribed'];
        $tagPool = ['early-bird', 'vip', 'influencer', 'vendor', 'rider', 'power-user', 'beta-tester', 'student', 'diaspora'];
        $domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];

        $rows = [];
        $now = now();
        for ($i = 0; $i < 247; $i++) {
            $first = $this->pick($firstNames);
            $last = $this->pick($lastNames);
            $cityIdx = (int) floor($this->rand() * count($cities));
            $daysAgo = (int) floor($this->rand() * 90);

            $tagCount = (int) floor($this->rand() * 3);
            $tags = [];
            for ($t = 0; $t < $tagCount; $t++) {
                $tag = $this->pick($tagPool);
                if (! in_array($tag, $tags, true)) {
                    $tags[] = $tag;
                }
            }

            $emailNum = (int) floor($this->rand() * 99);
            $domain = $this->pick($domains);
            $this->rand(); // phone-a
            $this->rand(); // phone-b
            $status = $this->pick($statuses);
            $verified = $this->rand() > 0.25;
            $referrals = (int) floor($this->rand() * $this->rand() * 40);
            $source = $this->pick($sources);
            $device = $this->pick($devices);
            $hasNotes = $this->rand() > 0.8;
            $lastActiveDays = (int) floor($this->rand() * max(1, $daysAgo));

            $joinedAt = $now->copy()->subDays($daysAgo);

            $rows[] = [
                'public_id' => 'wl_'.str_pad((string) ($i + 1), 5, '0', STR_PAD_LEFT),
                'name' => "$first $last",
                'email' => strtolower($first).'.'.strtolower($last).$emailNum.'.'.($i + 1).'@'.$domain,
                'phone' => '+234'.(700 + $i % 200).str_pad((string) (1000000 + $i * 811 % 8999999), 7, '0', STR_PAD_LEFT),
                'city' => $cities[$cityIdx],
                'state' => $states[$cityIdx],
                'role' => $this->pick(['customer', 'customer', 'vendor', 'rider', 'artisan']),
                'status' => $status,
                'verified' => $verified,
                'verified_at' => $verified ? $joinedAt->copy()->addHours(2) : null,
                'referral_code' => strtoupper(Str::random(8)),
                'referrals' => $referrals,
                'position' => $i + 1,
                'source' => $source,
                'device' => $device,
                'browser' => $this->pick($browsers),
                'country' => $this->pick($countries),
                'tags' => json_encode($tags),
                'notes' => $hasNotes ? 'Reached out about vendor onboarding' : null,
                'ip_hash' => hash('sha256', 'seed-ip-'.$i),
                'joined_at_sort' => $joinedAt,
                'last_active_at' => $now->copy()->subDays($lastActiveDays),
                'created_at' => $joinedAt,
                'updated_at' => $joinedAt,
            ];
        }

        // Sort newest-first like the frontend, then reassign position.
        usort($rows, fn ($a, $b) => $b['joined_at_sort']->timestamp <=> $a['joined_at_sort']->timestamp);
        foreach ($rows as $idx => &$row) {
            $row['position'] = $idx + 1;
            unset($row['joined_at_sort']);
        }
        unset($row);

        foreach (array_chunk($rows, 100) as $chunk) {
            WaitlistEntry::insert($chunk);
        }
    }
}
