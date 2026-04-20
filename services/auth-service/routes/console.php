<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Artisan;

Artisan::command('auth:generate-jwt-keypair {--force : Overwrite existing key files}', function (): int {
    $privateKeyPath = (string) config('auth_tokens.private_key_path');
    $publicKeyPath = (string) config('auth_tokens.public_key_path');

    if ($privateKeyPath === '' || $publicKeyPath === '') {
        $this->error('JWT key paths are not configured.');

        return self::FAILURE;
    }

    if (! $this->option('force') && (File::exists($privateKeyPath) || File::exists($publicKeyPath))) {
        $this->error('JWT key files already exist. Use --force to overwrite them.');

        return self::FAILURE;
    }

    File::ensureDirectoryExists(dirname($privateKeyPath));
    File::ensureDirectoryExists(dirname($publicKeyPath));

    $resource = openssl_pkey_new([
        'private_key_bits' => 4096,
        'private_key_type' => OPENSSL_KEYTYPE_RSA,
    ]);

    if ($resource === false) {
        $this->error('Unable to generate RSA keypair.');

        return self::FAILURE;
    }

    openssl_pkey_export($resource, $privateKey);
    $publicDetails = openssl_pkey_get_details($resource);
    $publicKey = $publicDetails['key'] ?? null;

    if (! is_string($publicKey) || $publicKey === '') {
        $this->error('Unable to extract public key.');

        return self::FAILURE;
    }

    File::put($privateKeyPath, $privateKey);
    File::put($publicKeyPath, $publicKey);

    $this->info('JWT keypair generated successfully.');
    $this->line(sprintf('Private key: %s', $privateKeyPath));
    $this->line(sprintf('Public key: %s', $publicKeyPath));

    return self::SUCCESS;
})->purpose('Generate the Auth service RS256 JWT keypair');
