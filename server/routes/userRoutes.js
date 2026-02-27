import express from 'express';
import {
  addToWishlist,
  getWishlist,
} from '../controllers/userController.js';

const router = express.Router();

router.post('/wishlist/:restaurantId', addToWishlist);
router.get('/wishlist/:userId', getWishlist);

export default router;
