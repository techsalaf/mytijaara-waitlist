<?php

namespace Database\Seeders;

use App\Models\MediaFile;
use Illuminate\Database\Seeder;

class MediaSeeder extends Seeder
{
    /** 42 media files mirroring src/lib/mock-data.ts. Deterministic sizes. */
    public function run(): void
    {
        $names = ['hero-lagos', 'artisan-plumber', 'grocery-basket', 'food-jollof', 'vendor-store', 'rider-bike', 'pharmacy-shelf', 'customer-happy', 'delivery-parcel', 'shopping-bag'];
        $folders = ['Marketing', 'Product', 'Hero', 'Blog', 'Uncategorized'];

        for ($i = 0; $i < 42; $i++) {
            $type = $i % 7 === 0 ? 'video' : ($i % 11 === 0 ? 'document' : 'image');
            $ext = $type === 'video' ? 'mp4' : ($type === 'document' ? 'pdf' : 'jpg');
            $mime = $type === 'video' ? 'video/mp4' : ($type === 'document' ? 'application/pdf' : 'image/jpeg');

            MediaFile::firstOrCreate(['public_id' => "media_".($i + 1)], [
                'name' => $names[$i % 10]."-".($i + 1).".".$ext,
                'type' => $type,
                'mime' => $mime,
                // Deterministic size in KB range (no random — seedable).
                'size' => (120 + ($i * 137) % 4800) * 1024,
                'folder' => $folders[$i % 5],
                'disk' => 'public',
                'path' => '',
                'url' => "https://picsum.photos/seed/mt{$i}/600/400",
                'dimensions' => $type === 'video' ? '1920x1080' : '1600x900',
                'metadata' => [],
            ]);
        }
    }
}
