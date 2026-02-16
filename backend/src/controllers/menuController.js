const MenuItem = require('../models/MenuItem');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/imageUpload');

// @desc    Add menu item
// @route   POST /api/restaurants/:restaurantId/menu
// @access  Private (Owner)
exports.addMenuItem = async (req, res) => {
  try {
    console.log('===== ADD MENU ITEM DEBUG =====');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file ? 'File present' : 'No file');
    console.log('User:', req.user ? req.user._id : 'No user');
    
    const { name, description, price, category, isVeg, tags, prepTime, isAvailable } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category) {
      return errorResponse(res, 400, 'Missing required fields: name, description, price, category');
    }

    // Handle image upload
    let imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(req.file.buffer, 'flashbites/menu-items');
        console.log('Image uploaded:', imageUrl);
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        // Continue with default image if upload fails
      }
    }

    const menuItemData = {
      restaurantId: req.params.restaurantId,
      name,
      description,
      price: parseFloat(price),
      category,
      image: imageUrl,
      isVeg: isVeg === 'true' || isVeg === true,
      isAvailable: isAvailable === 'true' || isAvailable === true || isAvailable === undefined,
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
      prepTime: prepTime ? parseInt(prepTime) : 20
    };

    console.log('Creating menu item with data:', menuItemData);
    const menuItem = await MenuItem.create(menuItemData);
    console.log('Menu item created successfully:', menuItem._id);

    successResponse(res, 201, 'Menu item added successfully', { menuItem });
  } catch (error) {
    console.error('Add menu item error:', error);
    console.error('Error stack:', error.stack);
    errorResponse(res, 500, 'Failed to add menu item', error.message);
  }
};

// @desc    Get menu items by restaurant
// @route   GET /api/restaurants/:restaurantId/menu
// @access  Public
exports.getMenuByRestaurant = async (req, res) => {
  try {
    const { category, isVeg, search } = req.query;
    let query = { restaurantId: req.params.restaurantId };

    if (category) query.category = category;
    if (isVeg) query.isVeg = isVeg === 'true';
    if (search) query.name = { $regex: search, $options: 'i' };

    const menuItems = await MenuItem.find(query).sort('category');

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

    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      req.params.itemId,
      req.body,
      { new: true, runValidators: true }
    );

    successResponse(res, 200, 'Menu item updated successfully', { menuItem: updatedMenuItem });
  } catch (error) {
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