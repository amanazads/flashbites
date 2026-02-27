import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';

// @desc    Add restaurant to wishlist
// @route   POST /api/users/wishlist/:restaurantId
// @access  Public (should be Private in production with auth)
export const addToWishlist = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { userId } = req.body; // In production, get from JWT token

    // Check if restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if already in wishlist
    const alreadyInWishlist = user.wishlist.includes(restaurantId);

    if (alreadyInWishlist) {
      // Remove from wishlist
      user.wishlist = user.wishlist.filter(
        (id) => id.toString() !== restaurantId
      );
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Removed from wishlist',
        data: user.wishlist,
      });
    } else {
      // Add to wishlist
      user.wishlist.push(restaurantId);
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Added to wishlist',
        data: user.wishlist,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Get user wishlist
// @route   GET /api/users/wishlist/:userId
// @access  Public (should be Private in production)
export const getWishlist = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate('wishlist');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      count: user.wishlist.length,
      data: user.wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};
