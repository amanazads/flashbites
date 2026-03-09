const MenuItem = require('../models/MenuItem');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/imageUpload');
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Add menu item
// @route   POST /api/restaurants/:restaurantId/menu
// @access  Private (Owner)
exports.addMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, isVeg, tags, prepTime, isAvailable, variants } = req.body;

    // Validate required fields with detailed errors
    const missing = [];
    if (!name) missing.push('name');
    if (!description) missing.push('description');
    if (!price) missing.push('price');
    if (!category) missing.push('category');

    if (missing.length > 0) {
      return errorResponse(res, 400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Validate category is in allowed enum
    const allowedCategories = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Breads', 'Rice', 'Snacks', 'Fast Food', 'Pizza', 'Burger', 'South Indian', 'North Indian', 'Chinese'];
    if (!allowedCategories.includes(category)) {
      return errorResponse(res, 400, `Invalid category "${category}". Must be one of: ${allowedCategories.join(', ')}`);
    }

    // Handle image upload
    let imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(req.file.buffer, 'flashbites/menu-items');
      } catch (uploadError) {
        console.error('Image upload failed, using default:', uploadError.message);
        // Continue with default image if upload fails
      }
    }

    const menuItemData = {
      restaurantId: req.params.restaurantId,
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      image: imageUrl,
      isVeg: isVeg === 'true' || isVeg === true,
      isAvailable: isAvailable === 'true' || isAvailable === true || isAvailable === undefined,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
      prepTime: prepTime ? parseInt(prepTime) : 20,
      variants: variants ? (typeof variants === 'string' ? JSON.parse(variants) : variants) : []
    };

    const menuItem = await MenuItem.create(menuItemData);

    successResponse(res, 201, 'Menu item added successfully', { menuItem });
  } catch (error) {
    // Return detailed Mongoose validation errors to help debug
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return errorResponse(res, 400, `Validation failed: ${messages}`);
    }
    console.error('Add menu item error:', error.message);
    errorResponse(res, 500, 'Failed to add menu item', error.message);
  }
};

// @desc    Get menu items by restaurant
// @route   GET /api/restaurants/:restaurantId/menu
// @access  Public
exports.getMenuByRestaurant = async (req, res) => {
  try {
    const { category, isVeg, search, limit = 200 } = req.query;
    let query = { restaurantId: req.params.restaurantId };

    if (category) query.category = category;
    if (isVeg) query.isVeg = isVeg === 'true';
    if (search) query.name = { $regex: escapeRegex(search), $options: 'i' };

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500);

    const menuItems = await MenuItem.find(query)
      .sort('category')
      .limit(safeLimit)
      .lean();

    successResponse(res, 200, 'Menu retrieved successfully', {
      count: menuItems.length,
      items: menuItems
    });
  } catch (error) {
    errorResponse(res, 500, 'Failed to get menu', error.message);
  }
};

// @desc    Update menu item
// @route   PUT /api/restaurants/:restaurantId/menu/:itemId
// @access  Private (Owner)
exports.updateMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.itemId);
    
    if (!menuItem) {
      return errorResponse(res, 404, 'Menu item not found');
    }

    // Handle image upload if new file provided
    if (req.file) {
      // Delete old image from Cloudinary if it exists and is not default
      if (menuItem.image && !menuItem.image.includes('unsplash')) {
        await deleteFromCloudinary(menuItem.image);
      }
      req.body.image = await uploadToCloudinary(req.file.buffer, 'flashbites/menu-items');
    }

    if (req.body.variants && typeof req.body.variants === 'string') {
      try {
        const parsedVariants = JSON.parse(req.body.variants);
        if (Array.isArray(parsedVariants)) {
          req.body.variants = parsedVariants.filter(v => v.name && v.name.trim() !== '' && v.price !== '' && v.price !== null);
        }
      } catch (e) {
        console.error('Failed to parse variants string', e);
      }
    }

    // Use $set to only update provided fields — never wipe existing data
    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      req.params.itemId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    successResponse(res, 200, 'Menu item updated successfully', { menuItem: updatedMenuItem });
  } catch (error) {
    console.error('Update Menu Item Error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return errorResponse(res, 400, `Validation failed: ${messages}`);
    }
    errorResponse(res, 500, 'Failed to update menu item', error.message);
  }
};


// @desc    Delete menu item
// @route   DELETE /api/restaurants/:restaurantId/menu/:itemId
// @access  Private (Owner)
exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.itemId);

    if (!menuItem) {
      return errorResponse(res, 404, 'Menu item not found');
    }

    successResponse(res, 200, 'Menu item deleted successfully');
  } catch (error) {
    errorResponse(res, 500, 'Failed to delete menu item', error.message);
  }
};

// @desc    Toggle menu item availability
// @route   PATCH /api/restaurants/:restaurantId/menu/:itemId/availability
// @access  Private (Owner)
exports.toggleMenuItemAvailability = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.itemId);
    
    if (!menuItem) {
      return errorResponse(res, 404, 'Menu item not found');
    }

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();

    successResponse(res, 200, 'Menu item availability updated', { menuItem });
  } catch (error) {
    errorResponse(res, 500, 'Failed to update availability', error.message);
  }
};