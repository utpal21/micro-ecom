# Product API Architecture Fix

## 🚨 Issues Identified

### 1. **Wrong API Endpoint**
- **Frontend:** Calling `http://localhost:8007/api/v1/products` (admin-service)
- **Expected:** Should call `http://localhost:8002/api/products` (product-service)

### 2. **JWT Authentication Incompatibility**
- **Admin Service (8007):** Uses symmetric HS256 JWT signing
- **Product Service (8002):** Uses JWKS (RS256) from auth-service
- **Result:** Admin JWT tokens cannot be validated by product-service

### 3. **Image Upload Size Limit**
- **Error:** `request entity too large` (500 error)
- **Cause:** Default NestJS payload size limit too small for base64 images
- **Need:** Increase to at least 10MB

### 4. **Pagination Parameter Mismatch**
- **Frontend:** Sends `page` and `limit`
- **Product Service:** Expects `page` and `limit` (matches)
- **Admin Service:** May use different params

## 🎯 Solution Options

### Option A: Use Admin Service as Proxy (RECOMMENDED for now)
**Pros:**
- Minimal changes needed
- Works with existing admin JWT tokens
- Consistent authentication flow
- Admin service already has product endpoints

**Cons:**
- Adds hop in request path
- Not ideal microservices architecture
- Admin service becomes a gateway

**Implementation:**
- Keep frontend pointing to admin-service (8007)
- Admin service forwards requests to product-service with service-to-service auth
- Or admin service implements product CRUD directly (which it seems to do)

### Option B: Implement Service-to-Service Authentication
**Pros:**
- Proper microservices architecture
- Frontend calls product-service directly
- Clear separation of concerns

**Cons:**
- Requires significant changes
- Need to implement shared authentication mechanism
- More complex

**Implementation:**
- Frontend points to product-service (8002)
- Implement shared JWT secret or mTLS
- Or implement service-to-service auth with API keys
- Or use auth-service as token validator

### Option C: Make Product Service Accept Admin JWT (NOT RECOMMENDED)
**Pros:**
- Minimal backend changes

**Cons:**
- Security risk
- Tight coupling
- Violates microservices principles

## 📋 Recommended Implementation Plan

### Phase 1: Quick Fix (Current Session)
1. Keep frontend pointing to admin-service (8007)
2. Increase payload size limit in admin-service for image uploads
3. Verify pagination params match

### Phase 2: Proper Architecture
1. Implement service-to-service authentication
2. Create gateway service or API gateway
3. Frontend -> Gateway -> Microservices
4. Unified authentication at gateway level

## 🔧 Implementation Details

### Fix 1: Increase Payload Size Limit (Admin Service)
File: `services/admin-service/src/main.ts`
```typescript
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));
```

### Fix 2: Verify Pagination Params
Admin service accepts: `page`, `limit` ✅
Product service accepts: `page`, `limit` ✅
Frontend sends: `page`, `limit` ✅

### Fix 3: API Base URL (Keep as is)
Frontend: `http://localhost:8007/api/v1`
Admin Service: Port 8007 ✅

## 📊 Current Architecture Flow

```
Frontend (8008)
    ↓ JWT Token (from admin login)
Admin Service (8007)
    ↓ Service-to-Service Auth (needs implementation)
Product Service (8002)
```

## 🎯 Decision

**For this session:** Use Option A (Admin Service as Proxy)
- Minimal changes
- Admin service already has product endpoints
- Works with existing authentication

**For production:** Implement Option B (Service-to-Service Auth)
- Proper microservices architecture
- API Gateway pattern
- Centralized authentication

## ✅ Next Steps

1. Increase payload size limit in admin-service
2. Verify product endpoints in admin-service
3. Test create product with image
4. Document proper microservices architecture for future implementation