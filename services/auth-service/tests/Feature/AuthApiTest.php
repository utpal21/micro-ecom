<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

final class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('cache.default', 'array');
        config()->set('session.driver', 'array');
        config()->set('queue.default', 'sync');
        config()->set('permission.cache.store', 'array');
        config()->set('auth_tokens.service_api_key', 'test-service-api-key');
        config()->set('auth_tokens.blacklist_store', 'array');

        $this->seed(RolePermissionSeeder::class);
        $this->createJwtKeypair();
    }

    public function test_registration_returns_access_and_refresh_tokens(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Alice Example',
            'email' => 'alice@example.com',
            'password' => 'very-secure-password',
        ]);

        $response
            ->assertCreated()
            ->assertJsonStructure([
                'token_type',
                'access_token',
                'refresh_token',
                'expires_in',
                'user' => ['id', 'email', 'roles', 'permissions'],
            ]);
    }

    public function test_login_and_me_flow_are_available(): void
    {
        $user = User::query()->create([
            'name' => 'Bob Example',
            'email' => 'bob@example.com',
            'password' => 'very-secure-password',
        ]);
        $user->assignDefaultRole();

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'bob@example.com',
            'password' => 'very-secure-password',
        ]);

        $token = $loginResponse->json('access_token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'bob@example.com');
    }

    public function test_refresh_rotates_refresh_token(): void
    {
        $user = User::query()->create([
            'name' => 'Carol Example',
            'email' => 'carol@example.com',
            'password' => 'very-secure-password',
        ]);
        $user->assignDefaultRole();

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'carol@example.com',
            'password' => 'very-secure-password',
        ]);

        $refreshResponse = $this->postJson('/api/auth/refresh', [
            'refresh_token' => $loginResponse->json('refresh_token'),
        ]);

        $refreshResponse
            ->assertOk()
            ->assertJsonStructure(['access_token', 'refresh_token'])
            ->assertJsonMissingExact([
                'refresh_token' => $loginResponse->json('refresh_token'),
            ]);
    }

    public function test_jwks_endpoint_returns_key_document(): void
    {
        $this->getJson('/api/.well-known/jwks.json')
            ->assertOk()
            ->assertJsonStructure([
                'keys' => [['kty', 'use', 'alg', 'kid', 'n', 'e']],
            ]);
    }

    public function test_service_token_endpoint_requires_service_api_key(): void
    {
        $this->postJson('/api/auth/service-token', [
            'service_name' => 'order-service',
            'target_audience' => 'emp-inventory-service',
            'scopes' => ['inventory.reserve'],
        ])->assertUnauthorized();

        $this->withHeader('X-Service-Api-Key', 'test-service-api-key')
            ->postJson('/api/auth/service-token', [
                'service_name' => 'order-service',
                'target_audience' => 'emp-inventory-service',
                'scopes' => ['inventory.reserve'],
            ])
            ->assertOk()
            ->assertJsonStructure(['token_type', 'access_token', 'expires_in']);
    }

    private function createJwtKeypair(): void
    {
        $directory = storage_path('app/testing-keys');
        File::ensureDirectoryExists($directory);

        $resource = openssl_pkey_new([
            'private_key_bits' => 4096,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);

        openssl_pkey_export($resource, $privateKey);
        $publicDetails = openssl_pkey_get_details($resource);
        $publicKey = $publicDetails['key'];

        File::put($directory.'/jwt-private.pem', $privateKey);
        File::put($directory.'/jwt-public.pem', $publicKey);

        config()->set('auth_tokens.private_key_path', $directory.'/jwt-private.pem');
        config()->set('auth_tokens.public_key_path', $directory.'/jwt-public.pem');
        config()->set('auth_tokens.issuer', 'http://localhost:8001');
        config()->set('auth_tokens.platform_audience', 'emp-platform');
    }
}
