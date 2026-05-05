# Admin Service - Production Readiness Checklist

> **Version:** 1.0.0  
> **Status:** Development Phase  
> **Last Updated:** May 4, 2026

---

## 🚨 Critical Issues (Must Fix Before Production)

### 1. Admin Authentication Security

**Current State:**
- ✅ JWT token generation works
- ✅ Permission-based access control
- ❌ Password validation bypassed (accepts any password)
- ❌ No password hashing
- ❌ Email not stored in Admin DB

**Required Changes:**

#### A. Update Prisma Schema
```prisma
model Admin {
  id          String   @id @default(uuid())
  userId      String   @unique
  email       String   @unique  // ADD THIS
  password    String              // ADD THIS (hashed)
  role        String
  permissions Json?
  lastLoginAt DateTime?
  twoFactorEnabled Boolean  @default(false)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  // ... relations
  
  @@map("admins")
  @@index([userId])
  @@index([email])      // ADD THIS INDEX
  @@index([role])
}
```

#### B. Create Migration
```bash
npx prisma migrate dev --name add_admin_email_password
```

#### C. Update JWT Service (jwt.service.ts)
```typescript
import * as bcrypt from 'bcrypt';

async validateAndSignToken(email: string, password: string): Promise<any> {
  // Query admin by email (not just role)
  const admin = await this.prisma.admin.findUnique({
    where: { email }
  });

  if (!admin) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // Verify password hash
  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // ... rest of the logic
}
```

#### D. Create Seed Script
```typescript
// prisma/seed.ts
import * as bcrypt from 'bcrypt';

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  
  await prisma.admin.upsert({
    where: { email: 'admin@microecom.com' },
    update: {},
    create: {
      userId: 'admin-001',
      email: 'admin@microecom.com',
      password,
      role: 'admin',
      permissions: { /* full permissions */ }
    }
  });
}
```

---

### 2. Environment Variables Security

**Current State:**
- `.env` file may contain sensitive data
- No environment variable validation
- JWT secrets might be hardcoded

**Required Changes:**

#### A. Add Environment Validation
```typescript
// src/config/env.validation.ts
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production').required(),
  PORT: Joi.number().default(8007),
  
  DATABASE_URL: Joi.string().required(),
  
  REDIS_URL: Joi.string().required(),
  
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRATION: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
  
  RABBITMQ_URL: Joi.string().required(),
});
```

#### B. Update .env.production Example
```env
NODE_ENV=production
PORT=8007

# Database
DATABASE_URL=postgresql://user:password@host:5432/emp_admin?schema=public

# Redis
REDIS_URL=redis://host:6379

# JWT (MUST BE RANDOM AND LONG)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars-long
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d

# RabbitMQ
RABBITMQ_URL=amqp://user:password@host:5672

# Auth Service (for JWKS)
AUTH_SERVICE_URL=http://auth-service:8001
```

---

### 3. Database Security

**Required Changes:**

#### A. Enable Row-Level Security (PostgreSQL)
```sql
-- Add to migration
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Only allow admins to see their own records
CREATE POLICY "Admins can only see themselves" 
ON admins FOR SELECT 
USING (email = current_user_email());
```

#### B. Database Connection Pooling
```typescript
// Prisma already handles this, but verify configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Consider connection pool settings in DATABASE_URL:
  // postgresql://user:pass@host:5432/db?schema=public&pool_timeout=10&connection_limit=10
}
```

---

### 4. API Security

**Required Changes:**

#### A. Rate Limiting
```bash
npm install @nestjs/throttler
```

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

ThrottlerModule.forRoot([{
  ttl: 60000, // 1 minute
  limit: 100,  // 100 requests per minute
}])
```

```typescript
// auth.controller.ts
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // ... login logic
}
```

#### B. CORS Configuration
```typescript
// main.ts
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8008'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

#### C. Helmet for Security Headers
```bash
npm install helmet
```

```typescript
// main.ts
import helmet from 'helmet';
app.use(helmet());
```

---

### 5. Logging & Monitoring

**Required Changes:**

#### A. Structured Logging
```typescript
// Already using structured logging, but ensure:
// 1. All logs include correlation IDs
// 2. Sensitive data is redacted
// 3. Log levels are appropriate (debug, info, warn, error)
```

#### B. Error Tracking (Sentry)
```bash
npm install @sentry/node @sentry/tracing
```

