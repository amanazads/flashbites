#!/usr/bin/env python3
"""
FlashBites Business Onboarding E2E Test Suite
Tests the complete restaurant and delivery partner approval workflow
"""

import requests
import json
import time
import sys
from datetime import datetime

BASE_URL = "http://localhost:8080/api"
TIMESTAMP = int(time.time())

# Test tracking
PASSED = 0
FAILED = 0

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.YELLOW}{'='*55}{Colors.END}")
    print(f"{Colors.YELLOW}{text}{Colors.END}")
    print(f"{Colors.YELLOW}{'='*55}{Colors.END}\n")

def print_test(status, message):
    global PASSED, FAILED
    if status:
        print(f"{Colors.GREEN}✓ PASS{Colors.END}: {message}")
        PASSED += 1
    else:
        print(f"{Colors.RED}✗ FAIL{Colors.END}: {message}")
        FAILED += 1

def test_result(condition, message):
    print_test(condition, message)
    return condition

# 1. Setup: Health check and admin auth
print("\n" + "="*55)
print(f"{Colors.BLUE}FlashBites Business Onboarding E2E Test Suite{Colors.END}")
print("="*55)

print(f"\n{Colors.YELLOW}[SETUP] Checking servers...{Colors.END}")
try:
    resp = requests.get(f"{BASE_URL}/health", timeout=2)
    print(f"{Colors.GREEN}✓ Backend is running on port 8080{Colors.END}")
except:
    print(f"{Colors.RED}✗ Backend is not responding{Colors.END}")
    sys.exit(1)

print(f"\n{Colors.YELLOW}[SETUP] Authenticating as Admin...{Colors.END}")
admin_available = False
admin_token = None

try:
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@flashbites.com",
        "password": "admin123"
    }, timeout=5)
    data = resp.json()
    if data.get('data', {}).get('user', {}).get('role') == 'admin':
        admin_token = data['data']['accessToken']
        admin_available = True
        print(f"{Colors.GREEN}✓ Authenticated as admin{Colors.END}")
    else:
        print(f"{Colors.YELLOW}⚠ Could not authenticate as admin{Colors.END}")
except:
    print(f"{Colors.YELLOW}⚠ Could not authenticate as admin{Colors.END}")

print("\n" + "="*55)

# Test 1: Restaurant Registration
print_header("Test Suite 1: Restaurant Business Registration")

phone_rest_1 = f"987654{TIMESTAMP % 10000:04d}"
email_rest_1 = f"restaurant_{TIMESTAMP}@test.com"

print(f"{Colors.YELLOW}[1.1] Register New Restaurant{Colors.END}")
try:
    resp = requests.post(f"{BASE_URL}/auth/register-restaurant", json={
        "ownerName": "Test Owner",
        "restaurantName": f"Test Restaurant {TIMESTAMP}",
        "email": email_rest_1,
        "phone": phone_rest_1,
        "password": "Password123!",
        "city": "Delhi",
        "address": "123 Main Street, Delhi",
        "fssaiLicense": f"FSSAI{TIMESTAMP}"
    }, timeout=10)
    data = resp.json()
    
    if data.get('success') and data.get('data', {}).get('user', {}).get('approvalStatus') == 'pending':
        restaurant_id = data['data']['user']['_id']
        print(f"  - User ID: {restaurant_id}")
        print(f"  - Status: pending")
        test_result(True, "Restaurant registration creates pending approval")
    else:
        print(f"  - Error: {data.get('message', 'Unknown error')}")
        test_result(False, "Restaurant registration creates pending approval")
        restaurant_id = None
except Exception as e:
    print(f"  - Exception: {str(e)}")
    test_result(False, "Restaurant registration creates pending approval")
    restaurant_id = None

# Test 2: Delivery Partner Registration
print_header("Test Suite 2: Delivery Partner Registration")

phone_deliv_1 = f"876543{TIMESTAMP % 10000:04d}"
email_deliv_1 = f"delivery_{TIMESTAMP}@test.com"

print(f"{Colors.YELLOW}[2.1] Register New Delivery Partner{Colors.END}")
try:
    resp = requests.post(f"{BASE_URL}/auth/register-delivery", json={
        "name": "Test Delivery Partner",
        "email": email_deliv_1,
        "phone": phone_deliv_1,
        "password": "Password123!",
        "city": "Delhi"
    }, timeout=10)
    data = resp.json()
    
    if data.get('success') and data.get('data', {}).get('user', {}).get('approvalStatus') == 'pending':
        delivery_id = data['data']['user']['_id']
        print(f"  - User ID: {delivery_id}")
        print(f"  - Status: pending")
        test_result(True, "Delivery registration creates pending approval")
    else:
        print(f"  - Error: {data.get('message', 'Unknown error')}")
        test_result(False, "Delivery registration creates pending approval")
        delivery_id = None
except Exception as e:
    print(f"  - Exception: {str(e)}")
    test_result(False, "Delivery registration creates pending approval")
    delivery_id = None

