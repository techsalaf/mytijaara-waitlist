<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Ensure the local Vite and dev origins can reach the API from the browser.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $origin = (string) $request->headers->get('Origin', '');
        $isApiRequest = $request->is('api/*') || $request->is('sanctum/csrf-cookie');

        if (! $isApiRequest || $origin === '') {
            return $next($request);
        }

        logger()->info('CorsMiddleware invoked', [
            'origin' => $origin,
            'path' => $request->path(),
            'method' => $request->method(),
        ]);

        $allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:8080',
            'http://127.0.0.1:8080',
        ];

        if (! in_array($origin, $allowedOrigins, true)) {
            return $next($request);
        }

        $response = $next($request);

        $response->headers->set('X-Debug-Cors', 'custom-middleware');
        $response->headers->set('X-Debug-Cors-Origin', $origin);
        $response->headers->set('Access-Control-Allow-Origin', $origin);
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Credentials', 'false');
        $response->headers->set('Vary', 'Origin, Access-Control-Request-Method');

        if ($request->getMethod() === 'OPTIONS') {
            $response->setStatusCode(204);
            $response->headers->set('Access-Control-Max-Age', '86400');
        }

        @file_put_contents(storage_path('logs/cors-debug.log'), date('c').' '.json_encode(['origin'=>$origin,'path'=>$request->path(),'method'=>$request->method(),'status'=>$response->getStatusCode()])."\n", FILE_APPEND);

        return $response;
    }
}
