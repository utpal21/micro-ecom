# Proper Authentication Architecture - Final Clarification

**Date:** May 4, 2026  
**Status:** Correct Understanding ✅

---

## Executive Summary

Your understanding is **completely correct**! The proper architecture uses:

1. **Auth Service**: Single token authority with private key
2. **All Services**: Have Auth Service's public key for local validation
3. **JWKS Endpoint**: Auth Service publishes public keys
4. **Local Validation**: Services validate JWTs locally (no network calls)
5. **Mixed Protection**: Public routes (product list) + Protected routes (admin operations)

This is **exactly what's already designed** in Phase 3 (Auth Service) implementation plan.

---

## The Correct Architecture (As Designed)

### 1. Key Distribution

```
┌─────────────────┐
│  Auth Service   │
│                 │
│  Private Key    │ ── Signs all JWTs
│  Public Key     │ ── Published via JWKS
└────────┬────────┘
         │
         │ JWKS Endpoint: /.well-known/jwks.json
         │
         ▼
┌─────────────────────────────────┐
│         All Services          │
├───────────┬─────────┬───────┤
│   Admin   │ Product │ Order │
│  Service  │ Service │Service │
│           │         │        │
│  Public Key (cached) │ Public Key (cached)
└─────────────────────────────────┘
```

### 2. User Authentication Flow

```
1. User Login
Frontend ── POST /auth/login ──> Auth Service
                                    │
                                    ▼
                          Validate credentials
                                    │
                                    ▼
                          Sign JWT with Private Key
                                    │
                                    ▼
                          Return JWT to Frontend

2. Access Protected Resource
Frontend ── GET /api/admin/products ──> Admin Service
            Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
                                    │
                                    ▼
                    Extract JWT from header
                                    │
                                    ▼
                    Validate signature with Public Key
                    (LOCAL - no network call!)
                                    │
                                    ▼
                    Check expiration, issuer, audience
                                    │
                                    ▼
                    Extract user info from payload
                                    │
                                    ▼
                    Return protected data
```

### 3. JWKS Caching (Performance Optimization)

```typescript
// Service-side JWT validation (already in implementation plan)
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwksCache: Map<string, any> = new Map();
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    
    try {
      // Decode and verify signature LOCALLY
      const decoded = jwt.verify(token, this.getPublicKey(), {
        algorithms: ['RS256']
      });
      
      // Check expiration
      if (decoded.exp < Date.now() / 1000) {
        throw new UnauthorizedException('Token expired');
      }
      
      // Attach user to request
      request.user = decoded;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
  
  private getPublicKey(): string {
    // Load from environment or cache
    // Optionally refresh from JWKS endpoint
    return process.env.AUTH_SERVICE_PUBLIC_KEY;
  }
}
```

---

## Public vs Protected Routes

### Public Routes (No Authentication Required)

```typescript
// Product Service - Public endpoints
@Controller('products')
export class ProductController {
  
  @Get()  // Anyone can browse products
  @Public()  // Custom decorator
  async findAll(): Promise<Product[]> {
    return this.productService.findAll();
  }
  
  @Get(':id')  // Anyone can view product details
  @Public()
  async findOne(@Param('id') id: string): Promise<Product> {
    return this.productService.findOne(id);
  }
  
  @Post()  // Only authenticated admins can create
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'product_manager')
  async create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productService.create(dto);
  }
}
```

### Protected Routes (Authentication Required)

```typescript
// Admin Service - Protected endpoints
@Controller('admin/products')
export class AdminProductController {
  
  @Get()  // Only authenticated admins can list
  @UseGuards(JwtAuthGuard)
  async findAll(): Promise<Product[]> {
    return this.productService.findAll();
  }
  
  @Post()  // Only authenticated admins can create
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'product_manager')
  async create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productService.create(dto);
  }
  
  @Put(':id')  // Only authenticated admins can update
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'product_manager')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }
}

// Order Service - Mixed protection
@Controller('orders')
export class OrderController {
  
  @Get()  // Only authenticated users can see their orders
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: User): Promise<Order[]> {
    return this.orderService.findByUserId(user.id);
  }
  
  @Post()  // Only authenticated users can create orders
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.orderService.create(user.id, dto);
  }
}
```

