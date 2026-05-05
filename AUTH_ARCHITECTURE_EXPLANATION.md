# Authentication Architecture - Complete Explanation

## The "401 No JWT token provided" Error - EXPLAINED ✅

You're seeing this error because **you're not logged in** in the frontend. This is **CORRECT behavior** - the authentication is working as designed!

---

## Understanding the Two-Layer Authentication

Your system has **TWO DIFFERENT authentication flows** that work together:

### Layer 1: User Authentication (Frontend → Admin-Service)
```
Frontend → Admin-Service
Token Type: User JWT Token (from login)
Authenticator: Admin-Service JwtAuthGuard
```

**Purpose:** Verify that the user is logged in and has permission to access admin features.

**How it works:**
1. User logs in via `/auth/login`
2. Admin-Service generates a user JWT token
3. Token is stored in frontend Redux state
4. Frontend sends token in `Authorization: Bearer <token>` header
5. Admin-Service JwtAuthGuard validates the token
6. If valid, request proceeds; if missing/invalid, returns 401

**What you're seeing:**
- Error: `"No JWT token provided"`
- This means the frontend is calling admin-service WITHOUT a user token
- This happens when you're not logged in

---

### Layer 2: Service-to-Service Authentication (Admin-Service → Product-Service)
```
Admin-Service → Product-Service
Token Type: Service Token (RS256 signed)
Authenticator: Product-Service JwtAuthGuard (dual-mode)
```

**Purpose:** Allow admin-service to call product-service without exposing user credentials.

**How it works:**
1. Admin-Service ProductService needs to fetch products from product-service
2. ServiceTokenClient generates a service token (RS256 signed with private key)
3. Token is cached in Redis for 1 hour
4. Admin-Service sends service token to product-service
5. Product-Service JwtAuthGuard validates with admin's public key
6. If valid (service_name='admin-service', audience='product-service'), request proceeds

**This is what we implemented:** ✅
- ServiceTokenClient generates RS256 tokens
- Product-Service verifies with public key
- Redis caching for performance
- Target audience validation for security

---

## Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Browser                            │
│                        (Admin Frontend)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ 1. GET /products
                           │    No Authorization header
                           │    (User not logged in)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                       Admin-Service                              │
│                         :8007                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ProductController (@UseGuards(JwtAuthGuard))                    │
│  ├── JwtAuthGuard checks for Authorization header              │
│  ├── ❌ No token found!                                        │
│  └── ❌ Returns 401: "No JWT token provided"                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Correct Request Flow (User Logged In)

```
┌─────────────────────────────────────────────────────────────────┐
│                          User Browser                            │
│                        (Admin Frontend)                          │
│                                                                 │
│  1. User logs in with credentials                              │
│     POST /auth/login                                            │
│     { email, password }                                         │
│                                                                 │
│  2. Store token in Redux:                                       │
│     state.auth.token = "eyJhbGciOiJIUzI1NiIs..."                 │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ 3. GET /products
                           │    Authorization: Bearer eyJhbGci...
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                       Admin-Service                              │
│                         :8007                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ProductController (@UseGuards(JwtAuthGuard))                    │
│  ├── JwtAuthGuard checks for Authorization header              │
│  ├── ✓ User token found!                                       │
│  ├── ✓ Validates with JWT strategy (JWKS)                       │
│  ├── ✓ Token valid!                                            │
│  └── ✓ Allow request to proceed                                 │
│                                                                 │
│  ProductService.findAll()                                       │
│  ├── Needs data from product-service                            │
│  ├── Calls getAuthHeaders()                                     │
│  │   └── ServiceTokenClient.getServiceToken('product-service')│
│  │       ├── Check Redis cache                                 │
│  │       └── Generate RS256 service token if needed            │
│  │           {                                                  │
│  │             service_name: 'admin-service',                   │
│  │             target_audience: 'product-service',              │
│  │             scopes: ['read', 'write'],                       │
│  │             ...                                              │
│  │           }                                                  │
│  └── HTTP GET http://localhost:8002/api/v1/products            │
│      Authorization: Bearer <service-token>                      │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ 4. GET /api/v1/products
                           │    Authorization: Bearer <service-token>
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      Product-Service                            │
│                         :8002                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ProductController (@UseGuards(JwtAuthGuard))                    │
│  ├── JwtAuthGuard checks for Authorization header              │
│  ├── ✓ Service token found!                                     │
│  ├── Try JWKS verification (user tokens)                       │
│  │   └── ❌ Fails (not a user token)                           │
│  ├── Try RSA verification (service tokens)                      │
│  │   ├── Verify with admin public key                         │
│  │   ├── ✓ Valid RS256 signature                               │
│  │   ├── ✓ service_name === 'admin-service'                   │
│  │   ├── ✓ target_audience === 'product-service'               │
│  │   └── ✓ Service token valid!                                │
│  └── ✓ Allow request to proceed                                 │
│                                                                 │
│  ProductService.findAll()                                       │
│  └── Returns products data                                       │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ 5. Returns products
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                       Admin-Service                              │
│                                                                 │
│  ProductService.findAll()                                       │
│  └── Returns products to frontend                                │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ 6. Products displayed in UI
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                          User Browser                            │
│                                                                 │
│  Products list displayed successfully! ✅                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why You're Seeing the Error

### Scenario: You're Not Logged In

**What happens:**
1. You open http://localhost:8008 (admin frontend)
2. You navigate to Products page
3. Frontend calls `GET /api/v1/products` via apiSlice
4. apiSlice tries to add Authorization header
5. But `state.auth.token` is null/undefined (not logged in)
6. Request goes to admin-service WITHOUT token
7. Admin-Service JwtAuthGuard sees no token
8. Returns 401: `"No JWT token provided"`

**This is correct behavior!** The system is protecting the endpoint.

---

## How to Fix It

### Option 1: Login First (Recommended)

1. Open admin frontend: http://localhost:8008
2. Click Login
3. Enter credentials:
   - Email: `admin@microecom.com`
   - Password: `Admin@123`
4. After successful login, navigate to Products
5. Products will load successfully ✅

### Option 2: Test with Script

Run the authentication test script:

```bash
./test-auth-flow.sh
```

This will:
1. Login and get a user token
2. Test products endpoint with user token
3. Verify service-to-service authentication
4. Show that everything is working

---

## Verification Steps

### Step 1: Test with Script

```bash
./test-auth-flow.sh
```

Expected output:
```
✓ Token obtained: eyJhbGciOiJIUzI1NiIs...
✓ Products endpoint working with user token!
```

### Step 2: Check Frontend Auth State

Open browser DevTools → Console:

```javascript
// Check if user is logged in
console.log(localStorage.getItem('persist:root'))
// Should contain auth state with token
```

### Step 3: Verify Service-to-Service Auth

Check admin-service logs:

```
[ServiceTokenClient] Generated new service token for product-service
[ProductService] Service token obtained for product-service
```

This proves the service-to-service auth is working!

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Authentication Layers                      │
└─────────────────────────────────────────────────────────────────┘

LAYER 1: User Authentication (Frontend → Admin-Service)
┌──────────────────┐      ┌──────────────────┐
│  Frontend        │─────▶│  Admin-Service   │
│  (Browser)       │      │  :8007           │
│                  │      │                  │
│  - User logged in│      │  - JwtAuthGuard  │
│  - Has token     │      │  - Validates     │
│  - Sends token   │      │  - Permits       │
└──────────────────┘      └──────────────────┘

LAYER 2: Service Authentication (Admin-Service → Product-Service)
┌──────────────────┐      ┌──────────────────┐
│  Admin-Service   │─────▶│ Product-Service  │
│  :8007           │      │  :8002           │
│                  │      │                  │
│  - Has private   │      │  - JwtAuthGuard  │
│    key           │      │  - Dual-mode     │
│  - Generates     │      │    (JWKS + RSA)  │
│    service token │      │  - Validates     │
│  - Public key    │      │  - Permits       │
│    not needed    │      │                  │
└──────────────────┘      └──────────────────┘
```

