<?php
/**
 * Convert the raw MyTijaara app screenshots into web-ready WebP assets.
 *
 * Deterministic: same inputs -> same outputs. Run it again after dropping new
 * PNGs into the source directory; it overwrites in place.
 *
 * Usage:
 *   php scripts/optimize-screens.php <source-dir> <dest-dir> [maxWidth] [quality]
 *
 * Source files are matched by the glob `*screen-*.png`. The `dl-` download
 * prefix is stripped so `/tmp/dl-screen-customer-1.png` becomes
 * `screen-customer-1.webp`.
 */

$src = $argv[1] ?? null;
$dest = $argv[2] ?? null;
$maxWidth = (int) ($argv[3] ?? 720);
$quality = (int) ($argv[4] ?? 82);

if (! $src || ! $dest) {
    fwrite(STDERR, "usage: php scripts/optimize-screens.php <source-dir> <dest-dir> [maxWidth] [quality]\n");
    exit(1);
}
if (! is_dir($src)) {
    fwrite(STDERR, "source directory not found: {$src}\n");
    exit(1);
}
if (! function_exists('imagewebp')) {
    fwrite(STDERR, "PHP GD is missing WebP support (imagewebp).\n");
    exit(1);
}
if (! is_dir($dest) && ! mkdir($dest, 0755, true)) {
    fwrite(STDERR, "cannot create destination: {$dest}\n");
    exit(1);
}

$files = glob(rtrim($src, '/\\').'/*screen-*.png') ?: [];
sort($files);

if ($files === []) {
    fwrite(STDERR, "no *screen-*.png files in {$src}\n");
    exit(1);
}

$totalIn = 0;
$totalOut = 0;
$rows = [];

foreach ($files as $file) {
    $name = preg_replace('/^dl-/', '', basename($file, '.png'));
    $out = rtrim($dest, '/\\').'/'.$name.'.webp';

    $image = imagecreatefrompng($file);
    if ($image === false) {
        fwrite(STDERR, "skip (unreadable): {$file}\n");
        continue;
    }

    $w = imagesx($image);
    $h = imagesy($image);

    if ($w > $maxWidth) {
        $newH = (int) round($h * ($maxWidth / $w));
        $resized = imagecreatetruecolor($maxWidth, $newH);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $maxWidth, $newH, $w, $h);
        imagedestroy($image);
        $image = $resized;
        $w = $maxWidth;
        $h = $newH;
    } else {
        imagealphablending($image, false);
        imagesavealpha($image, true);
    }

    if (! imagewebp($image, $out, $quality)) {
        fwrite(STDERR, "failed to write: {$out}\n");
        imagedestroy($image);
        continue;
    }
    imagedestroy($image);

    $in = filesize($file);
    $outSize = filesize($out);
    $totalIn += $in;
    $totalOut += $outSize;
    $rows[] = [$name, $in, $outSize, "{$w}x{$h}"];
}

printf("%-34s %10s %10s %10s\n", 'asset', 'png', 'webp', 'dims');
foreach ($rows as [$name, $in, $outSize, $dims]) {
    printf("%-34s %9.0fK %9.0fK %10s\n", $name, $in / 1024, $outSize / 1024, $dims);
}
printf("\n%d files  %.1fMB -> %.1fMB (%.0f%% smaller)\n",
    count($rows), $totalIn / 1048576, $totalOut / 1048576,
    $totalIn > 0 ? (1 - $totalOut / $totalIn) * 100 : 0);