# Test 3: Login Gating for Pending Users
print_header("Test Suite 3: Login Gating (Pending Users Cannot Login)")

print(f"{Colors.YELLOW}[3.1] Attempt Login with Pending Approval{Colors.END}")
try:
    resp = requests.post(f"{BASE_URL}/auth/business-login", json={
        "email": email_rest_1,
        "password": "Password123!",
        "expectedRole": "restaurant_owner"
    }, timeout=5)
    data = resp.json()
    
    msg = data.get('message', '')
    if 'pending' in msg.lower() or 'cannot' in msg.lower() or 'not' in msg.lower():
        print(f"  - Message: {msg}")
        test_result(True, "Pending user blocked from login")
    else:
        print(f"  - Message: {msg}")
        test_result(False, "Pending user blocked from login")
except Exception as e:
    print(f"  - Exception: {str(e)}")
    test_result(False, "Pending user blocked from login")

# Test 4: Admin Approval Flow
print_header("Test Suite 4: Admin Approval Flow")

if not admin_available:
    print(f"{Colors.YELLOW}[4] Skipping admin tests (admin not authenticated){Colors.END}")
    test_result(False, "Admin approval flow")
else:
    if restaurant_id:
        print(f"{Colors.YELLOW}[4.1] Admin Approves Restaurant{Colors.END}")
        try:
            headers = {"Authorization": f"Bearer {admin_token}"}
            resp = requests.patch(f"{BASE_URL}/admin/users/{restaurant_id}/approval", json={
                "status": "approved",
                "reason": "Documentation verified"
            }, headers=headers, timeout=5)
            data = resp.json()
            
            if data.get('data', {}).get('user', {}).get('approvalStatus') == 'approved':
                print(f"  - Status approved")
                test_result(True, "Admin can approve restaurant owner")
                
                # Try to login again
                print(f"\n{Colors.YELLOW}[4.2] Approved User Can Now Login{Colors.END}")
                resp = requests.post(f"{BASE_URL}/auth/business-login", json={
                    "email": email_rest_1,
                    "password": "Password123!",
                    "expectedRole": "restaurant_owner"
                }, timeout=5)
                data = resp.json()
                
                if data.get('data', {}).get('accessToken'):
                    test_result(True, "Approved restaurant owner can login")
                else:
                    test_result(False, "Approved restaurant owner can login")
            else:
                print(f"  - Error: {data.get('message', 'Unknown error')}")
                test_result(False, "Admin can approve restaurant owner")
        except Exception as e:
            print(f"  - Exception: {str(e)}")
            test_result(False, "Admin can approve restaurant owner")
    else:
        test_result(False, "Admin can approve restaurant owner")

# Test 5: Rejection with Reason
print_header("Test Suite 5: Rejection with Reason")

if not admin_available:
    print(f"{Colors.YELLOW}[5] Skipping rejection tests (admin not authenticated){Colors.END}")
    test_result(False, "Admin can reject with reason")
else:
    phone_rest_2 = f"987650{TIMESTAMP % 10000:04d}"
    email_rest_2 = f"restaurant_reject_{TIMESTAMP}@test.com"
    
    print(f"{Colors.YELLOW}[5.1] Register Restaurant for Rejection{Colors.END}")
    try:
        resp = requests.post(f"{BASE_URL}/auth/register-restaurant", json={
            "ownerName": "Reject Test Owner",
            "restaurantName": f"Reject Test {TIMESTAMP}",
            "email": email_rest_2,
            "phone": phone_rest_2,
            "password": "Password123!",
            "city": "Delhi",
            "address": "456 Test Street, Delhi",
            "fssaiLicense": f"FSSAI{TIMESTAMP}R"
        }, timeout=10)
        data = resp.json()
        
        if data.get('success'):
            reject_id = data['data']['user']['_id']
            
            # Reject it
            print(f"\n{Colors.YELLOW}[5.2] Admin Rejects with Reason{Colors.END}")
            headers = {"Authorization": f"Bearer {admin_token}"}
            resp = requests.patch(f"{BASE_URL}/admin/users/{reject_id}/approval", json={
                "status": "rejected",
                "reason": "FSSAI certificate not valid"
            }, headers=headers, timeout=5)
            data = resp.json()
            
            if data.get('data', {}).get('user', {}).get('approvalStatus') == 'rejected':
                reason = data['data']['user'].get('approvalNote', '')
                print(f" - Rejection reason: {reason}")
                test_result(True, "Admin can reject with reason")
                
                # Try to login
                print(f"\n{Colors.YELLOW}[5.3] Rejected User Login Shows Reason{Colors.END}")
                resp = requests.post(f"{BASE_URL}/auth/business-login", json={
                    "email": email_rest_2,
                    "password": "Password123!",
                    "expectedRole": "restaurant_owner"
                }, timeout=5)
                data = resp.json()
                msg = data.get('message', '')
                print(f"  - Message: {msg}")
                test_result('rejected' in msg.lower(), "Rejected user sees rejection feedback")
            else:
                test_result(False, "Admin can reject with reason")
        else:
            test_result(False, "Admin can reject with reason")
    except Exception as e:
        print(f"  - Exception: {str(e)}")
        test_result(False, "Admin can reject with reason")

