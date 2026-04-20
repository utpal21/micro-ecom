<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\User;

interface UserRepositoryInterface
{
    public function create(array $data): User;

    public function findByEmail(string $email): ?User;

    public function recordFailedLoginAttempt(User $user): void;

    public function resetFailedLoginAttempts(User $user): void;
}
