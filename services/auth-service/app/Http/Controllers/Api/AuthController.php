<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\PasswordResetLinkRequest;
use App\Http\Requests\RefreshTokenRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\ServiceTokenRequest;
use App\Models\User;
use App\Services\Auth\AuthAuditService;
use App\Services\Auth\JwtService;
use App\Services\Auth\RefreshTokenService;
use App\Services\Auth\TokenBlacklistService;
use App\Services\Auth\UserAuthService;
use App\Support\Auth\TokenPayload;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * @OA\Info(
 *     title="EMP Auth Service API",
 *     version="0.1.0",
 *     description="Authentication and authorization service for Enterprise Marketplace platform",
 *     @OA\Contact(
 *         name="Engineering Team",
 *         email="engineering@enterprise-marketplace.com"
 *     )
 * )
 * 
 * @OA\Server(
 *     url="http://localhost:8001/api",
 *     description="Local development server"
 * )
 * 
 * @OA\Server(
 *     url="https://auth.emp-marketplace.com/api",
 *     description="Production server"
 * )
 * 
 * @OA\Tag(
 *     name="Health",
 *     description="Health check endpoints"
 * )
 * 
 * @OA\Tag(
 *     name="Auth",
 *     description="Authentication endpoints"
 * )
 * 
 * @OA\Tag(
 *     name="JWKS",
 *     description="JWT public keys"
 * )
 * 
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="JWT token obtained from login endpoint"
 * )
 */
final class AuthController extends Controller
{
    public function __construct(
        private readonly JwtService $jwtService,
        private readonly RefreshTokenService $refreshTokenService,
        private readonly TokenBlacklistService $tokenBlacklistService,
        private readonly AuthAuditService $authAuditService,
        private readonly UserAuthService $userAuthService,
    ) {
    }

    /**
     * @OA\Post(
     *     path="/api/auth/register",
     *     tags={"Auth"},
     *     summary="Register a new user",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name","email","password"},
     *             @OA\Property(property="name", type="string", example="John Doe"),
     *             @OA\Property(property="email", type="string", format="email", example="john@example.com"),
     *             @OA\Property(property="password", type="string", format="password", example="Secret123!")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Resource created Successfully"),
     *     @OA\Response(response=422, description="Validation Error")
     * )
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->userAuthService->registerUser(
            $request->string('name')->toString(),
            $request->string('email')->toString(),
            $request->string('password')->toString()
        );

        $this->authAuditService->record('auth.registered', $user, $request->ip(), $request->userAgent());

        return response()->json($this->tokenResponse($user, $request), Response::HTTP_CREATED);
    }

    /**
     * @OA\Post(
     *     path="/api/auth/login",
     *     tags={"Auth"},
     *     summary="Login user",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email","password"},
     *             @OA\Property(property="email", type="string", format="email", example="john@example.com"),
     *             @OA\Property(property="password", type="string", format="password", example="Secret123!")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Logged in successfully"),
     *     @OA\Response(response=401, description="Invalid credentials"),
     *     @OA\Response(response=423, description="Account temporarily locked")
     * )
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $user = $this->userAuthService->attemptLogin(
                $request->string('email')->toString(),
                $request->string('password')->toString()
            );

            if (! $user instanceof User) {
                return response()->json(['message' => 'Invalid credentials.'], 401);
            }
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 423);
        }

        $this->authAuditService->record('auth.logged_in', $user, $request->ip(), $request->userAgent());

        return response()->json($this->tokenResponse($user, $request));
    }

    public function refresh(RefreshTokenRequest $request): JsonResponse
    {
        $rotated = $this->refreshTokenService->rotate(
            $request->string('refresh_token')->toString(),
            $request->ip(),
            $request->userAgent(),
        );

        $refreshToken = $rotated['model'];
        $user = $refreshToken->user;

        $this->authAuditService->record('auth.refreshed', $user, $request->ip(), $request->userAgent());

        return response()->json($this->tokenResponse($user, $request, $rotated['plain_text_token']));
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        /** @var array<string, mixed> $claims */
        $claims = $request->attributes->get('jwt_claims', []);

        $expiry = $claims['exp'] ?? null;
        $jwtId = $claims['jti'] ?? null;

        if (is_object($expiry) && method_exists($expiry, 'getTimestamp') && is_string($jwtId)) {
            $ttl = max($expiry->getTimestamp() - time(), 1);
            $this->tokenBlacklistService->blacklist($jwtId, $ttl);
        }

        $this->refreshTokenService->revokeAllForUser($user);
        $this->authAuditService->record('auth.logged_out', $user, $request->ip(), $request->userAgent());

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames()->values()->all(),
                'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            ],
        ]);
    }

    public function sendPasswordResetLink(PasswordResetLinkRequest $request): JsonResponse
    {
        $status = Password::sendResetLink([
            'email' => $request->string('email')->toString(),
        ]);

        return response()->json([
            'message' => __($status),
        ]);
    }

    public function serviceToken(ServiceTokenRequest $request): JsonResponse
    {
        $issuedAt = CarbonImmutable::now();
        $expiresAt = $issuedAt->addHour();

        $token = $this->jwtService->issue(new TokenPayload(
            subject: $request->string('service_name')->toString(),
            audience: $request->string('target_audience')->toString(),
            type: 'service',
            jwtId: (string) Str::uuid(),
            issuedAt: $issuedAt,
            expiresAt: $expiresAt,
            scopes: $request->collect('scopes')->filter(static fn (mixed $scope): bool => is_string($scope))->values()->all(),
        ));

        return response()->json([
            'token_type' => 'Bearer',
            'access_token' => $token,
            'expires_in' => $expiresAt->diffInSeconds($issuedAt),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function tokenResponse(User $user, Request $request, ?string $existingRefreshToken = null): array
    {
        $issuedAt = CarbonImmutable::now();
        $expiresAt = $issuedAt->addMinutes((int) config('auth_tokens.access_token_ttl_minutes'));

        $accessToken = $this->jwtService->issue(new TokenPayload(
            subject: $user->id,
            audience: (string) config('auth_tokens.platform_audience'),
            type: 'access',
            jwtId: (string) Str::uuid(),
            issuedAt: $issuedAt,
            expiresAt: $expiresAt,
            roles: $user->getRoleNames()->values()->all(),
            permissions: $user->getAllPermissions()->pluck('name')->values()->all(),
        ));

        $refreshToken = $existingRefreshToken;

        if (! is_string($refreshToken)) {
            $issuedRefreshToken = $this->refreshTokenService->issue($user, $request->ip(), $request->userAgent());
            $refreshToken = $issuedRefreshToken['plain_text_token'];
        }

        return [
            'token_type' => 'Bearer',
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in' => $expiresAt->diffInSeconds($issuedAt),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames()->values()->all(),
                'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            ],
        ];
    }
}