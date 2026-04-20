<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\Auth\JwtService;
use App\Services\Auth\TokenBlacklistService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AuthenticateJwt
{
    public function __construct(
        private readonly JwtService $jwtService,
        private readonly TokenBlacklistService $tokenBlacklistService,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $bearerToken = $request->bearerToken();

        if (! is_string($bearerToken) || $bearerToken === '') {
            return response()->json(['message' => 'Missing bearer token.'], 401);
        }

        try {
            $token = $this->jwtService->parse($bearerToken);
            $this->jwtService->assertValid($token, 'access');
            $claims = $this->jwtService->claims($token);
            $jwtId = $claims['jti'] ?? null;

            if (is_string($jwtId) && $this->tokenBlacklistService->isBlacklisted($jwtId)) {
                return response()->json(['message' => 'Token has been revoked.'], 401);
            }

            $user = User::query()->findOrFail((string) ($claims['sub'] ?? ''));
            $request->attributes->set('jwt_claims', $claims);
            $request->setUserResolver(static fn (): User => $user);
        } catch (\Throwable) {
            return response()->json(['message' => 'Invalid access token.'], 401);
        }

        return $next($request);
    }
}
