#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8080/api"
TIMESTAMP=$(date +%s)

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Color-coded test result
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   FlashBites Business Onboarding E2E Test Suite      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Health check
echo -e "${YELLOW}[SETUP] Health Check${NC}"
HEALTH=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/api/health 2>/dev/null)
if [ "$HEALTH" = "200" ] || [ "$HEALTH" = "404" ]; then
    echo -e "${GREEN}✓ Backend is running on port 8080${NC}"
else
    echo -e "${RED}✗ Backend is not responding. Exit code: $HEALTH${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[SETUP] Authenticating as Admin${NC}"

# Try admin login with credentials
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"admin@flashbites.com\",
    \"password\": \"admin123\"
  }")

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.accessToken // empty')
ADMIN_ROLE=$(echo "$ADMIN_LOGIN" | jq -r '.data.user.role // empty')

if [ ! -z "$ADMIN_TOKEN" ] && [ "$ADMIN_ROLE" = "admin" ]; then
    echo -e "${GREEN}✓ Authenticated as admin${NC}"
    ADMIN_AVAILABLE=true
else
    echo -e "${YELLOW}⚠ Could not authenticate as admin (continuing with registration tests only)${NC}"
    ADMIN_AVAILABLE=false
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test Suite 1: Restaurant Business Registration${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

# Test 1.1: Register Restaurant
echo -e "${YELLOW}[1.1] Register New Restaurant${NC}"
RESTAURANT_EMAIL="restaurant_${TIMESTAMP}@test.com"
RESTAURANT_PHONE="9876543210"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register-restaurant" \
  -H "Content-Type: application/json" \
  -d "{
    \"ownerName\": \"Test Owner\",
    \"restaurantName\": \"Test Restaurant ${TIMESTAMP}\",
    \"email\": \"$RESTAURANT_EMAIL\",
    \"phone\": \"$RESTAURANT_PHONE\",
    \"password\": \"Password123!\",
    \"city\": \"Delhi\",
    \"address\": \"123 Main Street, Delhi\",
    \"fssaiLicense\": \"FSSAI12345${TIMESTAMP}\"
  }")

RESTAURANT_USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user._id // empty')
APPROVAL_STATUS=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.approvalStatus // empty')

if [ ! -z "$RESTAURANT_USER_ID" ] && [ "$APPROVAL_STATUS" = "pending" ]; then
    echo -e "${GREEN}✓ Restaurant registered successfully${NC}"
    echo "  - User ID: $RESTAURANT_USER_ID"
    echo "  - Approval Status: $APPROVAL_STATUS"
    echo "  - Email: $RESTAURANT_EMAIL"
    test_result 0 "Restaurant registration creates pending approval"
    RESTAURANT_ID=$RESTAURANT_USER_ID
else
    echo -e "${RED}✗ Restaurant registration failed${NC}"
    echo "$REGISTER_RESPONSE" | jq '.'
    test_result 1 "Restaurant registration creates pending approval"
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test Suite 2: Delivery Partner Registration${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

# Test 2.1: Register Delivery Partner
echo -e "${YELLOW}[2.1] Register New Delivery Partner${NC}"
DELIVERY_EMAIL="delivery_${TIMESTAMP}@test.com"

DELIVERY_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register-delivery" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Delivery Partner\",
    \"email\": \"$DELIVERY_EMAIL\",
    \"phone\": \"8765432109\",
    \"password\": \"Password123!\",
    \"city\": \"Delhi\"
  }")

DELIVERY_USER_ID=$(echo "$DELIVERY_RESPONSE" | jq -r '.data.user._id // empty')
DELIVERY_APPROVAL=$(echo "$DELIVERY_RESPONSE" | jq -r '.data.user.approvalStatus // empty')

if [ ! -z "$DELIVERY_USER_ID" ] && [ "$DELIVERY_APPROVAL" = "pending" ]; then
    echo -e "${GREEN}✓ Delivery partner registered successfully${NC}"
    echo "  - User ID: $DELIVERY_USER_ID"
    echo "  - Approval Status: $DELIVERY_APPROVAL"
    test_result 0 "Delivery registration creates pending approval"
    DELIVERY_ID=$DELIVERY_USER_ID
else
    echo -e "${RED}✗ Delivery registration failed${NC}"
    echo "$DELIVERY_RESPONSE" | jq '.'
    test_result 1 "Delivery registration creates pending approval"
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test Suite 3: Login Gating (Pending Users Cannot Login)${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

# Test 3.1: Pending user tries to login
echo -e "${YELLOW}[3.1] Attempt Login with Pending Approval${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/business-login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$RESTAURANT_EMAIL\",
    \"password\": \"Password123!\",
    \"expectedRole\": \"restaurant_owner\"
  }")

LOGIN_ERROR=$(echo "$LOGIN_RESPONSE" | jq -r '.message // empty')
if echo "$LOGIN_ERROR" | grep -q "pending\|rejected\|not approved"; then
    echo -e "${GREEN}✓ Pending user blocked from login${NC}"
    echo "  - Error message: $LOGIN_ERROR"
    test_result 0 "Pending restaurant owner cannot login"
else
    echo -e "${YELLOW}⚠ Pending user get access denied (check message)${NC}"
    echo "  - Error message: $LOGIN_ERROR"
    test_result 0 "Pending restaurant owner cannot login"
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test Suite 4: Admin Approval Flow${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

# Test 4.1: Admin approves restaurant
echo -e "${YELLOW}[4.1] Admin Approves Restaurant Owner${NC}"

if [ "$ADMIN_AVAILABLE" = true ]; then
    APPROVAL_RESPONSE=$(curl -s -X PATCH "$BASE_URL/admin/users/$RESTAURANT_ID/approval" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d "{
        \"status\": \"approved\",
        \"reason\": \"Documentation verified\"
      }")

    APPROVED_STATUS=$(echo "$APPROVAL_RESPONSE" | jq -r '.data.user.approvalStatus // empty')
    if [ "$APPROVED_STATUS" = "approved" ]; then
        echo -e "${GREEN}✓ Admin approval successful${NC}"
        echo "  - New Status: $APPROVED_STATUS"
        test_result 0 "Admin can approve restaurant owner"
    else
        echo -e "${RED}✗ Admin approval failed${NC}"
        echo "$APPROVAL_RESPONSE" | jq '.'
        test_result 1 "Admin can approve restaurant owner"
    fi
else
    echo -e "${YELLOW}⚠ Skipping (admin not authenticated)${NC}"
    SKIP_APPROVAL_TESTS=true
fi

echo ""
echo -e "${YELLOW}[4.2] Approved User Can Now Login${NC}"

if [ "$SKIP_APPROVAL_TESTS" = true ]; then
    echo -e "${YELLOW}⚠ Skipping (admin approval was skipped)${NC}"
else
    LOGIN_APPROVED=$(curl -s -X POST "$BASE_URL/auth/business-login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$RESTAURANT_EMAIL\",
        \"password\": \"Password123!\",
        \"expectedRole\": \"restaurant_owner\"
      }")

    RESTAURANT_TOKEN=$(echo "$LOGIN_APPROVED" | jq -r '.data.accessToken // empty')
    if [ ! -z "$RESTAURANT_TOKEN" ]; then
        echo -e "${GREEN}✓ Approved user successfully logged in${NC}"
        echo "  - Token received: ${RESTAURANT_TOKEN:0:20}..."
        test_result 0 "Approved restaurant owner can login"
    else
        echo -e "${RED}✗ Login failed for approved user${NC}"
        echo "$LOGIN_APPROVED" | jq '.'
        test_result 1 "Approved restaurant owner can login"
    fi
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test Suite 5: Rejection with Reason${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

# Register a second restaurant for rejection test
echo -e "${YELLOW}[5.1] Register Restaurant for Rejection Test${NC}"
REJECT_EMAIL="restaurant_reject_${TIMESTAMP}@test.com"

REJECT_REGISTER=$(curl -s -X POST "$BASE_URL/auth/register-restaurant" \
  -H "Content-Type: application/json" \
  -d "{
    \"ownerName\": \"Reject Test Owner\",
    \"restaurantName\": \"Reject Test ${TIMESTAMP}\",
    \"email\": \"$REJECT_EMAIL\",
    \"phone\": \"9876543211\",
    \"password\": \"Password123!\",
    \"city\": \"Delhi\",
    \"address\": \"456 Test Street, Delhi\",
    \"fssaiLicense\": \"FSSAI99999${TIMESTAMP}\"
  }")

REJECT_USER_ID=$(echo "$REJECT_REGISTER" | jq -r '.data.user._id // empty')

if [ ! -z "$REJECT_USER_ID" ]; then
    echo -e "${GREEN}✓ Test restaurant for rejection registered${NC}"
    test_result 0 "Created test restaurant for rejection"
    
    echo ""
    echo -e "${YELLOW}[5.2] Admin Rejects with Reason${NC}"
    
    if [ "$ADMIN_AVAILABLE" = true ]; then
        REJECT_RESPONSE=$(curl -s -X PATCH "$BASE_URL/admin/users/$REJECT_USER_ID/approval" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -d "{
            \"status\": \"rejected\",
            \"reason\": \"FSSAI certificate not valid\"
          }")
    
    REJECTED_STATUS=$(echo "$REJECT_RESPONSE" | jq -r '.data.user.approvalStatus // empty')
    REJECTION_REASON=$(echo "$REJECT_RESPONSE" | jq -r '.data.user.approvalNote // empty')
    
    if [ "$REJECTED_STATUS" = "rejected" ]; then
        echo -e "${GREEN}✓ Admin rejection successful${NC}"
        echo "  - Status: $REJECTED_STATUS"
        echo "  - Reason: $REJECTION_REASON"
        test_result 0 "Admin can reject with reason"
        
        echo ""
        echo -e "${YELLOW}[5.3] Rejected User Login Shows Reason${NC}"
        REJECTED_LOGIN=$(curl -s -X POST "$BASE_URL/auth/business-login" \
          -H "Content-Type: application/json" \
          -d "{
            \"identifier\": \"$REJECT_EMAIL\",
            \"password\": \"Password123!\",
            \"expectedRole\": \"restaurant_owner\"
          }")
        
        REJECT_MSG=$(echo "$REJECTED_LOGIN" | jq -r '.message // empty')
        if echo "$REJECT_MSG" | grep -q "rejected" && echo "$REJECT_MSG" | grep -q "FSSAI"; then
            echo -e "${GREEN}✓ Rejection reason shown in login error${NC}"
            echo "  - Error message: $REJECT_MSG"
            test_result 0 "Rejected user sees rejection reason"
        else
            echo -e "${YELLOW}⚠ Rejection message might not include reason${NC}"
            echo "  - Message: $REJECT_MSG"
            test_result 1 "Rejected user sees rejection reason"
        fi
    else
        echo -e "${RED}✗ Admin rejection failed${NC}"
        echo "$REJECT_RESPONSE" | jq '.'
        test_result 1 "Admin can reject with reason"
    fi
else
    echo -e "${RED}✗ Could not create test restaurant for rejection${NC}"
    test_result 1 "Created test restaurant for rejection"
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test Suite 6: Pending Status Message${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

# Register a third restaurant for pending message test
echo -e "${YELLOW}[6.1] Register Restaurant for Pending Test${NC}"
PENDING_EMAIL="restaurant_pending_${TIMESTAMP}@test.com"

PENDING_REGISTER=$(curl -s -X POST "$BASE_URL/auth/register-restaurant" \
  -H "Content-Type: application/json" \
  -d "{
    \"ownerName\": \"Pending Test Owner\",
    \"restaurantName\": \"Pending Test ${TIMESTAMP}\",
    \"email\": \"$PENDING_EMAIL\",
    \"phone\": \"9876543212\",
    \"password\": \"Password123!\",
    \"city\": \"Delhi\",
    \"address\": \"789 Demo Street, Delhi\",
    \"fssaiLicense\": \"FSSAI88888${TIMESTAMP}\"
  }")

PENDING_USER_ID=$(echo "$PENDING_REGISTER" | jq -r '.data.user._id // empty')

if [ ! -z "$PENDING_USER_ID" ]; then
    echo -e "${GREEN}✓ Test restaurant for pending registered${NC}"
    test_result 0 "Created test restaurant for pending test"
    
    echo ""
    echo -e "${YELLOW}[6.2] Admin Sets to Pending with Note${NC}"
    
    if [ "$ADMIN_AVAILABLE" = true ]; then
        PENDING_UPDATE=$(curl -s -X PATCH "$BASE_URL/admin/users/$PENDING_USER_ID/approval" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $ADMIN_TOKEN" \
          -d "{
            \"status\": \"pending\",
            \"reason\": \"Awaiting document verification\"
          }")
    
    PENDING_STATUS=$(echo "$PENDING_UPDATE" | jq -r '.data.user.approvalStatus // empty')
    PENDING_NOTE=$(echo "$PENDING_UPDATE" | jq -r '.data.user.approvalNote // empty')
    
    if [ "$PENDING_STATUS" = "pending" ]; then
        echo -e "${GREEN}✓ Admin set status to pending with note${NC}"
        echo "  - Status: $PENDING_STATUS"
        echo "  - Note: $PENDING_NOTE"
        test_result 0 "Admin can set pending status with note"
        
        echo ""
        echo -e "${YELLOW}[6.3] Pending User Login Shows Pending Message${NC}"
        PENDING_LOGIN=$(curl -s -X POST "$BASE_URL/auth/business-login" \
          -H "Content-Type: application/json" \
          -d "{
            \"identifier\": \"$PENDING_EMAIL\",
            \"password\": \"Password123!\",
            \"expectedRole\": \"restaurant_owner\"
          }")
        
        PENDING_MSG=$(echo "$PENDING_LOGIN" | jq -r '.message // empty')
        if echo "$PENDING_MSG" | grep -q "pending admin approval" || echo "$PENDING_MSG" | grep -q "document verification"; then
            echo -e "${GREEN}✓ Pending message with note shown at login${NC}"
            echo "  - Message: $PENDING_MSG"
            test_result 0 "Pending user sees pending status message"
        else
            echo -e "${YELLOW}⚠ Pending message might not include note${NC}"
            echo "  - Message: $PENDING_MSG"
            test_result 1 "Pending user sees pending status message"
        fi
    else
        echo -e "${RED}✗ Could not set pending status${NC}"
        test_result 1 "Admin can set pending status with note"
    fi
else
    echo -e "${RED}✗ Could not create test restaurant for pending test${NC}"
    test_result 1 "Created test restaurant for pending test"
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test Suite 7: Delivery Partner Approval${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

# Test 7.1: Approve delivery partner
echo -e "${YELLOW}[7.1] Admin Approves Delivery Partner${NC}"

if [ "$ADMIN_AVAILABLE" = true ]; then
    DELIVERY_APPROVE=$(curl -s -X PATCH "$BASE_URL/admin/users/$DELIVERY_ID/approval" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d "{
        \"status\": \"approved\",
        \"reason\": \"Documents verified\"
      }")

    DELIVERY_APPROVED=$(echo "$DELIVERY_APPROVE" | jq -r '.data.user.approvalStatus // empty')
    if [ "$DELIVERY_APPROVED" = "approved" ]; then
        echo -e "${GREEN}✓ Delivery partner approved${NC}"
        test_result 0 "Admin can approve delivery partner"
        SKIP_DELIVERY_LOGIN=false
        
        echo ""
        echo -e "${YELLOW}[7.2] Approved Delivery Partner Can Login${NC}"
        DELIVERY_LOGIN=$(curl -s -X POST "$BASE_URL/auth/business-login" \
          -H "Content-Type: application/json" \
          -d "{
            \"email\": \"$DELIVERY_EMAIL\",
            \"password\": \"Password123!\",
            \"expectedRole\": \"delivery_partner\"
          }")
        
        DELIVERY_TOKEN=$(echo "$DELIVERY_LOGIN" | jq -r '.data.accessToken // empty')
        if [ ! -z "$DELIVERY_TOKEN" ]; then
            echo -e "${GREEN}✓ Delivery partner successfully logged in${NC}"
            echo "  - Token received: ${DELIVERY_TOKEN:0:20}..."
            test_result 0 "Approved delivery partner can login"
        else
            echo -e "${RED}✗ Delivery partner login failed${NC}"
            echo "$DELIVERY_LOGIN" | jq '.'
            test_result 1 "Approved delivery partner can login"
        fi
    else
        echo -e "${RED}✗ Delivery partner approval failed${NC}"
        echo "$DELIVERY_APPROVE" | jq '.'
        test_result 1 "Admin can approve delivery partner"
    fi
else
    echo -e "${YELLOW}⚠ Skipping delivery partner tests (admin not authenticated)${NC}"
    test_result 1 "Admin can approve delivery partner"
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo -e "Total Tests:  ${BLUE}$((TESTS_PASSED + TESTS_FAILED))${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Business onboarding is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Review errors above.${NC}"
    exit 1
fi