```typescript
// main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### C. Health Checks
```typescript
// Already implemented, but add:
// 1. Database connectivity check
// 2. Redis connectivity check
// 3. RabbitMQ connectivity check
// 4. Disk space check
// 5. Memory usage check
```

---

### 6. Input Validation

**Required Changes:**

#### A. DTO Validation Enhancement
```typescript
// login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  password: string;
}
```

#### B. Sanitize All Inputs
```bash
npm install express-mongo-sanitize (or similar for SQL)
```

---

### 7. Secret Management

**Required Changes:**

#### A. Use Environment Variables
- ❌ Don't commit `.env` files
- ✅ Use `.env.example` for documentation
- ✅ Load secrets from environment variables
- ✅ Consider HashiCorp Vault or AWS Secrets Manager for production

#### B. Rotate Secrets Regularly
- JWT secrets
- Database passwords
- Redis passwords
- API keys

---

## ⚠️ High Priority Issues

### 8. Database Backups

**Required:**
- Automated daily backups
- Point-in-time recovery (PITR)
- Backup encryption at rest
- Regular backup restoration tests

### 9. Two-Factor Authentication

**Current State:**
- ✅ 2FA service exists
- ❌ Not enforced by default
- ❌ No recovery codes

**Required:**
- Make 2FA optional for admins
- Implement recovery codes
- Add 2FA QR code generation

### 10. Audit Logging

**Current State:**
- ✅ Audit log table exists
- ✅ Audit log service implemented
- ❌ May not capture all admin actions

**Required:**
- Ensure ALL state-changing operations are logged
- Include IP address, user agent, timestamp
- Implement audit log retention policy

---

## 📋 Medium Priority Issues

### 11. Performance Optimization

**Required:**
- Database query optimization
- Redis caching strategy
- CDN for static assets (if applicable)
- Lazy loading for large datasets

### 12. Testing Coverage

**Current State:**
- ✅ Unit tests exist
- ⚠️ May not have adequate coverage
- ❌ No E2E tests

**Required:**
- Aim for 80%+ test coverage
- Add integration tests
- Add E2E tests with Playwright
- Load testing with k6 or Artillery

### 13. Documentation

**Required:**
- API documentation (Swagger) - ✅ Already has
- Deployment guide - ⚠️ Partial
- Runbook for common issues - ❌ Missing
- Architecture diagrams - ✅ Already has

---

## 🔍 Low Priority (Nice to Have)

### 14. Feature Flags

Implement feature flags for:
- Gradual rollouts
- A/B testing
- Emergency shutoffs

### 15. Analytics

Add application analytics for:
- User behavior tracking
- Feature usage
- Performance metrics

### 16. Internationalization

Support multiple languages for:
- Admin interface
- Error messages
- Email notifications

---

## ✅ Pre-Production Checklist

### Security
- [ ] Password validation implemented
- [ ] Password hashing (bcrypt) enabled
- [ ] Environment variables secured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers (Helmet) enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection

### Database
- [ ] Admin table has email and password fields
- [ ] Seed script created with hashed password
- [ ] Database backups automated
- [ ] Connection pooling configured
- [ ] SSL/TLS for database connections

### Authentication & Authorization
- [ ] JWT secrets are random and long enough
- [ ] JWT expiration times are appropriate
- [ ] Refresh token rotation implemented
- [ ] Role-based access control enforced
- [ ] Permission-based access control tested

### Monitoring & Logging
- [ ] Structured logging implemented
- [ ] Error tracking (Sentry) configured
- [ ] Health checks comprehensive
- [ ] Metrics collection enabled
- [ ] Alert rules configured

### Performance
- [ ] Database queries optimized
- [ ] Redis caching strategy in place
- [ ] Response times acceptable
- [ ] Load testing completed

### Deployment
- [ ] Docker image optimized
- [ ] Kubernetes manifests ready
- [ ] CI/CD pipeline configured
- [ ] Zero-downtime deployment strategy
- [ ] Rollback plan documented

### Documentation
- [ ] API documentation complete
- [ ] Deployment guide comprehensive
- [ ] Runbook created
- [ ] Onboarding guide ready

---

## 🚀 Production Rollout Strategy

### Phase 1: Staging
1. Deploy to staging environment
2. Run full test suite
3. Perform load testing
4. Security audit
5. Performance testing

### Phase 2: Canary Deployment
1. Deploy to 10% of production traffic
2. Monitor error rates
3. Monitor performance metrics
4. Check user feedback
5. Monitor database load

### Phase 3: Full Rollout
1. Gradually increase traffic to 100%
2. Continuous monitoring
3. Be ready to rollback
4. Communicate with stakeholders

### Phase 4: Post-Deployment
1. Monitor for 24-48 hours
2. Review logs and metrics
3. Address any issues
4. Document lessons learned

---

## 📞 Emergency Contacts

- **Engineering Lead:** [Contact Info]
- **DevOps Team:** [Contact Info]
- **Database Admin:** [Contact Info]
- **Security Team:** [Contact Info]

---

## 📚 References

- [NestJS Security Best Practices](https://docs.nestjs.com/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Note:** This checklist should be reviewed and updated regularly as the system evolves.