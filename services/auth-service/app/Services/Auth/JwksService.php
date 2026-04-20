<?php

declare(strict_types=1);

namespace App\Services\Auth;

final class JwksService
{
    public function __construct(
        private readonly JwtService $jwtService,
    ) {
    }

    /**
     * @return array{keys: list<array<string, string>>}
     */
    public function document(): array
    {
        $resource = openssl_pkey_get_public($this->jwtService->publicKeyContents());
        $details = $resource !== false ? openssl_pkey_get_details($resource) : false;

        if ($details === false || ! isset($details['rsa'])) {
            throw new \RuntimeException('Unable to parse RSA public key details.');
        }

        return [
            'keys' => [[
                'kty' => 'RSA',
                'use' => 'sig',
                'alg' => 'RS256',
                'kid' => $this->jwtService->keyId(),
                'n' => $this->base64UrlEncode($details['rsa']['n']),
                'e' => $this->base64UrlEncode($details['rsa']['e']),
            ]],
        ];
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}

