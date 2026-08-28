<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Caching and indexing posture for the data room admin surface.
 *
 * These responses carry visitor names, email addresses, organizations, grant
 * scope and document metadata. None of it may sit in a shared cache or a proxy,
 * and none of it may be crawled if an operator's browser is ever behind
 * something that follows links. The visitor side already gets this from
 * DataRoomAuthenticate; the admin side is under `auth:sanctum` instead, so it
 * needs its own.
 *
 * This is posture, not authorization. Every endpoint keeps its own
 * `permission:data-room.*` gate; nothing here decides who may call what.
 *
 * It runs as the outermost global middleware and decides for itself whether the
 * request is in scope, rather than being attached to the route group. Route
 * middleware cannot reach a 401 or a 403: `Illuminate\Pipeline\Pipeline` wraps
 * each pipe in its own try/catch, so an AuthenticationException thrown by
 * `auth:sanctum` is rendered by the pipe enclosing this one and the code after
 * `$next()` never runs. A refusal is exactly the response a proxy is most willing
 * to keep, and it names nothing useful only because the envelope is generic, so
 * it is the case that most needs the header.
 *
 * A controller that already said `no-store` keeps its own value. The streaming
 * preview endpoint does that for the body it sends, and overwriting a deliberate
 * choice from here would be the wrong precedence. Anything else is replaced:
 * Symfony's own default for a JSON response is `no-cache, private`, which still
 * permits a store, so an absent header is not the case to look for.
 */
class DataRoomAdminNoStore
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $this->inScope($request)) {
            return $response;
        }

        if (! $response->headers->hasCacheControlDirective('no-store')) {
            $response->headers->set('Cache-Control', 'private, no-store, max-age=0');
        }

        if (! $response->headers->has('X-Robots-Tag')) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        }

        return $response;
    }

    /**
     * The admin data room surface, under whatever API prefix is configured.
     *
     * Matched on the path rather than on the route, because an unmatched path
     * under this prefix (a 404 from a typo) should be treated the same way: it is
     * still a response about the data room reaching a browser.
     */
    private function inScope(Request $request): bool
    {
        return $request->is('api/*/admin/dataroom', 'api/*/admin/dataroom/*');
    }
}