---

## Service-to-Service Authentication

### Option 1: API Keys (Simpler, Recommended)

```typescript
// Auth Service manages service credentials
CREATE TABLE service_credentials (
  id UUID PRIMARY KEY,
  service_name VARCHAR(100) UNIQUE NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  scopes JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

// Admin Service uses API key to call Product Service
@Injectable()
export class ProductService {
  private httpClient = axios.create({
    baseURL: 'http://product-service:8002',
    headers: {
      'Authorization': `Bearer ${process.env.PRODUCT_SERVICE_API_KEY}`,
      'X-Service-Name': 'admin-service'
    }
  });
  
  async getProducts(): Promise<Product[]> {
    const response = await this.httpClient.get('/products');
    return response.data;
  }
}

// Product Service validates API key
@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['authorization']?.replace('Bearer ', '');
    const serviceName = request.headers['x-service-name'];
    
    // Validate against Auth Service database
    const isValid = await this.validateApiKey(apiKey, serviceName);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid service credentials');
    }
    
    return true;
  }
}
```

### Option 2: Service Tokens (More Complex, More Secure)

```typescript
// Auth Service issues service tokens
POST /auth/service-token
{
  "service_name": "admin-service",
  "service_secret": "sk_live_abc123..."
}

Response:
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "scopes": ["products:read", "products:write"]
}

// Admin Service uses service token
@Injectable()
export class ProductService {
  private httpClient = axios.create({
    baseURL: 'http://product-service:8002',
    headers: {
      'Authorization': `Bearer ${this.getServiceToken()}`,
      'X-Service-Name': 'admin-service'
    }
  });
  
  async getProducts(): Promise<Product[]> {
    const response = await this.httpClient.get('/products');
    return response.data;
  }
}
```

---

## Configuration

### 1. Auth Service (.env)

```bash
# Auth Service Configuration
PORT=8001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# JWT Keys (RSA-2048 or RSA-4096)
JWT_PRIVATE_KEY_PATH=/secrets/jwt_private_key.pem
JWT_PUBLIC_KEY_PATH=/secrets/jwt_public_key.pem
JWT_ALGORITHM=RS256
JWT_ACCESS_TOKEN_EXPIRY=1h
JWT_REFRESH_TOKEN_EXPIRY=7d

# Service Credentials
ADMIN_SERVICE_SECRET=sk_live_abc123...
PRODUCT_SERVICE_SECRET=sk_live_def456...
```

### 2. Other Services (.env)

```bash
# Admin Service Configuration
PORT=8007
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# JWT Validation
AUTH_SERVICE_PUBLIC_KEY=$(cat /secrets/auth_service_public_key.pem)
JWT_ALGORITHM=RS256

# Service-to-Service Credentials
PRODUCT_SERVICE_API_KEY=sk_live_def456...
ORDER_SERVICE_API_KEY=sk_live_ghi789...
```

### 3. Docker Compose

```yaml
version: '3.8'
services:
  auth-service:
    environment:
      - JWT_PRIVATE_KEY_PATH=/secrets/jwt_private_key.pem
      - JWT_PUBLIC_KEY_PATH=/secrets/jwt_public_key.pem
    volumes:
      - ./secrets/jwt_private_key.pem:/secrets/jwt_private_key.pem:ro
      - ./secrets/jwt_public_key.pem:/secrets/jwt_public_key.pem:ro

  admin-service:
    environment:
      - AUTH_SERVICE_PUBLIC_KEY=/secrets/auth_service_public_key.pem
      - PRODUCT_SERVICE_API_KEY=sk_live_def456...
    volumes:
      - ./secrets/auth_service_public_key.pem:/secrets/auth_service_public_key.pem:ro
      - ./secrets/admin_service_api_key.env:/secrets/admin_service_api_key.env:ro

  product-service:
    environment:
      - AUTH_SERVICE_PUBLIC_KEY=/secrets/auth_service_public_key.pem
    volumes:
      - ./secrets/auth_service_public_key.pem:/secrets/auth_service_public_key.pem:ro
```

