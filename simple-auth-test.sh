#!/bin/bash

echo "=== Simple Auth Test ==="
echo ""

# Login
echo "1. Login..."
LOGIN=$(curl -s -X POST http://localhost:8007/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@microecom.com","password":"Admin@123"}')

TOKEN=$(echo "$LOGIN" | jq -r '.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "ERROR: No token received"
    echo "$LOGIN"
    exit 1
fi

echo "✓ Got token"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Decode token
echo "2. Token Payload:"
PAYLOAD=$(echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null)
echo "$PAYLOAD" | jq '.'
echo ""

# Test products endpoint WITH token
echo "3. GET /products WITH token..."
PRODUCTS=$(curl -s -w "\nSTATUS:%{http_code}" -X GET \
  "http://localhost:8007/api/v1/products?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

STATUS=$(echo "$PRODUCTS" | tail -1 | cut -d: -f2)
BODY=$(echo "$PRODUCTS" | sed '$d')

echo "Status: $STATUS"
echo "Response:"
echo "$BODY" | jq '.data | length' 2>/dev/null || echo "$BODY"
echo ""

# Test products endpoint WITHOUT token
echo "4. GET /products WITHOUT token..."
NO_AUTH=$(curl -s -w "\nSTATUS:%{http_code}" -X GET \
  "http://localhost:8007/api/v1/products?page=1&limit=10")

NO_STATUS=$(echo "$NO_AUTH" | tail -1 | cut -d: -f2)
NO_BODY=$(echo "$NO_AUTH" | sed '$d')

echo "Status: $NO_STATUS"
echo "Response:"
echo "$NO_BODY" | jq '.message' 2>/dev/null || echo "$NO_BODY"
echo ""

echo "=== Test Complete ==="