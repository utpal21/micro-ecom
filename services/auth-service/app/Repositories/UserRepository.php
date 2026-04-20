<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\User;
use Carbon\CarbonImmutable;

final class UserRepository implements UserRepositoryInterface
{
    public function create(array $data): User
    {
        return User::query()->create($data);
    }

    public function findByEmail(string $email): ?User
    {
        return User::query()->where('email', $email)->first();
    }

    public function recordFailedLoginAttempt(User $user): void
    {
        $attempts = $user->failed_login_attempts + 1;
        $lockUntil = $attempts >= 5 ? CarbonImmutable::now()->addMinutes(15) : null;

        $user->forceFill([
            'failed_login_attempts' => $attempts,
            'locked_until' => $lockUntil,
        ])->save();
    }

    public function resetFailedLoginAttempts(User $user): void
    {
        $user->forceFill([
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ])->save();
    }
}
