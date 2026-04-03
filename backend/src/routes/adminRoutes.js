const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleAuth');

const {
  getDashboardStats,
  getAllUsers,
  getDeliveryPartnerDutyBoard,
  getDeliveryPartnerEarningsControl,
  updateGlobalDeliveryPartnerEarningsConfig,
  updateDeliveryPartnerEarningsConfig,
  resetAllDeliveryPartnerEarningsOverrides,
  getAllOrders,
  approveRestaurant,
  blockUser,
  updateUserRole,
  getAllRestaurants,
  updateRestaurantPayoutRate,
  saveRestaurantDeliveryZone,
  getRestaurantOnboardingDetail,
  regenerateRestaurantLoginCredentials,
  updateUserApproval,
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  getComprehensiveAnalytics,
  getAccountDeletionRequests,
  reviewAccountDeletionRequest,
  getPlatformSettings,
  updatePlatformSettings,
  getDeliveryTrackingDashboard,
  getAllFeeTemplates,
  createFeeTemplate,
  updateFeeTemplate,
  deleteFeeTemplate,
  assignRestaurantToTemplate,
  removeRestaurantFromTemplate
} = require('../controllers/adminController');

router.use(protect, restrictTo('admin')); // All admin routes

router.get('/dashboard', getDashboardStats);
router.get('/analytics', getComprehensiveAnalytics);
router.get('/users', getAllUsers);
router.get('/delivery-partners/duty-board', getDeliveryPartnerDutyBoard);
router.get('/delivery-partners/earnings-control', getDeliveryPartnerEarningsControl);
router.put('/delivery-partners/earnings-control/global', updateGlobalDeliveryPartnerEarningsConfig);
router.put('/delivery-partners/earnings-control/reset-all', resetAllDeliveryPartnerEarningsOverrides);
router.put('/delivery-partners/:id/earnings-control', updateDeliveryPartnerEarningsConfig);
router.get('/delivery-tracking', getDeliveryTrackingDashboard);
router.get('/orders', getAllOrders);
router.get('/restaurants', getAllRestaurants);
router.get('/restaurants/:id/onboarding', getRestaurantOnboardingDetail);
router.patch('/restaurants/:id/approve', approveRestaurant);
router.patch('/restaurants/:id/payout-rate', updateRestaurantPayoutRate);
router.post('/restaurants/:id/regenerate-login', regenerateRestaurantLoginCredentials);
router.put('/restaurants/:id/delivery-zone', saveRestaurantDeliveryZone);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/approval', updateUserApproval);
router.get('/account-deletion-requests', getAccountDeletionRequests);
router.patch('/account-deletion-requests/:id/review', reviewAccountDeletionRequest);

router.get('/settings', getPlatformSettings);
router.put('/settings', updatePlatformSettings);

// Coupon management routes
router.route('/coupons')
  .get(getAllCoupons)
  .post(createCoupon);

router.route('/coupons/:id')
  .put(updateCoupon)
  .delete(deleteCoupon);

// Fee template management routes
router.route('/fee-templates')
  .get(getAllFeeTemplates)
  .post(createFeeTemplate);

router.route('/fee-templates/:id')
  .put(updateFeeTemplate)
  .delete(deleteFeeTemplate);

router.post('/fee-templates/:id/assign', assignRestaurantToTemplate);
router.delete('/fee-templates/:id/restaurants/:restaurantId', removeRestaurantFromTemplate);

module.exports = router;