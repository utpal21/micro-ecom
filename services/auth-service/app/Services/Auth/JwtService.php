<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Support\Auth\TokenPayload;
use Illuminate\Support\Arr;
use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Signer\Rsa\Sha256;
use Lcobucci\JWT\Token\RegisteredClaims;
use Lcobucci\JWT\Token\Plain;
use RuntimeException;

final class JwtService
{
    private ?Configuration $configuration = null;

    public function issue(TokenPayload $payload): string
    {
        $token = $this->configuration()
            ->builder()
            ->issuedBy(config('auth_tokens.issuer'))
            ->permittedFor($payload->audience)
            ->relatedTo($payload->subject)
            ->identifiedBy($payload->jwtId)
            ->issuedAt($payload->issuedAt)
            ->canOnlyBeUsedAfter($payload->issuedAt)
            ->expiresAt($payload->expiresAt)
            ->withHeader('kid', $this->keyId())
            ->withClaim('type', $payload->type)
            ->withClaim('roles', $payload->roles)
            ->withClaim('permissions', $payload->permissions)
            ->withClaim('scopes', $payload->scopes)
            ->getToken($this->configuration()->signer(), $this->configuration()->signingKey());

        return $token->toString();
    }

    public function parse(string $token): Plain
    {
        $parsed = $this->configuration()->parser()->parse($token);

        if (! $parsed instanceof Plain) {
            throw new RuntimeException('Invalid token type.');
        }

        return $parsed;
    }

    public function assertValid(Plain $token, string $expectedType): void
    {
        $constraints = [
            new \Lcobucci\JWT\Validation\Constraint\SignedWith(
                $this->configuration()->signer(),
                $this->configuration()->verificationKey(),
            ),
        ];

        if (! $this->configuration()->validator()->validate($token, ...$constraints)) {
            throw new RuntimeException('Token validation failed.');
        }

        if ($token->claims()->get(RegisteredClaims::ISSUER) !== config('auth_tokens.issuer')) {
            throw new RuntimeException('Unexpected token issuer.');
        }

        $issuedAt = $token->claims()->get(RegisteredClaims::ISSUED_AT);
        $expiresAt = $token->claims()->get(RegisteredClaims::EXPIRATION_TIME);
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));

        if ($issuedAt > $now || $expiresAt <= $now) {
            throw new RuntimeException('Token is outside its validity window.');
        }

        if ($token->claims()->get('type') !== $expectedType) {
            throw new RuntimeException('Unexpected token type.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function claims(Plain $token): array
    {
        return [
            'iss' => $token->claims()->get(RegisteredClaims::ISSUER),
            'sub' => $token->claims()->get(RegisteredClaims::SUBJECT),
            'aud' => $token->claims()->get(RegisteredClaims::AUDIENCE),
            'jti' => $token->claims()->get(RegisteredClaims::ID),
            'iat' => $token->claims()->get(RegisteredClaims::ISSUED_AT),
            'exp' => $token->claims()->get(RegisteredClaims::EXPIRATION_TIME),
            'type' => $token->claims()->get('type'),
            'roles' => Arr::wrap($token->claims()->get('roles')),
            'permissions' => Arr::wrap($token->claims()->get('permissions')),
            'scopes' => Arr::wrap($token->claims()->get('scopes')),
        ];
    }

    public function keyId(): string
    {
        return sha1($this->publicKeyContents());
    }

    public function publicKeyContents(): string
    {
        $path = config('auth_tokens.public_key_path');
        $contents = is_string($path) ? @file_get_contents($path) : false;

        if ($contents === false) {
            throw new RuntimeException('Public key file is missing.');
        }

        return $contents;
    }

    private function privateKeyContents(): string
    {
        $path = config('auth_tokens.private_key_path');
        $contents = is_string($path) ? @file_get_contents($path) : false;

        if ($contents === false) {
            throw new RuntimeException('Private key file is missing.');
        }

        return $contents;
    }

    private function configuration(): Configuration
    {
        if ($this->configuration !== null) {
            return $this->configuration;
        }

        $this->configuration = Configuration::forAsymmetricSigner(
            new Sha256(),
            InMemory::plainText($this->privateKeyContents()),
            InMemory::plainText($this->publicKeyContents()),
        );

        return $this->configuration;
    }
}
