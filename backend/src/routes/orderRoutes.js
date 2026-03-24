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
const validateRequest = require('../middleware/validateRequest');
const {
  createOrderValidator,
  updateOrderStatusValidator,
  cancelOrderValidator,
} = require('../validators/orderValidators');

router.use(protect); // All routes require authentication

router.post('/', createOrderValidator, validateRequest, createOrder);
router.get('/my-orders', getUserOrders);
router.get('/restaurant/:restaurantId', restrictTo('restaurant_owner', 'admin'), getRestaurantOrders);
router.get('/:id', getOrderById);
router.get('/:id/tracking', getOrderTracking);
router.patch('/:id/status', restrictTo('restaurant_owner', 'admin'), updateOrderStatusValidator, validateRequest, updateOrderStatus);
router.patch('/:id/cancel', cancelOrderValidator, validateRequest, cancelOrder);

module.exports = router;