# Test 6: Pending Status Message
print_header("Test Suite 6: Pending Status Message")

if not admin_available:
    print(f"{Colors.YELLOW}[6] Skipping pending tests (admin not authenticated){Colors.END}")
    test_result(False, "Admin can set pending status with note")
else:
    phone_rest_3 = f"987651{TIMESTAMP % 10000:04d}"
    email_rest_3 = f"restaurant_pending_{TIMESTAMP}@test.com"
    
    print(f"{Colors.YELLOW}[6.1] Register Restaurant for Pending Test{Colors.END}")
    try:
        resp = requests.post(f"{BASE_URL}/auth/register-restaurant", json={
            "ownerName": "Pending Test Owner",
            "restaurantName": f"Pending Test {TIMESTAMP}",
            "email": email_rest_3,
            "phone": phone_rest_3,
            "password": "Password123!",
            "city": "Delhi",
            "address": "789 Demo Street, Delhi",
            "fssaiLicense": f"FSSAI{TIMESTAMP}P"
        }, timeout=10)
        data = resp.json()
        
        if data.get('success'):
            pending_id = data['data']['user']['_id']
            
            # Update to pending with note
            print(f"\n{Colors.YELLOW}[6.2] Admin Sets to Pending with Note{Colors.END}")
            headers = {"Authorization": f"Bearer {admin_token}"}
            resp = requests.patch(f"{BASE_URL}/admin/users/{pending_id}/approval", json={
                "status": "pending",
                "reason": "Awaiting document verification"
            }, headers=headers, timeout=5)
            data = resp.json()
            
            if data.get('data', {}).get('user', {}).get('approvalStatus') == 'pending':
                note = data['data']['user'].get('approvalNote', '')
                print(f"  - Note: {note}")
                test_result(True, "Admin can set pending status with note")
                
                # Try to login
                print(f"\n{Colors.YELLOW}[6.3] Pending User Sees Pending Message{Colors.END}")
                resp = requests.post(f"{BASE_URL}/auth/business-login", json={
                    "email": email_rest_3,
                    "password": "Password123!",
                    "expectedRole": "restaurant_owner"
                }, timeout=5)
                data = resp.json()
                msg = data.get('message', '')
                print(f"  - Message: {msg}")
                test_result('pending' in msg.lower(), "Pending user sees pending message")
            else:
                test_result(False, "Admin can set pending status with note")
        else:
            test_result(False, "Admin can set pending status with note")
    except Exception as e:
        print(f"  - Exception: {str(e)}")
        test_result(False, "Admin can set pending status with note")

# Test 7: Delivery Partner Approval
print_header("Test Suite 7: Delivery Partner Approval")

if not admin_available:
    print(f"{Colors.YELLOW}[7] Skipping delivery tests (admin not authenticated){Colors.END}")
    test_result(False, "Admin can approve delivery partner")
elif delivery_id:
    print(f"{Colors.YELLOW}[7.1] Admin Approves Delivery Partner{Colors.END}")
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        resp = requests.patch(f"{BASE_URL}/admin/users/{delivery_id}/approval", json={
            "status": "approved",
            "reason": "Documents verified"
        }, headers=headers, timeout=5)
        data = resp.json()
        
        if data.get('data', {}).get('user', {}).get('approvalStatus') == 'approved':
            test_result(True, "Admin can approve delivery partner")
            
            # Try to login
            print(f"\n{Colors.YELLOW}[7.2] Approved Delivery Partner Can Login{Colors.END}")
            resp = requests.post(f"{BASE_URL}/auth/business-login", json={
                "email": email_deliv_1,
                "password": "Password123!",
                "expectedRole": "delivery_partner"
            }, timeout=5)
            data = resp.json()
            
            if data.get('data', {}).get('accessToken'):
                test_result(True, "Approved delivery partner can login")
            else:
                test_result(False, "Approved delivery partner can login")
        else:
            test_result(False, "Admin can approve delivery partner")
    except Exception as e:
        print(f"  - Exception: {str(e)}")
        test_result(False, "Admin can approve delivery partner")
else:
    test_result(False, "Admin can approve delivery partner")

# Summary
print_header("Test Summary")
print(f"Tests Passed: {Colors.GREEN}{PASSED}{Colors.END}")
print(f"Tests Failed: {Colors.RED}{FAILED}{Colors.END}")
print(f"Total Tests:  {Colors.BLUE}{PASSED + FAILED}{Colors.END}\n")

if FAILED == 0:
    print(f"{Colors.GREEN}✓ All tests passed!{Colors.END}")
    sys.exit(0)
else:
    print(f"{Colors.YELLOW}⚠ {FAILED} test(s) failed.{Colors.END}")
    sys.exit(1)