---

## What Needs to Be Fixed

### Current Wrong Implementation ❌

1. **Admin Service generates JWT with its own private key**
   - File: `services/admin-service/src/infrastructure/auth/service-token-client.service.ts`
   - Config: `JWT_PRIVATE_KEY` in Admin Service
   - Action: DELETE these files and config

2. **Product Service verifies with Admin's public key**
   - File: `services/product-service/src/common/guards/service-auth.guard.ts`
   - Config: `ADMIN_SERVICE_PUBLIC_KEY` in Product Service
   - Action: DELETE this guard and config

### Correct Implementation ✅

1. **Auth Service is the ONLY token authority**
   - Already implemented (Phase 3 - COMPLETE)
   - Has private key and JWKS endpoint
   - Issues user JWT tokens

2. **All services validate with Auth's public key**
   - Already designed in implementation plan
   - Services have `AUTH_SERVICE_PUBLIC_KEY` in config
   - Local validation (no network calls)

3. **Public routes don't require auth**
   - Use `@Public()` decorator
   - Examples: product listing, product details
   - Already in implementation plan

4. **Protected routes require JWT**
   - Use `@UseGuards(JwtAuthGuard)`
   - Examples: admin operations, user orders
   - Already in implementation plan

5. **Service-to-Service uses API keys**
   - Auth Service manages credentials
   - Services use API keys to call each other
   - Already in implementation plan

---

## Implementation Steps

### Phase 1: Clean Up Wrong Implementation (2 hours)

```bash
# 1. Delete Admin Service token generation
rm services/admin-service/src/infrastructure/auth/service-token-client.service.ts
rm services/admin-service/src/infrastructure/auth/auth.module.ts
# Remove from app.module.ts

# 2. Delete Product Service Admin key validation
rm services/product-service/src/common/guards/service-auth.guard.ts

# 3. Remove Admin Service's private key
rm secrets/admin_service_private_key.pem
rm secrets/admin_service_public_key.pem

# 4. Update .env files
# Remove JWT_PRIVATE_KEY from admin-service/.env
# Remove ADMIN_SERVICE_PUBLIC_KEY from product-service/.env
```

### Phase 2: Ensure Auth Service JWKS (Already Done) ✅

Auth Service already has JWKS endpoint:
- Endpoint: `/.well-known/jwks.json`
- Already implemented in Phase 3
- No changes needed

### Phase 3: Add Public Key to Services (2 hours)

```typescript
// Add to all services (admin, product, order, etc.)
// src/config/auth.config.ts

export const authConfig = {
  publicKey: process.env.AUTH_SERVICE_PUBLIC_KEY || '',
  algorithm: 'RS256',
  issuer: 'auth-service',
  audience: ['admin-service', 'product-service', 'order-service']
};

// src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    
    try {
      // Verify signature with public key (LOCAL)
      const decoded = jwt.verify(token, authConfig.publicKey, {
        algorithms: [authConfig.algorithm],
        issuer: authConfig.issuer,
        audience: authConfig.audience
      });
      
      // Check expiration
      if (decoded.exp < Date.now() / 1000) {
        throw new UnauthorizedException('Token expired');
      }
      
      // Attach user to request
      request.user = decoded;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
  
  private extractToken(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}
```

### Phase 4: Add @Public() Decorator (1 hour)

```typescript
// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );
    
    if (isPublic) {
      return true;  // Skip auth for public routes
    }
    
    // ... normal JWT validation
  }
}
```

### Phase 5: Apply Guards to Routes (2-3 hours)

```typescript
// Product Service
@Controller('products')
export class ProductController {
  @Get()  // Public
  @Public()
  async findAll() { ... }
  
  @Get(':id')  // Public
  @Public()
  async findOne() { ... }
  
  @Post()  // Protected - only admins
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'product_manager')
  async create() { ... }
}

// Admin Service
@Controller('admin/products')
export class AdminProductController {
  @Get()  // Protected - only admins
  @UseGuards(JwtAuthGuard)
  async findAll() { ... }
  
  @Post()  // Protected - only admins
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'product_manager')
  async create() { ... }
}
```

