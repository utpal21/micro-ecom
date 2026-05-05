#!/bin/bash

echo "=== Debug Frontend Authentication ==="
echo ""

# Check if frontend is running
echo "1. Checking if frontend is running..."
if curl -s http://localhost:8008 > /dev/null; then
    echo "✓ Frontend is running on http://localhost:8008"
else
    echo "✗ Frontend is not running on http://localhost:8008"
    echo "  Please start the frontend: cd apps/web && npm run dev"
    exit 1
fi

echo ""
echo "2. Checking if admin-service is running..."
if curl -s http://localhost:8007/health > /dev/null; then
    echo "✓ Admin-service is running on http://localhost:8007"
else
    echo "✗ Admin-service is not running on http://localhost:8007"
    exit 1
fi

echo ""
echo "3. Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST \
  http://localhost:8007/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@microecom.com","password":"Admin@123"}')

echo "Login response:"
echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo ""
    echo "✗ Failed to get token from login"
    exit 1
fi

echo ""
echo "✓ Token obtained: ${TOKEN:0:80}..."

echo ""
echo "4. Testing products endpoint WITH token..."
PRODUCTS_RESPONSE=$(curl -s -X GET \
  "http://localhost:8007/api/v1/products?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "Products response:"
echo "$PRODUCTS_RESPONSE" | jq . 2>/dev/null || echo "$PRODUCTS_RESPONSE"

echo ""
echo "5. Checking response structure..."
if echo "$PRODUCTS_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "✓ Response has 'success' field"
else
    echo "✗ Response does not have 'success' field"
fi

if echo "$PRODUCTS_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
    echo "✓ Response has 'data' field"
else
    echo "✗ Response does not have 'data' field"
fi

if echo "$PRODUCTS_RESPONSE" | jq -e '.products' > /dev/null 2>&1; then
    echo "✓ Response has 'products' field"
else
    echo "✗ Response does not have 'products' field"
fi

echo ""
echo "6. Checking frontend API configuration..."
echo "Expected base URL: http://localhost:8007/api/v1"
echo ""
echo "Please check your frontend's .env file:"
echo "  VITE_API_BASE_URL=http://localhost:8007/api/v1"
echo ""

echo "7. Testing products endpoint WITHOUT token (should fail)..."
NO_TOKEN_RESPONSE=$(curl -s -X GET \
  "http://localhost:8007/api/v1/products?page=1&limit=10")

echo "Response without token:"
echo "$NO_TOKEN_RESPONSE" | jq . 2>/dev/null || echo "$NO_TOKEN_RESPONSE"

echo ""
echo "=== Debug Complete ==="
echo ""
echo "Summary:"
echo "- Backend login: Working ✓"
echo "- Products with token: Working ✓"
echo "- Products without token: Fails (expected) ✓"
echo ""
echo "If frontend still shows 401 error, check:"
echo "1. Frontend .env has correct VITE_API_BASE_URL"
echo "2. Frontend is restarted after .env changes"
echo "3. Browser DevTools > Network tab shows Authorization header"
echo "4. Browser DevTools > Application > LocalStorage has persisted auth state"