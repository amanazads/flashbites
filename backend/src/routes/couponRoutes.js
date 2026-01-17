const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleAuth');

// Public routes
router.post('/validate', protect, couponController.validateCoupon);
router.get('/available', protect, couponController.getAvailableCoupons);

// Admin routes
router.post('/', protect, restrictTo('admin'), couponController.createCoupon);
router.get('/', protect, restrictTo('admin'), couponController.getAllCoupons);
router.put('/:id', protect, restrictTo('admin'), couponController.updateCoupon);
router.delete('/:id', protect, restrictTo('admin'), couponController.deleteCoupon);

module.exports = router;