### Phase 6: Service-to-Service API Keys (3-4 hours)

```typescript
// Auth Service - API key management
// database/migrations/add_service_credentials.sql

CREATE TABLE service_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name VARCHAR(100) UNIQUE NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

// Generate API key for Admin Service
INSERT INTO service_credentials (service_name, api_key_hash, scopes)
VALUES ('admin-service', '$2b$10$...', '["products:read", "products:write", "orders:*"]');

// Other Services - API key validation guard
@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['authorization']?.replace('Bearer ', '');
    const serviceName = request.headers['x-service-name'];
    
    if (!apiKey || !serviceName) {
      throw new UnauthorizedException('Missing service credentials');
    }
    
    // Validate against Auth Service database
    const isValid = await this.authService.validateServiceCredentials(
      serviceName, 
      apiKey
    );
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid service credentials');
    }
    
    return true;
  }
}
```

### Phase 7: Update Environment Files (1 hour)

```bash
# admin-service/.env
AUTH_SERVICE_PUBLIC_KEY=$(cat secrets/auth_service_public_key.pem)
PRODUCT_SERVICE_API_KEY=sk_live_def456...
ORDER_SERVICE_API_KEY=sk_live_ghi789...

# product-service/.env
AUTH_SERVICE_PUBLIC_KEY=$(cat secrets/auth_service_public_key.pem)

# order-service/.env
AUTH_SERVICE_PUBLIC_KEY=$(cat secrets/auth_service_public_key.pem)
```

### Phase 8: Tests (2-3 hours)

```typescript
// Test public routes
describe('ProductController', () => {
  it('GET /products should be public', async () => {
    const response = await request(app.getHttpServer())
      .get('/products')
      .expect(200);
  });
});

// Test protected routes
describe('AdminProductController', () => {
  it('GET /admin/products should require auth', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/products')
      .expect(401);
  });
  
  it('GET /admin/products with valid token should work', async () => {
    const token = await generateValidToken();
    const response = await request(app.getHttpServer())
      .get('/admin/products')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});

// Test service-to-service auth
describe('ProductService', () => {
  it('should call Product Service with API key', async () => {
    const products = await productService.getProducts();
    expect(products).toBeDefined();
  });
});
```

---

## Summary

### What's Already Correct ✅

1. **Auth Service** - Complete (Phase 3)
   - Has private key for signing
   - Has JWKS endpoint for public keys
   - Issues user JWT tokens
   - Already implemented

2. **Architecture Design** - Already in implementation plan
   - Auth Service is single authority
   - Services validate locally with public key
   - Public routes don't require auth
   - Protected routes use JWT guard

### What's Wrong ❌

1. **Admin Service generating tokens** - DELETE
   - Should NOT have private key
   - Should NOT generate tokens
   - Should validate with Auth's public key

2. **Product Service using Admin's key** - DELETE
   - Should validate with Auth's public key
   - Should NOT have Admin's public key

### What Needs to Be Added

1. **Public key distribution** to all services
2. **@Public() decorator** for public routes
3. **JWT Auth Guard** for protected routes
4. **API key system** for service-to-service auth

### Total Effort

| Task | Hours |
|------|-------|
| Clean up wrong implementation | 2 |
| Add public key to services | 2 |
| Add @Public() decorator | 1 |
| Apply guards to routes | 3 |
| API key system | 4 |
| Update environment files | 1 |
| Tests | 3 |
| **Total** | **16 hours (2 days)** |

---

## Conclusion

Your understanding is **100% correct**! The proper architecture is:

1. ✅ Auth Service has private key, signs all tokens
2. ✅ All services have Auth's public key
3. ✅ Services validate tokens locally (no network calls)
4. ✅ Public routes don't require auth
5. ✅ Protected routes validate with public key
6. ✅ Service-to-service uses API keys

This is **exactly what's in the implementation plan** and is the industry-standard pattern used by Netflix, Amazon, Google, and Uber.

The fix is straightforward: remove Admin Service's token generation and ensure all services use Auth Service's public key for validation.