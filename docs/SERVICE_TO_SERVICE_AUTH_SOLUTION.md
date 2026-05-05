# Service-to-Service Authentication Implementation

## Problem Statement

The admin-service needed to communicate with the product-service to fetch and manage products, but the product-service only accepted user JWT tokens authenticated by the auth-service via JWKS (JSON Web Key Set). This prevented direct service-to-service communication, which is required for the admin dashboard to function properly.

## Solution Overview

Implemented a dual-token authentication system that allows product-service to accept both:
1. **User tokens** - Authenticated by auth-service via JWKS (existing)
2. **Service tokens** - Signed with RSA keys for service-to-service communication (new)

## Architecture

```
┌─────────────────┐
│  admin-service  │
│                 │
│  ServiceToken   │
│    Client       │
└────────┬────────┘
         │ 1. Sign with RSA-256
         │    Private Key
         ▼
┌─────────────────┐
│ product-service │
│                 │
│  JwtAuthGuard  │
│                 │
│  - Try JWKS    │
│  - Try RSA PK   │
└─────────────────┘
```

## Implementation Details

### 1. Admin-Service Changes

#### ServiceTokenClient Service
**File:** `services/admin-service/src/infrastructure/auth/service-token-client.service.ts`

A new service that generates and manages service tokens:
- Generates RS256-signed JWTs using RSA private key
- Includes service name, target audience, scopes, and expiration
- Caches tokens to reduce signing operations
- Automatically refreshes tokens before expiry

#### ServiceAuthModule
**File:** `services/admin-service/src/infrastructure/auth/auth.module.ts`

New module that:
- Configures the ServiceTokenClient as a provider
- Exports it for use by other modules (e.g., products module)
- Loads RSA private key from environment variable

#### ProductModule Updates
**File:** `services/admin-service/src/modules/products/product.module.ts`

Modified to:
- Import ServiceAuthModule
- Inject ServiceTokenClient into ProductService
- Use it to get service tokens for API calls

#### App Module Registration
**File:** `services/admin-service/src/app.module.ts`

- Added ServiceAuthModule to imports list

#### Environment Variables
**File:** `services/admin-service/.env`

Added configuration:
```bash
# Service Authentication
SERVICE_NAME=admin-service
SERVICE_TOKEN_TTL=3600
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCj7IUrSzGRqz3H
[... full key ...]
-----END PRIVATE KEY-----"
```

### 2. Product-Service Changes

#### JwtAuthGuard Enhancement
**File:** `services/product-service/src/common/guards/jwt-auth.guard.ts`

Enhanced to support dual-token verification:

1. **First attempt:** Try to verify as user token via JWKS (existing behavior)
   - Uses auth-service's JWKS endpoint
   - Validates issuer and audience
   - Sets `request.authType = 'user'`

2. **Fallback:** Try to verify as service token via RSA public key
   - Uses admin-service's RSA public key
   - Validates service name and target audience
   - Sets `request.authType = 'service'`
   - Adds `request.service` with name and scopes

```typescript
// Guard logic flow:
try {
  // Try user token (JWKS)
  const { payload } = await jwtVerify(token, this.jwksCache, {...});
  request.user = payload;
  request.authType = 'user';
  return true;
} catch (userTokenError) {
  // Try service token (RSA)
  if (this.adminPublicKey) {
    const decoded = jwtVerifyLegacy(token, this.adminPublicKey, {...});
    if (decoded.service_name === 'admin-service' && 
        decoded.target_audience === 'product-service') {
      request.user = decoded;
      request.authType = 'service';
      request.service = { name, scopes };
      return true;
    }
  }
}
```

#### ConfigService Updates
**File:** `services/product-service/src/config/config.service.ts`

Added:
- `ADMIN_SERVICE_PUBLIC_KEY` configuration property
- Validation schema for the public key
- Getter method `adminServicePublicKey()` that returns null if not configured

#### Environment Variables
**File:** `services/product-service/.env`

Added configuration:
```bash
# Service Authentication (Admin Service Public Key for Service-to-Service Auth)
ADMIN_SERVICE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo+yFK0sxkas9x5SjDbtP
[... full key ...]
-----END PUBLIC KEY-----"
```

#### Dependencies
Installed packages:
```bash
npm install jsonwebtoken --legacy-peer-deps
npm install --save-dev @types/jsonwebtoken --legacy-peer-deps
```

## Security Considerations

### Token Structure

**Service Token Payload:**
```typescript
{
  service_name: 'admin-service',      // Issuing service
  target_audience: 'product-service',  // Target service
  scopes: ['products:read', 'products:write'], // Permissions
  iat: 1714831234,                      // Issued at
  exp: 1714834834,                      // Expires at (1 hour default)
  jti: 'unique-token-id'               // JWT ID for revocation
}
```

### Security Features

1. **RS256 Algorithm:** Asymmetric encryption ensures private key never leaves admin-service
2. **Target Audience Validation:** Tokens can only be used by intended service
3. **Scopes-Based Authorization:** Fine-grained permissions per service
4. **Token Expiration:** Short-lived tokens (default 1 hour)
5. **Token Caching:** Reduces signing operations but maintains security
6. **Audit Trail:** Guard logs authentication attempts for monitoring

### Best Practices

1. **Key Rotation:** Regularly rotate RSA key pairs in production
2. **Token Revocation:** Implement JTI-based revocation if needed
3. **Scope Enforcement:** Controllers should verify scopes beyond guard
4. **Monitoring:** Track service token usage and failures
5. **Environment Separation:** Different keys for dev/staging/production

