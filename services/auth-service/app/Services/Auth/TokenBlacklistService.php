<?php

declare(strict_types=1);

namespace App\Services\Auth;

use Illuminate\Support\Facades\Cache;

final class TokenBlacklistService
{
    public function blacklist(string $jwtId, int $ttlSeconds): void
    {
        Cache::store((string) config('auth_tokens.blacklist_store'))->put(
            $this->key($jwtId),
            true,
            max($ttlSeconds, 1),
        );
    }

    public function isBlacklisted(string $jwtId): bool
    {
        return Cache::store((string) config('auth_tokens.blacklist_store'))->has($this->key($jwtId));
    }

    private function key(string $jwtId): string
    {
        return sprintf('token:blacklisted:%s', $jwtId);
    }
}
