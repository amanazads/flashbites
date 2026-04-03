# E2E Test Suite Documentation

## Overview

This E2E (End-to-End) test suite validates the complete FlashBites platform workflows including:

1. **Customer Registration & Login** - User creation and authentication
2. **Restaurant Registration & Approval** - Restaurant onboarding and admin approval
3. **Fee Template Management** - Creation and assignment of fee templates
4. **Restaurant Approval** - Admin approval of restaurants
5. **Order Creation** - Complete order flow with fee calculations
6. **Invoice Generation** - Order details and fee visibility
7. **Delivery Partner Registration** - Delivery partner onboarding
8. **Delivery Partner Approval Gating** - Verification that unapproved partners cannot login
9. **Approved Partner Login** - Successful login after admin approval

## Running the Tests

### Prerequisites

- Backend server running on `http://localhost:5000` (or specify via `API_URL`)
- Database configured and accessible
- Optional: Admin account with valid token for admin operations

### Basic Usage

```bash
# Run tests with default settings
./e2e-test-suite.sh

# Run with custom API URL
API_URL=http://localhost:3000/api ./e2e-test-suite.sh

# Run with admin token for full test coverage
ADMIN_TOKEN="your-admin-token-here" ./e2e-test-suite.sh

# Run with all custom settings
API_URL=http://api.example.com/api \
FRONTEND_URL=http://example.com \
ADMIN_TOKEN="admin-token" \
./e2e-test-suite.sh
```

## Test Phases

### Phase 1: Customer Registration and Login
- Creates a new customer account
- Logs in and obtains authentication token
- **Expected**: Customer can register and login successfully

### Phase 2: Restaurant Registration and Approval
- Registers a new restaurant as a business
- Verifies restaurant creation
- **Expected**: Restaurant appears in the system as unapproved

### Phase 3: Fee Template Creation (Admin)
- Admin creates a new fee template with custom fees
- Fee structure:
  - Delivery Fee: ₹50
  - Platform Fee: ₹30
  - Tax Rate: 5%
  - Commission: 20%
- **Expected**: Template created successfully

### Phase 4: Template Assignment
- Admin assigns the fee template to the restaurant
- Verifies assignment
- **Expected**: Restaurant now uses the template for order pricing

### Phase 5: Restaurant Approval (Admin)
- Admin approves the restaurant
- Restaurant becomes available for orders
- **Expected**: Restaurant status changes to approved

### Phase 6: Customer Address Management
- Customer adds a delivery address
- Address is geocoded and stored
- **Expected**: Address is saved and available for orders

### Phase 7: Order Creation
- Customer creates an order from the approved restaurant
- Order is priced using the fee template
- **Expected**: 
  - Order created successfully
  - Fees calculated from template
  - Fee template snapshot saved in order for audit

### Phase 8: Invoice Generation
- Order details fetched
- Invoice fields verified (delivery fee, platform fee, tax)
- **Expected**: All fee fields present and correct

### Phase 9: Delivery Partner Registration
- New delivery partner registers
- Profile created in system
- **Expected**: Delivery partner account created with pending approval

### Phase 10: Approval Gating Test (Before Approval)
- Attempt to login as unapproved delivery partner
- **Expected**: Login FAILS with 403 Forbidden status
- **Critical Test**: Validates approval gating enforcement

### Phase 11: Delivery Partner Approval (Admin)
- Admin approves the delivery partner
- Partner approval status updated
- **Expected**: Approval status changed to approved

### Phase 12: Approval Gating Test (After Approval)
- Login as approved delivery partner
- **Expected**: Login SUCCEEDS, token issued
- **Critical Test**: Validates approved partners can login

## Expected Results

For a complete test run with admin token:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Tests Run: 20+
Tests Passed: [all green]
Tests Failed: 0

✓ All tests passed!
```

## Key Validations

### Approval Gating
The most critical validation is that:
- **Unapproved users (delivery partners)** cannot login (403 Forbidden)
- **Approved users** can login successfully

### Fee Template Application
Validates that:
- Fee templates are created successfully
- Templates are assigned to restaurants
- Order pricing uses template fees instead of global settings
- Template details are snapshot in orders for historical audit

### Order Pricing
Verifies that orders contain:
- Correct delivery fee (from template or global setting)
- Correct platform fee
- Correct tax calculation
- Proper fee visibility based on configuration

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `API_URL` | `http://localhost:5000/api` | Backend API endpoint |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend application URL |
| `ADMIN_TOKEN` | empty | Authentication token for admin operations |

## Troubleshooting

### "Restaurant is not available" error
- Ensure the restaurant is approved by admin before creating orders
- Check that restaurant isActive flag is true

### "Delivery not available in your area" error
- The test address may be outside the restaurant's delivery zone
- Either configure delivery zones properly or use addresses within the service area

### "Menu item not found" error
- Add menu items to the restaurant before running tests
- The test script tries to use the first available menu item

### Approval tests fail
- Ensure ADMIN_TOKEN environment variable is set
- Check that the admin user has proper permissions
- Verify database is writable

### Connection errors
- Check that backend server is running
- Verify API_URL is correct
- Check firewall/network connectivity

## Notes

- Each test run creates unique test data (using timestamps)
- Test data is NOT automatically cleaned up
- Admin operations require ADMIN_TOKEN (not required for basic flows)
- Tests run sequentially and some tests depend on previous ones
- Failed tests can indicate missing backend functionality or configuration issues
