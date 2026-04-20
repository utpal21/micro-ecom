<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\AuthAuditLog;
use App\Models\User;

final class AuthAuditService
{
    /**
     * @param array<string, mixed> $metadata
     */
    public function record(
        string $eventType,
        ?User $user,
        ?string $ipAddress,
        ?string $userAgent,
        array $metadata = [],
    ): void {
        AuthAuditLog::query()->create([
            'user_id' => $user?->id,
            'event_type' => $eventType,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'metadata' => $metadata,
        ]);
    }
}
