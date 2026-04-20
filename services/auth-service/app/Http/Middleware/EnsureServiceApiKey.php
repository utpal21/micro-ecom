<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureServiceApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $provided = $request->header('X-Service-Api-Key');
        $expected = config('auth_tokens.service_api_key');

        if (! is_string($provided) || $provided === '' || ! is_string($expected) || $expected === '' || ! hash_equals($expected, $provided)) {
            return response()->json(['message' => 'Invalid service API key.'], 401);
        }

        return $next($request);
    }
}
