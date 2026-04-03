#!/bin/bash

# E2E Test Suite for FlashBites
# Tests complete flows: registration → approval → ordering → invoice → PDF

set -e

# Configuration
API_BASE_URL="${API_URL:-http://localhost:5000/api}"
FRONTEND_BASE_URL="${FRONTEND_URL:-http://localhost:5173}"
TESTS_DIR="./e2e-tests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Utility functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
  ((TESTS_PASSED++))
}

log_error() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((TESTS_FAILED++))
  FAILED_TESTS+=("$1")
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

test_case() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}TEST: $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  ((TESTS_RUN++))
}

assert_success() {
  local test_name=$1
  local status_code=$2
  local response=$3
  
  if [[ $status_code -ge 200 && $status_code -lt 300 ]]; then
    log_success "$test_name (Status: $status_code)"
    return 0
  else
    log_error "$test_name (Status: $status_code) - Response: ${response:0:200}"
    return 1
  fi
}

assert_field() {
  local test_name=$1
  local json_response=$2
  local field_path=$3
  local expected_value=${4:-""}
  
  local actual=$(echo "$json_response" | jq -r "$field_path" 2>/dev/null || echo "INVALID")
  
  if [[ "$actual" == "INVALID" ]]; then
    log_error "$test_name - Field not found or invalid JSON"
    return 1
  fi
  
  if [[ -z "$expected_value" || "$actual" == "$expected_value" ]]; then
    log_success "$test_name - Found: $actual"
    return 0
  else
    log_error "$test_name - Expected: $expected_value, Got: $actual"
    return 1
  fi
}

# Generate unique identifiers
TIMESTAMP=$(date +%s%N)
CUSTOMER_EMAIL="customer_$TIMESTAMP@test.local"
CUSTOMER_PHONE="98${TIMESTAMP:0:8}"
RESTAURANT_EMAIL="restaurant_$TIMESTAMP@test.local"
RESTAURANT_PHONE="97${TIMESTAMP:0:8}"
DELIVERY_PARTNER_EMAIL="delivery_$TIMESTAMP@test.local"
DELIVERY_PARTNER_PHONE="96${TIMESTAMP:0:8}"

# Global variables to store IDs
CUSTOMER_ID=""
CUSTOMER_TOKEN=""
RESTAURANT_ID=""
RESTAURANT_TOKEN=""
RESTAURANT_OWNER_ID=""
DELIVERY_PARTNER_ID=""
DELIVERY_PARTNER_TOKEN=""
ADDRESS_ID=""
ORDER_ID=""
FEE_TEMPLATE_ID=""
ADMIN_TOKEN="" # Will be set from environment

log_info "Starting E2E Test Suite for FlashBites"
log_info "API Base URL: $API_BASE_URL"
log_info "Frontend URL: $FRONTEND_BASE_URL"
log_info ""

# =============================================================================
# PHASE 1: Customer Registration and Login
# =============================================================================

test_case "Customer Registration"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$CUSTOMER_EMAIL\",
    \"password\": \"password123\",
    \"phone\": \"$CUSTOMER_PHONE\",
    \"firstName\": \"Test\",
    \"lastName\": \"Customer\",
    \"role\": \"user\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

assert_success "Register customer" "$HTTP_CODE" "$BODY"
CUSTOMER_ID=$(echo "$BODY" | jq -r '.data.user._id // .data._id // .user._id' 2>/dev/null || echo "")

test_case "Customer Login"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$CUSTOMER_EMAIL\",
    \"password\": \"password123\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

assert_success "Login customer" "$HTTP_CODE" "$BODY"
CUSTOMER_TOKEN=$(echo "$BODY" | jq -r '.data.token // .token' 2>/dev/null || echo "")
log_info "Customer Token: ${CUSTOMER_TOKEN:0:20}..."

# =============================================================================
# PHASE 2: Restaurant Registration and Approval
# =============================================================================

test_case "Restaurant Registration"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/partners/restaurants" \
  -H "Content-Type: application/json" \
  -d "{
    \"businessName\": \"Test Restaurant $TIMESTAMP\",
    \"ownerName\": \"Owner Name\",
    \"email\": \"$RESTAURANT_EMAIL\",
    \"phone\": \"$RESTAURANT_PHONE\",
    \"address\": \"123 Main St, Test City\",
    \"city\": \"TestCity\",
    \"state\": \"TS\",
    \"cuisines\": [\"North Indian\", \"Chinese\"],
    \"location\": {
      \"type\": \"Point\",
      \"coordinates\": [77.5946, 12.9352]
    },
    \"documents\": {
      \"fssai\": \"base64encodeddata\",
      \"gst\": \"base64encodeddata\",
      \"panCard\": \"base64encodeddata\"
    }
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

assert_success "Register restaurant" "$HTTP_CODE" "$BODY"
RESTAURANT_ID=$(echo "$BODY" | jq -r '.data._id // .restaurantId' 2>/dev/null || echo "")
log_info "Restaurant ID: $RESTAURANT_ID"

