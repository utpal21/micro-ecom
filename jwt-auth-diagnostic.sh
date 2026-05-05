#!/bin/bash

echo "========================================"
echo "  JWT AUTHENTICATION DIAGNOSTIC TEST  "
echo "========================================"
echo ""

ADMIN_SERVICE_URL="http://localhost:8007/api/v1"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "STEP 1: Testing Login Endpoint..."
echo "----------------------------------------"
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
  "${ADMIN_SERVICE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@microecom.com","password":"Admin@123"}')

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1 | grep -oP 'HTTP_CODE:\K\d+')
RESPONSE_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}✗ Login failed${NC}"
    exit 1
fi

TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.accessToken')
USER_ID=$(echo "$RESPONSE_BODY" | jq -r '.user.id')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ No token in response${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo "Token (first 100 chars): ${TOKEN:0:100}..."
echo "User ID: $USER_ID"
echo ""

echo "STEP 2: Decoding JWT Token..."
echo "----------------------------------------"
# Decode JWT (base64)
HEADER=$(echo "$TOKEN" | cut -d. -f1 | base64 -d 2>/dev/null | jq '.' 2>/dev/null || echo "Failed to decode header")
PAYLOAD=$(echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq '.' 2>/dev/null || echo "Failed to decode payload")

echo "JWT Header:"
echo "$HEADER"
echo ""
echo "JWT Payload:"
echo "$PAYLOAD"
echo ""

echo "STEP 3: Testing Protected Endpoint WITH Token..."
echo "----------------------------------------"
PRODUCTS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET \
  "${ADMIN_SERVICE_URL}/products?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

PRODUCTS_HTTP_CODE=$(echo "$PRODUCTS_RESPONSE" | tail -1 | grep -oP 'HTTP_CODE:\K\d+')
PRODUCTS_BODY=$(echo "$PRODUCTS_RESPONSE" | sed '$d')

echo "HTTP Status: $PRODUCTS_HTTP_CODE"
echo "Response:"
echo "$PRODUCTS_BODY" | jq '.' 2>/dev/null || echo "$PRODUCTS_BODY"

if [ "$PRODUCTS_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Protected endpoint works with token${NC}"
else
    echo -e "${RED}✗ Protected endpoint failed with token${NC}"
fi
echo ""

echo "STEP 4: Testing Protected Endpoint WITHOUT Token..."
echo "----------------------------------------"
NO_AUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET \
  "${ADMIN_SERVICE_URL}/products?page=1&limit=10" \
  -H "Content-Type: application/json")

NO_AUTH_HTTP_CODE=$(echo "$NO_AUTH_RESPONSE" | tail -1 | grep -oP 'HTTP_CODE:\K\d+')
NO_AUTH_BODY=$(echo "$NO_AUTH_RESPONSE" | sed '$d')

echo "HTTP Status: $NO_AUTH_HTTP_CODE"
echo "Response:"
echo "$NO_AUTH_BODY" | jq '.' 2>/dev/null || echo "$NO_AUTH_BODY"

if [ "$NO_AUTH_HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Protected endpoint correctly rejects unauthenticated requests${NC}"
else
    echo -e "${YELLOW}⚠ Unexpected response without token${NC}"
fi
echo ""

echo "STEP 5: Testing with Invalid Token..."
echo "----------------------------------------"
INVALID_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET \
  "${ADMIN_SERVICE_URL}/products?page=1&limit=10" \
  -H "Authorization: Bearer invalid.token.here" \
  -H "Content-Type: application/json")

INVALID_HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -1 | grep -oP 'HTTP_CODE:\K\d+')
INVALID_BODY=$(echo "$INVALID_RESPONSE" | sed '$d')

echo "HTTP Status: $INVALID_HTTP_CODE"
echo "Response:"
echo "$INVALID_BODY" | jq '.' 2>/dev/null || echo "$INVALID_BODY"

if [ "$INVALID_HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Protected endpoint correctly rejects invalid tokens${NC}"
else
    echo -e "${YELLOW}⚠ Unexpected response with invalid token${NC}"
fi
echo ""

echo "STEP 6: Testing Token Format..."
echo "----------------------------------------"
echo "Token format check:"
if [[ "$TOKEN" =~ ^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$ ]]; then
    echo -e "${GREEN}✓ Token has valid JWT format (header.payload.signature)${NC}"
else
    echo -e "${RED}✗ Token has invalid format${NC}"
fi
echo ""

echo "STEP 7: Testing Token Expiration..."
echo "----------------------------------------"
EXPIRATION=$(echo "$PAYLOAD" | jq -r '.exp')
if [ "$EXPIRATION" != "null" ] && [ -n "$EXPIRATION" ]; then
    CURRENT_TIME=$(date +%s)
    TIME_LEFT=$((EXPIRATION - CURRENT_TIME))
    
    if [ $TIME_LEFT -gt 0 ]; then
        echo -e "${GREEN}✓ Token is not expired${NC}"
        echo "Time until expiration: $TIME_LEFT seconds"
    else
        echo -e "${RED}✗ Token has expired${NC}"
        echo "Expired: $((-TIME_LEFT)) seconds ago"
    fi
else
    echo -e "${YELLOW}⚠ No expiration time in token${NC}"
fi
echo ""

echo "========================================"
echo "  DIAGNOSTIC COMPLETE                 "
echo "========================================"