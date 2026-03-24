const express = require('express');
const router = express.Router();
const {
  createRestaurant,
  getAllRestaurants,
  getNearbyRestaurants,
  searchRestaurantsAndItems,
  getRestaurantById,
  getMyRestaurant,
  updateRestaurant,
  deleteRestaurant,
  toggleRestaurantStatus,
  getRestaurantDashboard,
  getRestaurantAnalytics
} = require('../controllers/restaurantController');
const {
  addMenuItem,
  getMenuByRestaurant,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability
} = require('../controllers/menuController');
const { protect } = require('../middleware/auth');
const { restrictTo, checkRestaurantOwnership } = require('../middleware/roleAuth');
const upload = require('../middleware/upload');

router.route('/')
  .get(getAllRestaurants)
  .post(protect, restrictTo('restaurant_owner'), upload.single('image'), createRestaurant);

// Get my restaurant (must be before /:id to avoid conflicts)
router.get('/my-restaurant', protect, restrictTo('restaurant_owner'), getMyRestaurant);
router.get('/nearby', getNearbyRestaurants);
router.get('/search', searchRestaurantsAndItems);

router.get('/:id', getRestaurantById);

// Public Menu route nested under restaurant
router.get('/:restaurantId/menu', getMenuByRestaurant);

router.use(protect); // All routes below require authentication

router.route('/:id')
  .put(checkRestaurantOwnership, upload.single('image'), updateRestaurant)
  .delete(checkRestaurantOwnership, deleteRestaurant);

router.patch('/:id/toggle-status', checkRestaurantOwnership, toggleRestaurantStatus);
router.get('/:id/dashboard', checkRestaurantOwnership, getRestaurantDashboard);
router.get('/:id/analytics', checkRestaurantOwnership, getRestaurantAnalytics);

// Protected Menu routes nested under restaurant
router.route('/:restaurantId/menu')
  .post(checkRestaurantOwnership, upload.single('image'), addMenuItem);

router.route('/:restaurantId/menu/:itemId')
  .put(checkRestaurantOwnership, upload.single('image'), updateMenuItem)
  .delete(checkRestaurantOwnership, deleteMenuItem);

router.patch('/:restaurantId/menu/:itemId/availability', checkRestaurantOwnership, toggleMenuItemAvailability);

module.exports = router;