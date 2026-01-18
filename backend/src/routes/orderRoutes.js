const express = require('express');
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  getOrderById,
  getOrderTracking,
  updateOrderStatus,
  cancelOrder,
  getRestaurantOrders
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleAuth');

router.use(protect); // All routes require authentication

router.post('/', createOrder);
router.get('/my-orders', getUserOrders);
router.get('/restaurant/:restaurantId', restrictTo('restaurant_owner', 'admin'), getRestaurantOrders);
router.get('/:id', getOrderById);
router.get('/:id/tracking', getOrderTracking);
router.patch('/:id/status', restrictTo('restaurant_owner', 'admin'), updateOrderStatus);
router.patch('/:id/cancel', cancelOrder);

module.exports = router;