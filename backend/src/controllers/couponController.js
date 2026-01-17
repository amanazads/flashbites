const Coupon = require('../models/Coupon');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// Validate and apply coupon
exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderValue } = req.body;

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

    return successResponse(res, {
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discount: Math.round(discount)
      }
    }, 'Coupon applied successfully');
  } catch (error) {
    console.error('Validate coupon error:', error);
    return errorResponse(res, 500, 'Failed to validate coupon');
  }
};

// Get available coupons
exports.getAvailableCoupons = async (req, res) => {
  try {
    const { orderValue } = req.query;
    const now = new Date();

    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validTill: { $gte: now },
      minOrderValue: { $lte: Number(orderValue) || 0 },
      $or: [
        { usageLimit: null },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
      ]
    }).select('code description discountType discountValue minOrderValue maxDiscount');

    return successResponse(res, { coupons }, 'Available coupons fetched successfully');
  } catch (error) {
    console.error('Get available coupons error:', error);
    return errorResponse(res, 500, 'Failed to fetch coupons');
  }
};

// Create coupon (Admin only)
exports.createCoupon = async (req, res) => {
  try {
    const couponData = req.body;
    
    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: couponData.code.toUpperCase() });
    if (existingCoupon) {
      return errorResponse(res, 400, 'Coupon code already exists');
    }

    const coupon = new Coupon(couponData);
    await coupon.save();

    return successResponse(res, { coupon }, 'Coupon created successfully', 201);
  } catch (error) {
    console.error('Create coupon error:', error);
    return errorResponse(res, 500, 'Failed to create coupon');
  }
};

// Get all coupons (Admin only)
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return successResponse(res, { coupons }, 'Coupons fetched successfully');
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

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return errorResponse(res, 404, 'Coupon not found');
    }

    return successResponse(res, { coupon }, 'Coupon updated successfully');
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

    return successResponse(res, null, 'Coupon deleted successfully');
  } catch (error) {
    console.error('Delete coupon error:', error);
    return errorResponse(res, 500, 'Failed to delete coupon');
  }
};