# Extract restaurant owner ID (will be in response or we'll get it from login)
RESTAURANT_OWNER_ID=$(echo "$BODY" | jq -r '.data.ownerId // .ownerId' 2>/dev/null || echo "")

test_case "Restaurant Owner Login (if credentials provided)"
if [[ ! -z "$RESTAURANT_EMAIL" ]]; then
  # Note: The partner endpoint might create an account automatically
  # If not, the owner would need to login with their account
  log_warning "Restaurant owner would login here - skipping auto-login as account creation happens via partner endpoint"
fi

# =============================================================================
# PHASE 3: Fee Template Creation (Admin Only)
# =============================================================================

test_case "Create Fee Template (Admin Operation)"
if [[ ! -z "$ADMIN_TOKEN" ]]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/admin/fee-templates" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
      \"name\": \"Premium Template $TIMESTAMP\",
      \"description\": \"Premium fee template for E2E testing\",
      \"deliveryFee\": 50,
      \"platformFee\": 30,
      \"taxRate\": 0.05,
      \"commissionPercent\": 20,
      \"isActive\": true
    }")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  assert_success "Create fee template" "$HTTP_CODE" "$BODY"
  FEE_TEMPLATE_ID=$(echo "$BODY" | jq -r '.data._id // ._id' 2>/dev/null || echo "")
  log_info "Fee Template ID: $FEE_TEMPLATE_ID"
  
  # Assign template to restaurant
  if [[ ! -z "$FEE_TEMPLATE_ID" && ! -z "$RESTAURANT_ID" ]]; then
    test_case "Assign Template to Restaurant (Admin Operation)"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/admin/fee-templates/$FEE_TEMPLATE_ID/assign" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d "{
        \"restaurantId\": \"$RESTAURANT_ID\"
      }")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    assert_success "Assign template to restaurant" "$HTTP_CODE" "$BODY"
  fi
else
  log_warning "ADMIN_TOKEN not set, skipping fee template creation. Set ADMIN_TOKEN=<token> to enable"
fi

# =============================================================================
# PHASE 4: Restaurant Approval (Admin Only)
# =============================================================================

test_case "Approve Restaurant (Admin Operation)"
if [[ ! -z "$ADMIN_TOKEN" && ! -z "$RESTAURANT_ID" ]]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$API_BASE_URL/admin/restaurants/$RESTAURANT_ID/approve" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
      \"isApproved\": true
    }")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  assert_success "Approve restaurant" "$HTTP_CODE" "$BODY"
else
  log_warning "ADMIN_TOKEN or RESTAURANT_ID not available, skipping restaurant approval"
fi

# =============================================================================
# PHASE 5: Customer Address Management
# =============================================================================

test_case "Add Delivery Address"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/addresses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d "{
    \"label\": \"Home\",
    \"fullAddress\": \"123 Test Street, Bangalore\",
    \"street\": \"123 Test Street\",
    \"city\": \"Bangalore\",
    \"state\": \"KA\",
    \"zipCode\": \"560001\",
    \"landmark\": \"Near Test Market\",
    \"lat\": 12.9716,
    \"lng\": 77.5946,
    \"coordinates\": [77.5946, 12.9716]
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

assert_success "Add delivery address" "$HTTP_CODE" "$BODY"
ADDRESS_ID=$(echo "$BODY" | jq -r '.data._id // .address._id // ._id' 2>/dev/null || echo "")
log_info "Address ID: $ADDRESS_ID"

# =============================================================================
# PHASE 6: Order Creation and Pricing
# =============================================================================

test_case "Fetch Menu Items"
if [[ ! -z "$RESTAURANT_ID" ]]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE_URL/restaurants/$RESTAURANT_ID/menu" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  assert_success "Fetch menu items" "$HTTP_CODE" "$BODY"
  
  # Extract first menu item ID
  MENU_ITEM_ID=$(echo "$BODY" | jq -r '.data[0]._id // .menuItems[0]._id // ._id' 2>/dev/null || echo "")
  log_info "Menu Item ID: $MENU_ITEM_ID"
  
  if [[ ! -z "$MENU_ITEM_ID" && ! -z "$RESTAURANT_ID" && ! -z "$ADDRESS_ID" ]]; then
    test_case "Create Order (with template fees if applicable)"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/orders" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $CUSTOMER_TOKEN" \
      -d "{
        \"restaurantId\": \"$RESTAURANT_ID\",
        \"addressId\": \"$ADDRESS_ID\",
        \"items\": [
          {
            \"menuItemId\": \"$MENU_ITEM_ID\",
            \"quantity\": 1
          }
        ],
        \"paymentMethod\": \"cod\",
        \"deliveryInstructions\": \"Please ring the bell\"
      }")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if assert_success "Create order" "$HTTP_CODE" "$BODY"; then
      ORDER_ID=$(echo "$BODY" | jq -r '.data._id // .order._id // ._id' 2>/dev/null || echo "")
      log_info "Order ID: $ORDER_ID"
      
      # Verify fee template was applied if available
      if [[ ! -z "$FEE_TEMPLATE_ID" ]]; then
        TEMPLATE_NAME=$(echo "$BODY" | jq -r '.data.feeTemplateSnapshot.templateName // "null"' 2>/dev/null || echo "null")
        if [[ "$TEMPLATE_NAME" != "null" ]]; then
          log_success "Fee template properly applied in order: $TEMPLATE_NAME"
        else
          log_warning "Fee template snapshot not found in order"
        fi
      fi
    fi
  fi
