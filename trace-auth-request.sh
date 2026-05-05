#!/bin/bash

echo "=== Trace Auth Request ==="
echo ""

# Login and get token
echo "1. Getting token from login..."
LOGIN_RESPONSE=$(curl -s -X POST \
  http://localhost:8007/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@microecom.com","password":"Admin@123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "✗ Failed to get token"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

echo "✓ Token obtained"
echo "   Token (first 50 chars): ${TOKEN:0:50}..."
echo ""

# Test with curl - verbose to see headers
echo "2. Making request with token (verbose)..."
echo "   Request to: http://localhost:8007/api/v1/products?page=1&limit=10"
echo ""

curl -v -X GET \
  "http://localhost:8007/api/v1/products?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  2>&1 | grep -A 20 "Authorization"

echo ""
echo ""
echo "3. Making request WITHOUT token (for comparison)..."
curl -v -X GET \
  "http://localhost:8007/api/v1/products?page=1&limit=10" \
  -H "Content-Type: application/json" \
  2>&1 | grep -A 20 "Authorization"

echo ""
echo "=== Trace Complete ==="