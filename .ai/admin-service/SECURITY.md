# Admin Service Security

> **Version**: 1.0.0 | **Last Updated**: April 21, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
5. [Audit Logging](#audit-logging)
6. [Data Protection](#data-protection)
7. [Network Security](#network-security)
8. [Rate Limiting](#rate-limiting)
9. [Input Validation](#input-validation)
10. [Security Headers](#security-headers)

---

## Overview

The Admin Service implements defense-in-depth security strategy with multiple layers of protection:

1. **Authentication**: JWT-based with RS256 signing
2. **Authorization**: Role-based access control (RBAC)
3. **Audit Logging**: Comprehensive activity tracking
4. **Data Protection**: Encryption at rest and in transit
5. **Network Security**: TLS 1.3, IP whitelisting
6. **Rate Limiting**: DDoS prevention
7. **Input Validation**: Request sanitization

---

## Authentication

### JWT Token Strategy

#### Token Configuration

| Attribute | Value |
|-----------|--------|
| **Algorithm** | RS256 (RSA with SHA-256) |
| **Key Size** | 4096 bits |
| **Access Token TTL** | 15 minutes |
| **Refresh Token TTL** | 7 days |
| **Key Rotation** | Every 90 days |

#### Token Structure

**Access Token Payload:**
```json
{
  "sub": "admin_user_id",
  "aud": "admin-service",
  "iss": "auth-service",
  "iat": 1713710400,
  "exp": 1713711300,
  "type": "access",
  "role": "admin",
  "permissions": ["products.read", "orders.manage"]
}
```

**Refresh Token Payload:**
```json
{
  "sub": "admin_user_id",
  "aud": "admin-service",
  "iss": "auth-service",
  "iat": 1713710400,
  "exp": 1714315200,
  "type": "refresh",
  "jti": "unique_token_id"
}
```

#### JWT Validation

```typescript
// src/modules/auth/services/jwt.service.ts
import jwt from 'jsonwebtoken';

export class JwtService {
  private publicKey: string;
  private privateKey: string;

  constructor() {
    this.publicKey = process.env.JWT_PUBLIC_KEY;
    this.privateKey = process.env.JWT_PRIVATE_KEY;
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        audience: 'admin-service',
        issuer: 'auth-service'
      }) as JwtPayload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
  }

  verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.publicKey, {
        algorithms: ['RS256'],
        audience: 'admin-service',
        issuer: 'auth-service'
      }) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }
}
```

### Authentication Flow

#### Login Process

```typescript
// src/modules/auth/services/auth.service.ts
export class AuthService {
  async login(credentials: LoginDto): Promise<AuthResponse> {
    // 1. Validate credentials with Auth Service
    const user = await this.authApiClient.validateCredentials(
      credentials.email,
      credentials.password
    );

    // 2. Check if user is admin
    const admin = await this.adminRepo.findByUserId(user.id);
    if (!admin) {
      throw new UnauthorizedError('Not an admin user');
    }

    // 3. Check if account is active
    if (admin.deletedAt) {
      throw new UnauthorizedError('Account deactivated');
    }

    // 4. Generate tokens
    const tokens = await this.generateTokens(admin);

    // 5. Update last login
    await this.adminRepo.update(admin.id, {
      lastLoginAt: new Date()
    });

    // 6. Log login attempt
    await this.auditLogService.log({
      adminId: admin.id,
      action: 'admin.login',
      resourceType: 'admin',
      resourceId: admin.id,
      ipAddress: this.getClientIp(),
      userAgent: this.getClientUserAgent()
    });

    return {
      admin: this.sanitizeAdmin(admin),
      tokens
    };
  }
}
```

#### Token Refresh

```typescript
async refreshTokens(refreshToken: string): Promise<TokenPair> {
  // 1. Verify refresh token
  const payload = this.jwtService.verifyRefreshToken(refreshToken);

  // 2. Check if token is revoked
  const isRevoked = await this.redis.get(`revoked:${payload.jti}`);
  if (isRevoked) {
    throw new UnauthorizedError('Token revoked');
  }

  // 3. Get admin user
  const admin = await this.adminRepo.findByUserId(payload.sub);
  if (!admin) {
    throw new UnauthorizedError('Admin not found');
  }

  // 4. Generate new tokens
  const tokens = await this.generateTokens(admin);

  // 5. Revoke old refresh token
  await this.redis.setex(`revoked:${payload.jti}`, 7 * 24 * 60 * 60, '1');

  return tokens;
}
```

---

## Authorization

### Role-Based Access Control (RBAC)

#### Admin Roles

| Role | Description | Permissions |
|------|-------------|--------------|
| `super_admin` | Full system access | `*` (all permissions) |
| `admin` | Platform operations | `products.*`, `orders.*`, `customers.*`, `users.manage` |
| `finance_manager` | Financial operations | `payments.read`, `payments.refund`, `reports.financial`, `settlements.*` |
| `inventory_manager` | Inventory operations | `inventory.read`, `inventory.adjust`, `inventory.alerts` |
| `content_manager` | Content operations | `content.*`, `banners.*` |
| `support_manager` | Customer support | `orders.read`, `orders.manage`, `customers.read` |
| `product_manager` | Product operations | `products.read`, `products.approve`, `categories.*` |

#### Permission Matrix

| Permission | super_admin | admin | finance_manager | inventory_manager | content_manager | support_manager | product_manager |
|-----------|-------------|-------|----------------|-------------------|-----------------|----------------|-----------------|
| `products.read` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `products.create` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `products.update` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `products.delete` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `products.approve` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| `orders.read` | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `orders.manage` | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `inventory.read` | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `inventory.adjust` | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| `customers.read` | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| `customers.block` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `payments.read` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `payments.refund` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `reports.*` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `settlements.*` | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| `content.*` | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| `users.manage` | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `admins.manage` | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

#### RBAC Middleware

```typescript
// src/middleware/rbac.middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { JwtService } from '@/modules/auth/services/jwt.service';

export class RBACMiddleware {
  constructor(
    private jwtService: JwtService
  ) {}

  async checkPermission(
    request: NextRequest,
    requiredPermission: string
  ): Promise<boolean> {
    // 1. Extract and verify token
    const token = this.extractToken(request);
    const payload = this.jwtService.verifyAccessToken(token);

    // 2. Get admin user
    const admin = await this.adminRepo.findByUserId(payload.sub);
    if (!admin) {
      return false;
    }

    // 3. Check super admin
    if (admin.role === 'super_admin') {
      return true;
    }

    // 4. Check role permissions
    const rolePermissions = ROLE_PERMISSIONS[admin.role];
    if (!rolePermissions) {
      return false;
    }

    // 5. Check specific permission
    if (requiredPermission === '*') {
      return rolePermissions.includes('*');
    }

    const hasPermission = rolePermissions.some(perm => {
      if (perm === '*') return true;
      if (perm === requiredPermission) return true;
      if (perm.endsWith('.*') && requiredPermission.startsWith(perm.replace('.*', ''))) return true;
      return false;
    });

    return hasPermission;
  }

  private extractToken(request: NextRequest): string {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }
    return authHeader.substring(7);
  }
}

// Usage in API routes
const rbacMiddleware = new RBACMiddleware(jwtService);

export async function GET(request: NextRequest) {
  const hasPermission = await rbacMiddleware.checkPermission(
    request,
    'products.delete'
  );

  if (!hasPermission) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Insufficient permissions',
          required_permission: 'products.delete'
        }
      },
      { status: 403 }
    );
  }

  // Proceed with request
}
```

---

## Two-Factor Authentication (2FA)

### 2FA Setup

```typescript
// src/modules/auth/services/2fa.service.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export class TwoFactorAuthService {
  async enable2FA(adminId: UUID): Promise<2FASetupResponse> {
    const admin = await this.adminRepo.findById(adminId);
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `EMP Admin (${admin.email})`,
      issuer: 'Enterprise Marketplace'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store temporary secret (not yet enabled)
    await this.redis.setex(
      `2fa:temp:${adminId}`,
      300, // 5 minutes
      JSON.stringify({
        secret: secret.base32,
        verified: false
      })
    );

    return {
      qrCodeUrl,
      secret: secret.base32,
      backupCodes: this.generateBackupCodes()
    };
  }

  async verifyAndEnable2FA(adminId: UUID, token: string): Promise<void> {
    // Get temporary secret
    const tempData = await this.redis.get(`2fa:temp:${adminId}`);
    if (!tempData) {
      throw new BadRequestError('2FA setup expired');
    }

    const { secret } = JSON.parse(tempData);

    // Verify token
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token
    });

    if (!isValid) {
      throw new BadRequestError('Invalid 2FA token');
    }

    // Enable 2FA for admin
    await this.adminRepo.update(adminId, {
      twoFactorEnabled: true,
      permissions: {
        ...this.getPermissions(adminId),
        '2fa.secret': this.encryptSecret(secret)
      }
    });

    // Clear temporary secret
    await this.redis.del(`2fa:temp:${adminId}`);
  }

  async verify2FA(adminId: UUID, token: string): Promise<boolean> {
    const admin = await this.adminRepo.findById(adminId);
    if (!admin || !admin.twoFactorEnabled) {
      return false;
    }

    const secret = this.decryptSecret(admin.permissions['2fa.secret']);

    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps (60 seconds)
    });
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(generateRandomString(16).toUpperCase());
    }
    return codes;
  }
}
```

### 2FA Login Flow

```typescript
async loginWith2FA(credentials: LoginDto, token: string): Promise<AuthResponse> {
  // 1. Validate credentials
  const admin = await this.validateCredentials(credentials);

  // 2. Check if 2FA is enabled
  if (admin.twoFactorEnabled) {
    // 3. Verify 2FA token
    const isValid = await this.twoFactorAuthService.verify2FA(
      admin.id,
      token
    );

    if (!isValid) {
      // Log failed 2FA attempt
      await this.auditLogService.log({
        adminId: admin.id,
        action: 'admin.2fa_failed',
        resourceType: 'admin',
        resourceId: admin.id,
        ipAddress: this.getClientIp()
      });

      throw new UnauthorizedError('Invalid 2FA token');
    }
  }

  // 4. Generate tokens
  const tokens = await this.generateTokens(admin);

  return {
    admin: this.sanitizeAdmin(admin),
    tokens
  };
}
```

---

## Audit Logging

### Audit Log Structure

```typescript
interface AuditLog {
  id: UUID;
  adminId: UUID;
  action: string;        // e.g., 'product.approved', 'order.status_updated'
  resourceType: string;  // e.g., 'product', 'order'
  resourceId?: UUID;
  oldValues?: any;
  newValues?: any;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}
```

### Audit Middleware

```typescript
// src/middleware/audit.middleware.ts
export class AuditMiddleware {
  async logRequest(
    adminId: UUID,
    action: string,
    resourceType: string,
    resourceId?: UUID,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    await this.auditLogService.log({
      adminId,
      action,
      resourceType,
      resourceId,
      oldValues: this.sensitiveData(oldValues),
      newValues: this.sensitiveData(newValues),
      ipAddress: this.getClientIp(),
      userAgent: this.getClientUserAgent()
    });
  }

  private sensitiveData(data: any): any {
    // Remove sensitive fields from audit logs
    const sensitiveFields = ['password', 'credit_card', 'ssn', 'secret'];
    
    if (!data) return data;

    const sanitized = { ...data };
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
```

### Audit Query

```typescript
async getAuditLogs(
  adminId?: UUID,
  filters?: AuditLogFilters
): Promise<PaginatedResponse<AuditLog>> {
  const query = this.prisma.adminLog.findMany({
    where: {
      ...(adminId && { adminId }),
      ...(filters?.action && { action: filters.action }),
      ...(filters?.resourceType && { resourceType: filters.resourceType }),
      ...(filters?.fromDate && {
        createdAt: { gte: filters.fromDate }
      }),
      ...(filters?.toDate && {
        createdAt: { lte: filters.toDate }
      })
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: filters?.limit || 20,
    skip: ((filters?.page || 1) - 1) * (filters?.limit || 20)
  });

  const total = await this.prisma.adminLog.count({
    where: query.where
  });

  return {
    data: query,
    meta: {
      page: filters?.page || 1,
      limit: filters?.limit || 20,
      total,
      pages: Math.ceil(total / (filters?.limit || 20))
    }
  };
}
```

---

## Data Protection

### Encryption at Rest

#### Database Encryption

```typescript
// Sensitive fields encrypted at application level
const encrypted = crypto.encrypt(sensitiveData, process.env.ENCRYPTION_KEY);
await this.prisma.admin.update({
  where: { id: adminId },
  data: {
    permissions: {
      ...admin.permissions,
      '2fa.secret': encrypted
    }
  }
});
```

#### Encryption Utility

```typescript
// src/lib/encryption.ts
import crypto from 'crypto';

export class Encryption {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16; // 128 bits
  private authTagLength = 16; // 128 bits

  encrypt(plaintext: string, key: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(key, 'hex'),
      iv
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64');
  }

  decrypt(ciphertext: string, key: string): string {
    const buffer = Buffer.from(ciphertext, 'base64');
    const iv = buffer.slice(0, this.ivLength);
    const authTag = buffer.slice(this.ivLength, this.ivLength + this.authTagLength);
    const encrypted = buffer.slice(this.ivLength + this.authTagLength);

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(key, 'hex'),
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

### Data in Transit

#### TLS Configuration

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      }
    ];
  }
};
```

### Password Storage

Passwords are stored in Auth Service using bcrypt (cost factor 12).

---

## Network Security

### IP Whitelisting

```typescript
// src/middleware/ip-whitelist.middleware.ts
export class IPWhitelistMiddleware {
  private whitelistedIPs: string[] = process.env.ADMIN_IP_WHITELIST?.split(',') || [];

  async checkIP(request: NextRequest): Promise<boolean> {
    // If whitelist is empty, allow all
    if (this.whitelistedIPs.length === 0) {
      return true;
    }

    const clientIP = this.getClientIP(request);
    return this.whitelistedIPs.includes(clientIP);
  }

  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'
    );
  }
}
```

### CORS Configuration

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGINS || 'http://localhost:3000'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400'
          }
        ]
      }
    ];
  }
};
```

---

## Rate Limiting

### Rate Limiting Strategy

```typescript
// src/middleware/rate-limit.middleware.ts
import { Redis } from 'ioredis';

