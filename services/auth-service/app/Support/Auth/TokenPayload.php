<?php

declare(strict_types=1);

namespace App\Support\Auth;

final readonly class TokenPayload
{
    /**
     * @param list<string> $roles
     * @param list<string> $permissions
     * @param list<string> $scopes
     */
    public function __construct(
        public string $subject,
        public string $audience,
        public string $type,
        public string $jwtId,
        public \DateTimeImmutable $issuedAt,
        public \DateTimeImmutable $expiresAt,
        public array $roles = [],
        public array $permissions = [],
        public array $scopes = [],
    ) {
    }
}
