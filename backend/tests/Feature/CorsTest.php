<?php

namespace Tests\Feature;

use Tests\TestCase;

class CorsTest extends TestCase
{
    public function test_login_endpoint_allows_browser_preflight_requests_from_frontend_origin(): void
    {
        $response = $this->withServerVariables([
            'HTTP_ORIGIN' => 'http://127.0.0.1:3000',
        ])->optionsJson('/api/v1/auth/login', [], [
            'Origin' => 'http://127.0.0.1:3000',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'content-type,authorization',
        ]);

        $response->assertStatus(204);
        $response->assertHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3000');
    }
}