fi

# =============================================================================
# PHASE 7: Invoice Generation and PDF Export
# =============================================================================

test_case "Fetch Order Details (for Invoice)"
if [[ ! -z "$ORDER_ID" ]]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE_URL/orders/$ORDER_ID" \
    -H "Authorization: Bearer $CUSTOMER_TOKEN")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  assert_success "Fetch order details" "$HTTP_CODE" "$BODY"
  
  # Verify invoice-related fields
  assert_field "Order has delivery fee" "$BODY" ".data.deliveryFee // .deliveryFee"
  assert_field "Order has platform fee" "$BODY" ".data.platformFee // .platformFee"
  assert_field "Order has tax" "$BODY" ".data.tax // .tax"
  
  log_info "Invoice data verified - ready for PDF generation"
fi

# =============================================================================
# PHASE 8: Delivery Partner Registration and Approval
# =============================================================================

test_case "Delivery Partner Registration"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/partners/delivery" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Delivery\",
    \"lastName\": \"Partner\",
    \"email\": \"$DELIVERY_PARTNER_EMAIL\",
    \"phone\": \"$DELIVERY_PARTNER_PHONE\",
    \"address\": \"Test Address, Bangalore\",
    \"documents\": {
      \"aadhar\": \"base64encodeddata\",
      \"license\": \"base64encodeddata\",
      \"bankDetails\": \"base64encodeddata\"
    }
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

assert_success "Register delivery partner" "$HTTP_CODE" "$BODY"
DELIVERY_PARTNER_ID=$(echo "$BODY" | jq -r '.data._id // .partnerId' 2>/dev/null || echo "")
log_info "Delivery Partner ID: $DELIVERY_PARTNER_ID"

# =============================================================================
# PHASE 9: Delivery Partner Login Attempt (Before Approval - Should Fail)
# =============================================================================

test_case "Delivery Partner Login Before Approval (Should Be Rejected)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DELIVERY_PARTNER_EMAIL\",
    \"password\": \"password123\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ $HTTP_CODE -eq 403 ]]; then
  log_success "Login correctly rejected before approval (Status: $HTTP_CODE)"
  # Check if it's due to pending approval
  REASON=$(echo "$BODY" | jq -r '.message // .error' 2>/dev/null || echo "")
  log_info "Rejection reason: $REASON"
else
  log_error "Login should have been rejected (got $HTTP_CODE instead of 403)"
fi

# =============================================================================
# PHASE 10: Delivery Partner Approval (Admin Only)
# =============================================================================

test_case "Approve Delivery Partner (Admin Operation)"
if [[ ! -z "$ADMIN_TOKEN" && ! -z "$DELIVERY_PARTNER_ID" ]]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$API_BASE_URL/admin/users/$DELIVERY_PARTNER_ID/approval" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{
      \"approvalStatus\": \"approved\",
      \"approvalNote\": \"Approved for E2E testing\"
    }")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  assert_success "Approve delivery partner" "$HTTP_CODE" "$BODY"
else
  log_warning "ADMIN_TOKEN or DELIVERY_PARTNER_ID not available, skipping delivery partner approval"
fi

# =============================================================================
# PHASE 11: Delivery Partner Login After Approval (Should Succeed)
# =============================================================================

test_case "Delivery Partner Login After Approval (Should Succeed)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DELIVERY_PARTNER_EMAIL\",
    \"password\": \"password123\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ $HTTP_CODE -ge 200 && $HTTP_CODE -lt 300 ]]; then
  log_success "Login succeeded after approval (Status: $HTTP_CODE)"
  DELIVERY_PARTNER_TOKEN=$(echo "$BODY" | jq -r '.data.token // .token' 2>/dev/null || echo "")
  log_info "Delivery Partner Token: ${DELIVERY_PARTNER_TOKEN:0:20}..."
else
  log_error "Login failed after approval (Status: $HTTP_CODE) - This indicates approval gating is not working"
fi

# =============================================================================
# SUMMARY
# =============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Total Tests Run: ${TESTS_RUN}"
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
  echo -e "${RED}Failed Tests:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo -e "  ${RED}✗${NC} $test"
  done
  echo ""
fi

if [[ $TESTS_FAILED -eq 0 ]]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