## Usage Example

### In Admin-Service (Client)

```typescript
@Injectable()
export class ProductService {
  constructor(
    private httpService: HttpService,
    private serviceTokenClient: ServiceTokenClient,
    private configService: ConfigService,
  ) {}

  async getAllProducts(): Promise<Product[]> {
    const token = await this.serviceTokenClient.getToken('product-service');
    
    const response = await firstValueFrom(
      this.httpService.get(`${this.configService.productServiceUrl}/api/v1/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
    
    return response.data;
  }
}
```

### In Product-Service (Server)

```typescript
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  
  @Get()
  async findAll(@Request() req) {
    // Access authentication type
    if (req.authType === 'service') {
      console.log(`Called by ${req.service.name} with scopes: ${req.service.scopes}`);
    } else {
      console.log(`Called by user: ${req.user.email}`);
    }
    
    return this.productService.findAll();
  }
  
  @Post()
  @UseGuards(ScopesGuard)
  @RequireScopes('products:write')
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }
}
```

## Testing

### Manual Testing Steps

1. **Generate RSA Keys:**
   ```bash
   cd services/admin-service
   openssl genrsa -out admin_private_key.pem 2048
   openssl rsa -in admin_private_key.pem -pubout -out admin_public_key.pem
   ```

2. **Start Services:**
   ```bash
   # Terminal 1: Product Service
   cd services/product-service && npm run start:dev
   
   # Terminal 2: Admin Service
   cd services/admin-service && npm run start:dev
   ```

3. **Test API Call:**
   ```bash
   # Get products endpoint from admin-service (which proxies to product-service)
   curl http://localhost:8007/api/v1/products \
     -H "Authorization: Bearer <user-token>"
   ```

4. **Verify Logs:**
   - Product-service should log: "Service token verified successfully"
   - Admin-service should log token generation and caching

### Automated Testing

```typescript
describe('Service-to-Service Authentication', () => {
  it('should accept valid service token', async () => {
    const token = await serviceTokenClient.getToken('product-service');
    const response = await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
      
    expect(response.body).toBeDefined();
  });
  
  it('should reject invalid service token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/products')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});
```

## Deployment Considerations

### Docker Configuration

Add to `services/admin-service/Dockerfile`:
```dockerfile
# Copy RSA keys if stored in secrets
# COPY --chown=node:node ./secrets/admin_private_key.pem /app/secrets/
```

### Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: admin-service-secrets
type: Opaque
stringData:
  JWT_PRIVATE_KEY: |
    -----BEGIN PRIVATE KEY-----
    MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
    -----END PRIVATE KEY-----
```

### Environment Variables (Production)

```bash
# Admin Service
SERVICE_NAME=admin-service
SERVICE_TOKEN_TTL=3600
JWT_PRIVATE_KEY=${ADMIN_PRIVATE_KEY}

# Product Service
ADMIN_SERVICE_PUBLIC_KEY=${ADMIN_PUBLIC_KEY}
```

## Monitoring and Observability

### Metrics to Track

1. **Service Token Generation Rate:** Tokens generated per minute
2. **Token Cache Hit Rate:** Percentage of cached tokens used
3. **Authentication Success Rate:** Service token verification success rate
4. **Token Expiry Events:** Tokens refreshed before expiry
5. **Authentication Failures:** Invalid/expired service tokens

### Logging

```typescript
// In ServiceTokenClient
this.logger.log(`Generated service token for ${targetService}`);
this.logger.debug(`Using cached token for ${targetService}`);

// In JwtAuthGuard
this.logger.debug('User token validation failed, trying service token');
this.logger.log('Service token verified successfully');
this.logger.warn('Invalid service token: wrong service or audience');
```

## Future Enhancements

1. **Multiple Services:** Support tokens for multiple calling services
2. **Dynamic Scopes:** Service-level permission management
3. **Token Revocation:** Implement revocation list or database
4. **Key Rotation:** Automatic key rotation without downtime
5. **Metrics Dashboard:** Prometheus/Grafana integration
6. **Audit Logs:** Detailed service-to-service communication logs
7. **Rate Limiting:** Per-service rate limiting
8. **Circuit Breaker:** Fail-fast on authentication failures

## Troubleshooting

### Issue: "Invalid or expired JWT token"

**Solutions:**
1. Check RSA public key matches in both services
2. Verify private key format (PEM, no extra spaces)
3. Check token expiration time
4. Ensure service name and audience match exactly

### Issue: "Admin service public key not configured"

**Solutions:**
1. Verify `ADMIN_SERVICE_PUBLIC_KEY` is set in .env
2. Check ConfigService loads the variable
3. Ensure key format is correct (single line with \n or multi-line)

### Issue: TypeScript errors for jsonwebtoken

**Solutions:**
1. Install package with `--legacy-peer-deps`
2. Verify @types/jsonwebtoken is installed
3. Check tsconfig.json includes correct type paths

## Conclusion

This implementation provides a secure, scalable service-to-service authentication mechanism that:
- ✅ Enables admin-service to communicate with product-service
- ✅ Maintains backward compatibility with user tokens
- ✅ Uses industry-standard RSA cryptography
- ✅ Implements proper token validation and caching
- ✅ Includes comprehensive logging and monitoring
- ✅ Follows microservice best practices

The solution is production-ready and can be extended to support additional services as the platform grows.