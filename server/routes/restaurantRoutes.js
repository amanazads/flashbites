import express from 'express';
import {
  getAllRestaurants,
  getRestaurantById,
  getRestaurantsByCategory,
  createRestaurant,
  searchRestaurants,
} from '../controllers/restaurantController.js';

const router = express.Router();

// Search route should come before /:id to avoid conflicts
router.get('/search', searchRestaurants);

router.route('/')
  .get(getAllRestaurants)
  .post(createRestaurant);

router.get('/category/:category', getRestaurantsByCategory);

router.get('/:id', getRestaurantById);

export default router;
