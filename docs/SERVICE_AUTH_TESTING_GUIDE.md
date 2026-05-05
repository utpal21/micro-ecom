# Service-to-Service Authentication Testing & Debugging Guide

## Quick Start

### Step 1: Restart Both Services

The code changes require both services to be restarted:

```bash
# Terminal 1: Restart Product Service
cd services/product-service
npm run start:dev

# Terminal 2: Restart Admin Service  
cd services/admin-service
npm run start:dev
```

### Step 2: Run Test Script

```bash
cd services/admin-service
./test-service-auth.sh
```

## Expected Behavior

If everything is working correctly, you should see:
- ✅ Admin-service is running
- ✅ Product-service is running  
- ✅ Product list API returns 200 status
- ✅ Products data is returned

## Debugging 401 Errors

If you're still getting 401 errors, follow these steps:

### 1. Check Admin-Service Logs

Look for these log messages in admin-service:

**Expected:**
```
[ServiceTokenClient] Generated new service token for product-service (expires in 3600s)
[ProductService] [getAuthHeaders] Service token obtained for product-service
```

**If you see errors:**
```
[ServiceTokenClient] JWT_PRIVATE_KEY not configured. Service tokens will not work.
```

**Solution:** Verify `JWT_PRIVATE_KEY` is set in `services/admin-service/.env`

### 2. Check Product-Service Logs

Look for these log messages in product-service:

**Expected:**
```
[JwtAuthGuard] Service token verified successfully
```

**If you see errors:**
```
[JwtAuthGuard] Invalid service token: wrong service or audience
```

**Solution:** Verify `ADMIN_SERVICE_PUBLIC_KEY` is set in `services/product-service/.env`

### 3. Verify RSA Keys

**Check admin-service has private key:**
```bash
cd services/admin-service
grep -q "BEGIN PRIVATE KEY" .env && echo "✓ Private key found" || echo "✗ Private key missing"
```

**Check product-service has public key:**
```bash
cd services/product-service
grep -q "BEGIN PUBLIC KEY" .env && echo "✓ Public key found" || echo "✗ Public key missing"
```

### 4. Manual Token Generation Test

Test that admin-service can generate a token:

```bash
# Get a user token first (from auth-service)
TOKEN="your-user-token-here"

# Call admin-service product endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8007/api/v1/products?page=1&limit=10
```

### 5. Direct Product-Service Test

Test product-service directly with a service token:

First, generate a token manually:
```bash
cd services/admin-service
node -e "
const jwt = require('jsonwebtoken');
const fs = require('fs');
const privateKey = fs.readFileSync('./admin_private_key.pem');
const token = jwt.sign({
  service_name: 'admin-service',
  target_audience: 'product-service',
  scopes: ['read', 'write'],
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 3600
}, privateKey, { algorithm: 'RS256' });
console.log(token);
"
```

Then test with product-service:
```bash
TOKEN="the-generated-token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8002/api/v1/products?page=1&limit=10
```

## Common Issues & Solutions

### Issue 1: "JWT_PRIVATE_KEY not configured"

**Symptom:** Admin-service logs show warning about missing private key

**Solution:**
```bash
cd services/admin-service
# Check if key file exists
ls -la admin_private_key.pem

# If missing, regenerate:
openssl genrsa -out admin_private_key.pem 2048
openssl rsa -in admin_private_key.pem -pubout -out admin_public_key.pem

# Add to .env
echo 'JWT_PRIVATE_KEY="'$(cat admin_private_key.pem | tr -d '\n')'"' >> .env
```

### Issue 2: "Admin service public key not configured"

**Symptom:** Product-service logs show warning about missing public key

**Solution:**
```bash
cd services/product-service
# Add admin-service public key to .env
echo 'ADMIN_SERVICE_PUBLIC_KEY="'$(cat ../admin-service/admin_public_key.pem | tr -d '\n')'"' >> .env
```