export class RateLimitMiddleware {
  constructor(private redis: Redis) {}

  async checkRateLimit(
    adminId: UUID,
    endpoint: string,
    limit: number,
    window: number
  ): Promise<boolean> {
    const key = `rate_limit:${adminId}:${endpoint}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, window);
    }

    return current <= limit;
  }

  async getRateLimitStatus(
    adminId: UUID,
    endpoint: string
  ): Promise<RateLimitStatus> {
    const key = `rate_limit:${adminId}:${endpoint}`;
    const current = parseInt(await this.redis.get(key) || '0', 10);
    const ttl = await this.redis.ttl(key);

    return {
      limit: this.getLimitForEndpoint(endpoint),
      remaining: Math.max(0, this.getLimitForEndpoint(endpoint) - current),
      reset: ttl > 0 ? Math.floor(Date.now() / 1000) + ttl : 0
    };
  }

  private getLimitForEndpoint(endpoint: string): number {
    const limits = {
      '/api/v1/auth/login': 5,
      '/api/v1/products': 100,
      '/api/v1/orders': 50,
      '/api/v1/dashboard': 200
    };

    return limits[endpoint] || 50;
  }
}
```

### Rate Limit Configuration

| Endpoint | Limit | Window |
|-----------|-------|--------|
| `/api/v1/auth/login` | 5 requests | 5 minutes |
| `/api/v1/auth/logout` | 10 requests | 1 minute |
| `/api/v1/products` | 100 requests | 1 minute |
| `/api/v1/orders` | 50 requests | 1 minute |
| `/api/v1/inventory` | 50 requests | 1 minute |
| `/api/v1/reports` | 30 requests | 1 minute |
| `/api/v1/dashboard` | 200 requests | 1 minute |

---

## Input Validation

### Zod Validation

```typescript
// src/modules/auth/schemas/auth.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  sku: z.string().min(1, 'SKU is required').max(100),
  price_paisa: z.number().int().positive('Price must be positive'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  category_id: z.string().uuid('Invalid category ID'),
  description: z.string().max(2000).optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
  notes: z.string().max(500).optional()
});
```

### Input Sanitization

```typescript
// src/lib/sanitizer.ts
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

export class Sanitizer {
  static sanitizeHTML(input: string): string {
    return purify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: []
    });
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  static sanitizeSKU(input: string): string {
    return input.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  }
}
```

---

## Security Headers

### HTTP Security Headers

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'"
            ].join('; ')
          }
        ]
      }
    ];
  }
};
```

---

## Security Best Practices

### 1. Never Log Sensitive Data

```typescript
// ❌ BAD
this.logger.info('Admin login', {
  email: admin.email,
  password: admin.password  // NEVER log passwords!
});

