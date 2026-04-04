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
  updateRestaurantFeeControls,
  saveRestaurantDeliveryZone,
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  getComprehensiveAnalytics,
  getAccountDeletionRequests,
  reviewAccountDeletionRequest,
  getPlatformSettings,
  updatePlatformSettings,
  getDeliveryTrackingDashboard
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
router.patch('/restaurants/:id/approve', approveRestaurant);
router.patch('/restaurants/:id/payout-rate', updateRestaurantPayoutRate);
router.patch('/restaurants/:id/fee-controls', updateRestaurantFeeControls);
router.put('/restaurants/:id/delivery-zone', saveRestaurantDeliveryZone);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/role', updateUserRole);
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

module.exports = router;