### Issue 3: "Invalid or expired JWT token"

**Symptom:** 401 error with this message

**Possible Causes:**
1. Keys don't match (private key doesn't correspond to public key)
2. Token format is incorrect
3. Token is expired

**Debug Steps:**
1. Regenerate both keys
2. Verify both are in .env files
3. Restart both services

### Issue 4: Method name errors

**Symptom:** TypeScript errors about missing methods

**Solution:**
```bash
cd services/admin-service
npm run build
```

## Advanced Debugging

### Enable Debug Logging

Add to both services' .env:
```bash
LOG_LEVEL=debug
```

### Test Token Components

```bash
# Decode a JWT token (without verifying)
TOKEN="your-token-here"
echo $TOKEN | cut -d. -f2 | base64 -d | jq .
```

You should see:
```json
{
  "service_name": "admin-service",
  "target_audience": "product-service",
  "scopes": ["read", "write", "update", "delete"],
  "iat": 1714831234,
  "exp": 1714834834
}
```

### Check Redis Cache

```bash
# Connect to Redis
redis-cli

# Check cached tokens
KEYS service_token:*

# View cached token for product-service
GET service_token:product-service

# Clear cache if needed
DEL service_token:product-service
```

## Verification Checklist

Before reporting issues, verify:

- [ ] Both services are running (check health endpoints)
- [ ] Admin-service has JWT_PRIVATE_KEY in .env
- [ ] Product-service has ADMIN_SERVICE_PUBLIC_KEY in .env
- [ ] Both services have been restarted after code changes
- [ ] Admin-service builds without errors (`npm run build`)
- [ ] Product-service builds without errors (`npm run build`)
- [ ] Redis is running and accessible
- [ ] No errors in service logs related to service tokens

## Log Analysis

### Admin-Service Log Pattern to Look For:

✅ **Success:**
```
[ServiceTokenClient] Generated new service token for product-service
[ProductService] [getAuthHeaders] Service token obtained for product-service
[ProductService] Fetching products with params: {...}
[ProductService] Products fetched successfully in 123ms
```

❌ **Failure:**
```
[ServiceTokenClient] JWT_PRIVATE_KEY not configured
[ProductService] [getAuthHeaders] Failed to get service token Error: ...
```

### Product-Service Log Pattern to Look For:

✅ **Success:**
```
[JwtAuthGuard] User token validation failed, trying service token
[JwtAuthGuard] Service token verified successfully
```

❌ **Failure:**
```
[JwtAuthGuard] Invalid service token: wrong service or audience
[JwtAuthGuard] Invalid or expired JWT token
```

## Next Steps if Still Failing

1. **Enable detailed logging** in both services
2. **Capture full error stack traces** from logs
3. **Verify key pair matches** using OpenSSL:
   ```bash
   # From admin-service directory
   openssl rsa -in admin_private_key.pem -pubout -out test_public_key.pem
   diff test_public_key.pem admin_public_key.pem
   ```
4. **Test with fresh key pair**: Regenerate keys and update both .env files
5. **Check for environment issues**: Verify NODE_ENV and other config variables

## Getting Help

If you're still experiencing issues after following this guide:

1. Collect the following information:
   - Full error message from API response
   - Admin-service logs (last 50 lines)
   - Product-service logs (last 50 lines)
   - Current .env files (redacted)
   - Output of test script

2. Create an issue with:
   - Title: "Service-to-Service Auth: [brief description]"
   - Description: What you're trying to do
   - Steps to reproduce
   - Actual behavior
   - Expected behavior
   - Logs and error messages

## Success Indicators

You'll know service-to-service authentication is working when:

1. ✅ Test script passes all checks
2. ✅ Admin-service logs show successful token generation
3. ✅ Product-service logs show successful token verification
4. ✅ Product list API returns 200 status
5. ✅ Products data loads in admin frontend
6. ✅ No 401 errors in logs
7. ✅ Cache hits appear in logs after first request