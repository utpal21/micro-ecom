<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Models\User;
use App\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class UserAuthService
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository
    ) {
    }

    public function registerUser(string $name, string $email, string $password): User
    {
        return DB::transaction(function () use ($name, $email, $password): User {
            $user = $this->userRepository->create([
                'name' => $name,
                'email' => Str::lower($email),
                'password' => $password,
            ]);

            $user->assignDefaultRole();

            return $user;
        });
    }

    public function attemptLogin(string $email, string $password): ?User
    {
        $user = $this->userRepository->findByEmail(Str::lower($email));

        if (! $user instanceof User || ! Hash::check($password, $user->password)) {
            if ($user instanceof User) {
                $this->userRepository->recordFailedLoginAttempt($user);
            }

            return null;
        }

        if ($user->isLocked()) {
            // Will let the controller handle HTTP response, but we can throw exception or return state
            // To keep it simple, we check isLocked in controller or throw here. Let's throw an exception
            throw new \RuntimeException('Account temporarily locked.');
        }

        $this->userRepository->resetFailedLoginAttempts($user);

        return $user;
    }
}
