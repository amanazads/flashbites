import Restaurant from '../models/Restaurant.js';

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
export const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isActive: true }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Get single restaurant
// @route   GET /api/restaurants/:id
// @access  Public
export const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found',
      });
    }

    res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Get restaurants by category
// @route   GET /api/restaurants/category/:category
// @access  Public
export const getRestaurantsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const query = category === 'All' 
      ? { isActive: true }
      : { category, isActive: true };

    const restaurants = await Restaurant.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// @desc    Create new restaurant
// @route   POST /api/restaurants
// @access  Public (Should be Admin in production)
export const createRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.create(req.body);

    res.status(201).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to create restaurant',
      error: error.message,
    });
  }
};

// @desc    Search restaurants
// @route   GET /api/restaurants/search
// @access  Public
export const searchRestaurants = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query',
      });
    }

    const restaurants = await Restaurant.find({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { cuisine: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ],
    });

    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};
