const express = require('express');
const router = express.Router();
const deliveryPartnerController = require('../controllers/deliveryPartnerController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleAuth');

// All routes require delivery_partner role
router.use(protect);
router.use(restrictTo('delivery_partner'));

// Get available orders
router.get('/orders/available', deliveryPartnerController.getAvailableOrders);

// Get assigned orders
router.get('/orders/assigned', deliveryPartnerController.getAssignedOrders);

// Accept order
router.post('/orders/:orderId/accept', deliveryPartnerController.acceptOrder);

// Mark order as delivered
router.post('/orders/:orderId/deliver', deliveryPartnerController.markAsDelivered);

// Get order history
router.get('/orders/history', deliveryPartnerController.getOrderHistory);

// Get stats
router.get('/stats', deliveryPartnerController.getStats);

// Get current duty status
router.get('/duty-status', deliveryPartnerController.getDutyStatus);

// Update duty status
router.put('/duty-status', deliveryPartnerController.updateDutyStatus);

// Update location
router.put('/location', deliveryPartnerController.updateLocation);

module.exports = router;
