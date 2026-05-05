#!/bin/bash

# Test script to verify service-to-service authentication

echo "=== Testing Service-to-Service Authentication ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Check if services are running
echo "1. Checking if admin-service is running..."
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8007/health || echo "000")
if [ "$ADMIN_STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} Admin-service is running"
else
    echo -e "${RED}✗${NC} Admin-service is not running (status: $ADMIN_STATUS)"
    echo "   Please start admin-service: cd services/admin-service && npm run start:dev"
    exit 1
fi

echo ""
echo "2. Checking if product-service is running..."
PRODUCT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8002/health || echo "000")
if [ "$PRODUCT_STATUS" = "200" ]; then
    echo -e "${GREEN}✓${NC} Product-service is running"
else
    echo -e "${RED}✗${NC} Product-service is not running (status: $PRODUCT_STATUS)"
    echo "   Please start product-service: cd services/product-service && npm run start:dev"
    exit 1
fi

echo ""
echo "3. Testing product list API through admin-service..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8007/api/v1/products?page=1&limit=10)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "   HTTP Status: $HTTP_CODE"
echo "   Response: $BODY" | head -c 200

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "\n${GREEN}✓${NC} Product list API working!"
    echo ""
    echo "   Success! Service-to-service authentication is working correctly."
else
    echo -e "\n${RED}✗${NC} Product list API failed"
    echo ""
    echo "   Error details:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""
    echo "   Troubleshooting:"
    echo "   1. Check admin-service logs for service token generation errors"
    echo "   2. Check product-service logs for token verification errors"
    echo "   3. Verify JWT_PRIVATE_KEY is set in admin-service/.env"
    echo "   4. Verify ADMIN_SERVICE_PUBLIC_KEY is set in product-service/.env"
fi

echo ""
echo "=== Test Complete ==="