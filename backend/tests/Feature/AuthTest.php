<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('login:127.0.0.1');
    }

    public function test_login_with_valid_credentials_returns_token_and_user(): void
    {
        $user = User::factory()->create([
            'email' => 'admin@mytijaara.test',
            'password' => Hash::make('password123'),
            'status' => 'active',
        ]);

        $response = $this->postJson("{$this->api}/auth/login", [
            'email' => 'admin@mytijaara.test',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'name', 'email', 'role', 'status']]]);

        $this->assertNotEmpty($response->json('data.token'));
        $this->assertSame('u_'.$user->id, $response->json('data.user.id'));
    }

    public function test_login_with_invalid_credentials_returns_422(): void
    {
        User::factory()->create([
            'email' => 'admin@mytijaara.test',
            'password' => Hash::make('password123'),
        ]);

        $this->postJson("{$this->api}/auth/login", [
            'email' => 'admin@mytijaara.test',
            'password' => 'wrong-password',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_login_missing_fields_returns_422(): void
    {
        $this->postJson("{$this->api}/auth/login", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_inactive_account_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'inactive@mytijaara.test',
            'password' => Hash::make('password123'),
            'status' => 'invited',
        ]);

        $this->postJson("{$this->api}/auth/login", [
            'email' => 'inactive@mytijaara.test',
            'password' => 'password123',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_login_is_rate_limited_after_five_attempts(): void
    {
        User::factory()->create([
            'email' => 'admin@mytijaara.test',
            'password' => Hash::make('password123'),
        ]);

        // Five failed attempts each register a hit (returns 422).
        for ($i = 0; $i < 5; $i++) {
            $this->postJson("{$this->api}/auth/login", [
                'email' => 'admin@mytijaara.test',
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        // The sixth request trips the limiter.
        $this->postJson("{$this->api}/auth/login", [
            'email' => 'admin@mytijaara.test',
            'password' => 'password123',
        ])->assertStatus(429);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson("{$this->api}/auth/me")->assertStatus(401);
    }

    public function test_me_returns_current_user_when_authenticated(): void
    {
        $user = $this->actingAsRole('super_admin', ['name' => 'Ada Okafor']);

        $this->getJson("{$this->api}/auth/me")
            ->assertStatus(200)
            ->assertJsonPath('data.id', 'u_'.$user->id)
            ->assertJsonPath('data.name', 'Ada Okafor')
            ->assertJsonPath('data.role', 'Super Admin');
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $user = User::factory()->create([
            'email' => 'admin@mytijaara.test',
            'password' => Hash::make('password123'),
            'status' => 'active',
        ]);

        $token = $this->postJson("{$this->api}/auth/login", [
            'email' => 'admin@mytijaara.test',
            'password' => 'password123',
        ])->json('data.token');

        // Token works before logout.
        $this->withToken($token)->getJson("{$this->api}/auth/me")->assertStatus(200);

        $this->withToken($token)->postJson("{$this->api}/auth/logout")->assertStatus(200);

        // Token is dead afterwards.
        $this->assertSame(0, $user->tokens()->count());
        // A production request gets a fresh auth guard. Laravel keeps the
        // request guard singleton between in-process test requests, so reset
        // it before asserting the token cannot authenticate a new request.
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson("{$this->api}/auth/me")->assertStatus(401);
    }

    public function test_api_guests_receive_json_401_without_an_accept_header(): void
    {
        $this->get("{$this->api}/auth/me")
            ->assertStatus(401)
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_password_reset_updates_credentials_and_revokes_existing_tokens(): void
    {
        $user = User::factory()->create([
            'email' => 'reset@mytijaara.test',
            'password' => Hash::make('old-password'),
            'status' => 'active',
        ]);
        $token = Password::broker()->createToken($user);
        $user->createToken('existing-token');

        $this->postJson("{$this->api}/auth/reset-password", [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
        ])->assertOk()->assertJsonPath('data.success', true);

        $this->assertTrue(Hash::check('NewPass123!', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_forgot_password_does_not_disclose_whether_an_account_exists(): void
    {
        User::factory()->create(['email' => 'reset@mytijaara.test']);
        Notification::fake();

        $this->postJson("{$this->api}/auth/forgot-password", ['email' => 'reset@mytijaara.test'])
            ->assertOk()->assertJsonPath('data.success', true);
        $this->postJson("{$this->api}/auth/forgot-password", ['email' => 'missing@mytijaara.test'])
            ->assertOk()->assertJsonPath('data.success', true);
    }

    public function test_local_frontend_origin_can_preflight_the_login_endpoint(): void
    {
        $this->call('OPTIONS', "{$this->api}/auth/login", [], [], [], [
            'HTTP_ORIGIN' => 'http://127.0.0.1:3000',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ])->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3000');
    }
}
