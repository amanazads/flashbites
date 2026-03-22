const Coupon = require('../models/Coupon');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// Validate and apply coupon
exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderValue, restaurantId } = req.body;

    if (!code || !orderValue) {
      return errorResponse(res, 400, 'Coupon code and order value are required');
    }

    // Find the coupon
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true 
    });

    if (!coupon) {
      return errorResponse(res, 404, 'Invalid coupon code');
    }

    // Check validity dates
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTill) {
      return errorResponse(res, 400, 'Coupon has expired or is not yet valid');
    }

    // Check restaurant applicability
    if (coupon.applicableRestaurants && coupon.applicableRestaurants.length > 0) {
      if (!restaurantId || !coupon.applicableRestaurants.some((id) => id.toString() === restaurantId.toString())) {
        return errorResponse(res, 400, 'Coupon is not valid for this restaurant');
      }
    }

    // Check user applicability
    if (coupon.userSpecific) {
      const userId = req.user?._id?.toString();
      if (!userId || !coupon.applicableUsers.some((id) => id.toString() === userId)) {
        return errorResponse(res, 400, 'Coupon is not valid for this user');
      }
    }

    // Check minimum order value
    if (orderValue < coupon.minOrderValue) {
      return errorResponse(
        res, 
        400, 
        `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`
      );
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return errorResponse(res, 400, 'Coupon usage limit reached');
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (orderValue * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    return successResponse(res, 200, 'Coupon applied successfully', {
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount: Math.round(discount)
      }
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return errorResponse(res, 500, 'Failed to validate coupon');
  }
};

// Get available coupons
exports.getAvailableCoupons = async (req, res) => {
  try {
    const { orderValue, restaurantId } = req.query;
    const now = new Date();

    const userId = req.user?._id?.toString();

    const query = {
      isActive: true,
      validFrom: { $lte: now },
      validTill: { $gte: now },
      minOrderValue: { $lte: Number(orderValue) || 0 },
      $or: [
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
      ]
    };

    if (restaurantId) {
      query.$or = query.$or || [];
      query.$and = [
        {
          $or: [
            { applicableRestaurants: { $size: 0 } },
            { applicableRestaurants: { $exists: false } },
            { applicableRestaurants: restaurantId }
          ]
        }
      ];
    }

    if (userId) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { userSpecific: false },
          { applicableUsers: userId }
        ]
      });
    }

    const coupons = await Coupon.find(query)
      .select('code description discountType discountValue minOrderValue maxDiscount');

    return successResponse(res, 200, 'Available coupons fetched successfully', { coupons });
  } catch (error) {
    console.error('Get available coupons error:', error);
    return errorResponse(res, 500, 'Failed to fetch coupons');
  }
};

// Create coupon (Admin only)
exports.createCoupon = async (req, res) => {
  try {
    const couponData = req.body;
    if (!couponData?.code) {
      return errorResponse(res, 400, 'Coupon code is required');
    }
    if (!req.user?._id) {
      return errorResponse(res, 401, 'Not authorized');
    }
    
    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: couponData.code.toUpperCase() });
    if (existingCoupon) {
      return errorResponse(res, 400, 'Coupon code already exists');
    }

    const coupon = await Coupon.create({
      ...couponData,
      code: couponData.code.toUpperCase(),
      createdBy: req.user._id
    });

    return successResponse(res, 201, 'Coupon created successfully', { coupon });
  } catch (error) {
    console.error('Create coupon error:', error);
    return errorResponse(res, 500, 'Failed to create coupon');
  }
};

// Get all coupons (Admin only)
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return successResponse(res, 200, 'Coupons fetched successfully', { coupons });
  } catch (error) {
    console.error('Get all coupons error:', error);
    return errorResponse(res, 500, 'Failed to fetch coupons');
  }
};

// Update coupon (Admin only)
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    const coupon = await Coupon.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    if (!coupon) {
      return errorResponse(res, 404, 'Coupon not found');
    }

    return successResponse(res, 200, 'Coupon updated successfully', { coupon });
  } catch (error) {
    console.error('Update coupon error:', error);
    return errorResponse(res, 500, 'Failed to update coupon');
  }
};

// Delete coupon (Admin only)
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return errorResponse(res, 404, 'Coupon not found');
    }

    return successResponse(res, 200, 'Coupon deleted successfully');
  } catch (error) {
    console.error('Delete coupon error:', error);
    return errorResponse(res, 500, 'Failed to delete coupon');
  }
};
