<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/sitemap.xml', function () {
    $site = rtrim((string) config('app.frontend_url', config('app.url')), '/');
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    $routes = [
        '/' => '1.0',
        '/about' => '0.8',
        '/careers' => '0.8',
        '/referral-rewards' => '0.8',
        '/privacy' => '0.5',
        '/terms' => '0.5',
        '/cookies' => '0.5',
    ];

    foreach ($routes as $path => $priority) {
        $xml .= "  <url>\n";
        $xml .= '    <loc>' . $site . $path . "</loc>\n";
        $xml .= "    <changefreq>weekly</changefreq>\n";
        $xml .= '    <priority>' . $priority . "</priority>\n";
        $xml .= "  </url>\n";
    }

    $xml .= '</urlset>';

    return response($xml, 200, ['Content-Type' => 'application/xml']);
});

Route::get('/robots.txt', function () {
    $site = rtrim((string) config('app.frontend_url', config('app.url')), '/');
    $txt = "User-agent: *\n";
    $txt .= "Allow: /\n";
    $txt .= "Disallow: /admin/\n";
    $txt .= "Disallow: /api/\n";
    $txt .= "Sitemap: " . $site . "/sitemap.xml\n";

    return response($txt, 200, ['Content-Type' => 'text/plain']);
});
