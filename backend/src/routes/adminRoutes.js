const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleAuth');

const {
  getDashboardStats,
  getAllUsers,
  getDeliveryPartnerDutyBoard,
  getAllOrders,
  approveRestaurant,
  blockUser,
  updateUserRole,
  getAllRestaurants,
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
router.get('/delivery-tracking', getDeliveryTrackingDashboard);
router.get('/orders', getAllOrders);
router.get('/restaurants', getAllRestaurants);
router.patch('/restaurants/:id/approve', approveRestaurant);
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