<?php

declare(strict_types=1);

return [
    'issuer' => env('JWT_ISSUER', 'http://localhost:8001'),
    'platform_audience' => env('JWT_PLATFORM_AUDIENCE', 'emp-platform'),
    'access_token_ttl_minutes' => (int) env('JWT_ACCESS_TOKEN_TTL_MINUTES', 15),
    'refresh_token_ttl_days' => (int) env('JWT_REFRESH_TOKEN_TTL_DAYS', 7),
    'private_key_path' => env('JWT_PRIVATE_KEY_PATH') ? storage_path(env('JWT_PRIVATE_KEY_PATH')) : null,
    'public_key_path' => env('JWT_PUBLIC_KEY_PATH') ? storage_path(env('JWT_PUBLIC_KEY_PATH')) : null,
    'service_api_key' => env('SERVICE_TOKEN_API_KEY'),
    'blacklist_store' => env('JWT_BLACKLIST_STORE', 'redis'),
];