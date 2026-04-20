<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\RefreshToken;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use RuntimeException;

final class RefreshTokenService
{
    /**
     * @return array{plain_text_token: string, model: RefreshToken}
     */
    public function issue(User $user, ?string $ipAddress, ?string $userAgent): array
    {
        $plainTextToken = Str::random(96);

        $token = RefreshToken::query()->create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $plainTextToken),
            'expires_at' => CarbonImmutable::now()->addDays((int) config('auth_tokens.refresh_token_ttl_days')),
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);

        return [
            'plain_text_token' => $plainTextToken,
            'model' => $token,
        ];
    }

    /**
     * @return array{plain_text_token: string, model: RefreshToken}
     */
    public function rotate(string $plainTextToken, ?string $ipAddress, ?string $userAgent): array
    {
        $current = RefreshToken::query()
            ->where('token_hash', hash('sha256', $plainTextToken))
            ->first();

        if (! $current instanceof RefreshToken || $current->isExpired() || $current->isRevoked()) {
            throw new RuntimeException('Refresh token is invalid.');
        }

        $current->forceFill([
            'revoked_at' => CarbonImmutable::now(),
            'last_used_at' => CarbonImmutable::now(),
        ])->save();

        return $this->issue($current->user, $ipAddress, $userAgent);
    }

    public function revokeAllForUser(User $user): void
    {
        RefreshToken::query()
            ->where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->update([
                'revoked_at' => CarbonImmutable::now(),
            ]);
    }
}

