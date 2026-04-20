# EMP Auth Service

Laravel 13 service for:

- user registration and login
- RS256 JWT issuance
- refresh token rotation
- JWKS public key publishing
- RBAC with Spatie permissions
- audit logging for auth events

## Local Notes

- Database: PostgreSQL (`emp-postgres-auth`)
- Cache and blacklist store: Redis
- JWT keys are file-based and must not be committed

## Useful Commands

Generate JWT keys:

```bash
php artisan auth:generate-jwt-keypair
```

Run tests:

```bash
php artisan test
```

## OpenAPI

The initial OpenAPI definition is stored in `docs/openapi.yaml`.