// ✅ GOOD
this.logger.info('Admin login', {
  adminId: admin.id,
  timestamp: new Date()
});
```

### 2. Always Validate Input

```typescript
// ❌ BAD
async updateProduct(id: string, data: any) {
  return this.prisma.product.update({ where: { id }, data });
}

// ✅ GOOD
async updateProduct(id: string, data: UpdateProductDto) {
  const validated = updateProductSchema.parse(data);
  return this.prisma.product.update({ where: { id }, data: validated });
}
```

### 3. Use Parameterized Queries

```typescript
// ❌ BAD
const query = `SELECT * FROM admins WHERE email = '${email}'`;

// ✅ GOOD
const query = 'SELECT * FROM admins WHERE email = $1';
const result = await this.prisma.$queryRawUnsafe(query, [email]);
```

### 4. Implement Rate Limiting

```typescript
// Always rate limit authentication endpoints
const canLogin = await this.rateLimitMiddleware.checkRateLimit(
  adminId,
  '/api/v1/auth/login',
  5,
  300 // 5 minutes
);

if (!canLogin) {
  throw new TooManyRequestsError('Too many login attempts');
}
```

### 5. Use HTTPS in Production

```typescript
// Force HTTPS redirect
if (process.env.NODE_ENV === 'production' && !request.secure) {
  return NextResponse.redirect(`https://${request.headers.get('host')}${request.url}`);
}
```

---

## Security Monitoring

### Security Metrics

Track these security-related metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `auth_failures_total` | Counter | Total failed authentication attempts |
| `2fa_failures_total` | Counter | Total failed 2FA attempts |
| `rate_limit_exceeded_total` | Counter | Total rate limit violations |
| `suspicious_activities_total` | Counter | Total suspicious activities detected |
| `blocked_ips_total` | Gauge | Total blocked IP addresses |

### Alert Rules

| Alert | Condition | Severity |
|-------|-----------|-----------|
| Brute Force Attack | > 10 failed logins from same IP in 5 minutes | CRITICAL |
| Mass 2FA Failures | > 5 failed 2FA attempts in 1 minute | HIGH |
| Rate Limit Abuse | > 100 rate limit violations in 1 hour | MEDIUM |
| Unusual Access Pattern | Admin login from new country | LOW |

---

## Compliance

### GDPR Compliance

- **Right to be Forgotten**: Account deletion option
- **Data Export**: Admin can export all data
- **Consent Tracking**: Record user consent
- **Data Retention**: Audit logs kept for 90 days maximum

### PCI DSS Compliance

- **No Card Data**: Never store raw card numbers
- **Tokenization**: Use SSLCommerz tokenization
- **Encryption**: All sensitive data encrypted at rest
- **Audit Trail**: All payment actions logged

---

## Conclusion

The Admin Service implements comprehensive security measures to protect against:

1. **Unauthorized Access**: JWT authentication + RBAC
2. **Account Compromise**: 2FA, IP whitelisting
3. **Data Breaches**: Encryption at rest and in transit
4. **Injection Attacks**: Input validation and sanitization
5. **DoS Attacks**: Rate limiting and DDoS protection
6. **Data Loss**: Comprehensive audit logging

All security measures follow industry best practices and regulatory requirements.

---

**Last Updated**: 2026-04-21  
**Maintained By**: Engineering Team