---

## Key Points

1. **The error is correct** - You're not logged in, so you can't access protected endpoints

2. **Service-to-service auth is working** - It's just for internal communication (admin → product)

3. **Frontend needs user token** - Obtained from `/auth/login`, stored in Redux

4. **Two different token types:**
   - User Token: HS256/JWKS, for frontend → admin-service
   - Service Token: RS256, for admin-service → product-service

5. **The implementation is complete** - Both authentication layers are working as designed

---

## Quick Start Guide

### For Development:

1. **Login first:**
   ```bash
   # Open http://localhost:8008
   # Login with: admin@microecom.com / Admin@123
   ```

2. **Verify auth flow:**
   ```bash
   ./test-auth-flow.sh
   ```

3. **Check logs:**
   ```bash
   # Terminal 1: Admin-Service
   cd services/admin-service
   npm run start:dev
   
   # Terminal 2: Product-Service
   cd services/product-service
   npm run start:dev
   ```

4. **Monitor service-to-service communication:**
   ```bash
   # Look for these logs in admin-service:
   # [ServiceTokenClient] Generated new service token
   # [ProductService] Service token obtained
   ```

---

## Common Questions

### Q: Why do I need to login? Can't we make the endpoint public?

**A:** No, because this is an **admin panel**. All operations should be authenticated for security. Products endpoint should only be accessible to logged-in admins.

### Q: Why not use the same token for both layers?

**A:** User tokens identify **who** is making the request. Service tokens identify **which service** is making the request. They serve different purposes:
- User token: "Admin John is requesting products"
- Service token: "Admin-service is requesting products from product-service"

### Q: Can I skip service-to-service auth and just use user tokens?

**A:** You could, but that would expose user credentials to internal services. Service-to-service auth is more secure because:
- Service tokens are short-lived (1 hour)
- No user credentials shared between services
- Fine-grained control over which services can talk to each other

### Q: The error says "No JWT token provided" - where should the token come from?

**A:** From the login endpoint! Here's the flow:
1. User submits login form
2. Frontend calls `POST /api/v1/auth/login`
3. Admin-Service validates credentials
4. Admin-Service returns: `{ accessToken: "...", user: {...} }`
5. Frontend stores token in Redux: `state.auth.token = accessToken`
6. Future requests include: `Authorization: Bearer ${token}`

---

## Summary

✅ **Service-to-service authentication is IMPLEMENTED and WORKING**

✅ **The 401 error you're seeing is CORRECT behavior** (you're not logged in)

✅ **To test the full flow:**
1. Login to admin frontend
2. Navigate to Products page
3. Products will load successfully

✅ **To verify implementation:**
```bash
./test-auth-flow.sh
```

✅ **Two-layer architecture:**
- Layer 1: User authentication (frontend → admin-service) - requires login
- Layer 2: Service authentication (admin-service → product-service) - automatic

**Everything is working as designed!** 🎉