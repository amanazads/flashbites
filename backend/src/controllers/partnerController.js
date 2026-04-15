const Partner = require('../models/Partner');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const uploadDocToCloudinary = (file, folder) => {
  return new Promise((resolve, reject) => {
    if (!file?.buffer) {
      return reject(new Error('Missing file buffer for upload'));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
};

const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(-10);

const parseJsonField = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeMenuItems = (value) => {
  const parsed = parseJsonField(value, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => ({
      name: String(item?.name || '').trim(),
      nameHi: String(item?.nameHi || '').trim(),
      category: String(item?.category || '').trim(),
      price: Number(item?.price),
      description: String(item?.description || '').trim(),
      descriptionHi: String(item?.descriptionHi || '').trim()
    }))
    .filter((item) => item.name && Number.isFinite(item.price) && item.price >= 0);
};

const generateTemporaryPassword = () => {
  const randomChunk = crypto.randomBytes(4).toString('hex');
  return `Fb@${randomChunk}A1`;
};

// @desc    Submit partner application
// @route   POST /api/partners/apply
// @access  Public
exports.submitApplication = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      alternatePhone,
      dateOfBirth,
      address,
      vehicleType,
      vehicleNumber,
      vehicleModel,
      licenseNumber,
      aadharNumber,
      bankAccount,
      emergencyContact,
    } = req.body;

    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedAlternatePhone = String(alternatePhone || '').trim() || null;

    if (
      !fullName
      || !normalizedEmail
      || !normalizedPhone
      || !dateOfBirth
      || !vehicleType
      || !vehicleNumber
      || !vehicleModel
      || !licenseNumber
      || !aadharNumber
      || !address
      || !bankAccount
      || !emergencyContact
    ) {
      return errorResponse(
        res,
        400,
        'Missing required fields for delivery partner application'
      );
    }

    if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      return errorResponse(res, 400, 'Phone number must be a valid 10-digit number');
    }

    if (normalizedAlternatePhone && !/^[0-9]{10}$/.test(normalizedAlternatePhone)) {
      return errorResponse(res, 400, 'Alternate phone number must be a valid 10-digit number');
    }

    if (!/^[0-9]{12}$/.test(String(aadharNumber || '').trim())) {
      return errorResponse(res, 400, 'Aadhar number must be a valid 12-digit number');
    }

    // Check if partner already exists with this phone or email
    const existingPartner = await Partner.findOne({
      $or: [{ phone: normalizedPhone }, { email: normalizedEmail }],
    });

    if (existingPartner) {
      return errorResponse(res, 400, 'Application already exists with this phone or email');
    }

    // Upload documents to Cloudinary
    const documents = {};

    if (req.files) {
      if (req.files.photo) {
        const photoResult = await uploadDocToCloudinary(
          req.files.photo[0],
          'flashbites/partners/photos'
        );
        documents.photo = {
          url: photoResult.secure_url,
          cloudinaryId: photoResult.public_id,
        };
      }

      if (req.files.drivingLicense) {
        const licenseResult = await uploadDocToCloudinary(
          req.files.drivingLicense[0],
          'flashbites/partners/licenses'
        );
        documents.drivingLicense = {
          url: licenseResult.secure_url,
          cloudinaryId: licenseResult.public_id,
        };
      }

      if (req.files.aadharCard) {
        const aadharResult = await uploadDocToCloudinary(
          req.files.aadharCard[0],
          'flashbites/partners/aadhar'
        );
        documents.aadharCard = {
          url: aadharResult.secure_url,
          cloudinaryId: aadharResult.public_id,
        };
      }
    }

    // Parse JSON strings
    let parsedAddress;
    let parsedBankAccount;
    let parsedEmergencyContact;

    try {
      parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
      parsedBankAccount = typeof bankAccount === 'string' ? JSON.parse(bankAccount) : bankAccount;
      parsedEmergencyContact = typeof emergencyContact === 'string' ? JSON.parse(emergencyContact) : emergencyContact;
    } catch (parseError) {
      return errorResponse(res, 400, 'Invalid form data payload', parseError.message);
    }

    // Create partner application
    const partner = await Partner.create({
      fullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      alternatePhone: normalizedAlternatePhone,
      dateOfBirth,
      address: parsedAddress,
      vehicleType,
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleModel,
      licenseNumber: licenseNumber.toUpperCase(),
      aadharNumber,
      bankAccount: parsedBankAccount,
      emergencyContact: parsedEmergencyContact,
      documents,
      status: 'pending',
    });

    successResponse(res, 201, 'Application submitted successfully', { partner });
  } catch (error) {
    console.error('Submit application error:', error);
    if (error?.name === 'ValidationError') {
      return errorResponse(res, 400, 'Invalid application data', error.message);
    }

    return errorResponse(res, 500, 'Failed to submit application', error.message);
  }
};

// @desc    Submit restaurant partner application
// @route   POST /api/partners/restaurant-apply
// @access  Public
exports.submitRestaurantApplication = async (req, res) => {
  try {
    const {
      restaurantName,
      ownerName,
      email,
      phone,
      alternatePhone,
      businessType,
      cuisineTypes,
      openingTime,
      closingTime,
      address,
      location,
      fssaiLicenseNumber,
      gstNumber,
      panNumber,
      bankDetails,
      menuItems,
      acceptTerms,
      acceptAgreement,
    } = req.body;

    const normalizedPhone = normalizePhone(phone);
    const normalizedAlternatePhone = normalizePhone(alternatePhone);
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const parsedAddress = parseJsonField(address, {});
    const parsedLocation = parseJsonField(location, {});
    const parsedBankDetails = parseJsonField(bankDetails, {});
    const parsedMenuItems = normalizeMenuItems(menuItems);

    const lat = Number(parsedLocation?.lat);
    const lng = Number(parsedLocation?.lng);

    if (!restaurantName || !ownerName || !normalizedEmail || !normalizedPhone) {
      return errorResponse(res, 400, 'Restaurant name, owner name, email, and phone are required');
    }

    if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      return errorResponse(res, 400, 'Phone number must be a valid 10-digit number');
    }

    if (normalizedAlternatePhone && !/^[0-9]{10}$/.test(normalizedAlternatePhone)) {
      return errorResponse(res, 400, 'Alternate phone number must be a valid 10-digit number');
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return errorResponse(res, 400, 'A valid latitude and longitude are required');
    }

    if (String(acceptTerms) !== 'true' || String(acceptAgreement) !== 'true') {
      return errorResponse(res, 400, 'Please accept Terms and Partner Agreement');
    }

    const existingUser = await User.findOne({
      $or: [{ phone: normalizedPhone }, { email: normalizedEmail }]
    }).select('_id');

    if (existingUser) {
      return errorResponse(res, 400, 'An account already exists with this phone or email');
    }

    const existingRestaurant = await Restaurant.findOne({
      $or: [{ phone: normalizedPhone }, { email: normalizedEmail }]
    }).select('_id');

    if (existingRestaurant) {
      return errorResponse(res, 400, 'A restaurant application already exists with this phone or email');
    }

    const documents = {};
    if (req.files?.fssaiLicense?.[0]) {
      const fssai = await uploadDocToCloudinary(req.files.fssaiLicense[0], 'flashbites/restaurants/fssai');
      documents.fssai = fssai.secure_url;
    }
    if (req.files?.ownerIdProof?.[0]) {
      const ownerId = await uploadDocToCloudinary(req.files.ownerIdProof[0], 'flashbites/restaurants/owner-id');
      documents.ownerIdProof = ownerId.secure_url;
    }
    if (req.files?.menuDocument?.[0]) {
      const menuDoc = await uploadDocToCloudinary(req.files.menuDocument[0], 'flashbites/restaurants/menu-docs');
      documents.menuDocument = menuDoc.secure_url;
    }
    if (req.files?.cancelledCheque?.[0]) {
      const cheque = await uploadDocToCloudinary(req.files.cancelledCheque[0], 'flashbites/restaurants/bank-docs');
      documents.cancelledCheque = cheque.secure_url;
    }

    const temporaryPassword = generateTemporaryPassword();

    const owner = await User.create({
      name: ownerName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: temporaryPassword,
      role: 'restaurant_owner',
      isActive: false,
      isPhoneVerified: true
    });

    const cuisines = String(cuisineTypes || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const restaurant = await Restaurant.create({
      ownerId: owner._id,
      name: String(restaurantName).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      description: `${businessType || 'Restaurant'} onboarding via partner form`,
      cuisines,
      address: {
        street: parsedAddress?.street || '',
        city: parsedAddress?.city || '',
        state: parsedAddress?.state || '',
        zipCode: parsedAddress?.pincode || '',
        landmark: parsedAddress?.landmark || ''
      },
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      timing: {
        open: openingTime || '09:00',
        close: closingTime || '22:00'
      },
      isApproved: false,
      isActive: false,
      fssaiLicense: String(fssaiLicenseNumber || '').trim(),
      documents: {
        ...documents,
        gst: String(gstNumber || '').trim() || undefined,
        panCard: String(panNumber || '').trim() || undefined
      },
      bankDetails: {
        accountNumber: parsedBankDetails?.accountNumber || '',
        ifscCode: String(parsedBankDetails?.ifscCode || '').toUpperCase(),
        accountHolderName: parsedBankDetails?.accountHolderName || ownerName,
        bankName: ''
      }
    });

    successResponse(res, 201, 'Restaurant application submitted successfully. Awaiting admin approval.', {
      restaurant,
      owner: {
        id: owner._id,
        name: owner.name,
        phone: owner.phone,
        email: owner.email
      },
      menuItemsCount: parsedMenuItems.length
    });
  } catch (error) {
    console.error('Submit restaurant application error:', error);
    if (error?.name === 'ValidationError') {
      return errorResponse(res, 400, 'Invalid restaurant application data', error.message);
    }
    if (error?.code === 11000) {
      return errorResponse(res, 400, 'A user or restaurant with this phone/email already exists');
    }
    return errorResponse(res, 500, 'Failed to submit restaurant application', error.message);
  }
};

// @desc    Get all partner applications (Admin)
// @route   GET /api/admin/partners
// @access  Private/Admin
exports.getAllPartnerApplications = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = {};
    
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const partners = await Partner.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('reviewedBy', 'name email')
      .lean();

    const total = await Partner.countDocuments(query);

    // Get counts by status
    const statusCounts = await Partner.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {
      total: await Partner.countDocuments(),
      pending: 0,
      approved: 0,
      rejected: 0,
      active: 0,
      inactive: 0,
    };

    statusCounts.forEach(({ _id, count }) => {
      counts[_id] = count;
    });

    successResponse(res, 200, 'Partner applications retrieved successfully', {
      partners,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
      counts,
    });
  } catch (error) {
    console.error('Get partner applications error:', error);
    errorResponse(res, 500, 'Failed to get partner applications', error.message);
  }
};

// @desc    Get partner application by ID (Admin)
// @route   GET /api/admin/partners/:id
// @access  Private/Admin
exports.getPartnerById = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id)
      .populate('reviewedBy', 'name email')
      .populate('userId', 'name email');

    if (!partner) {
      return errorResponse(res, 404, 'Partner application not found');
    }

    successResponse(res, 200, 'Partner retrieved successfully', { partner });
  } catch (error) {
    console.error('Get partner by ID error:', error);
    errorResponse(res, 500, 'Failed to get partner', error.message);
  }
};

// @desc    Approve partner application (Admin)
// @route   PUT /api/admin/partners/:id/approve
// @access  Private/Admin
exports.approvePartner = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);

    if (!partner) {
      return errorResponse(res, 404, 'Partner application not found');
    }

    if (partner.status !== 'pending') {
      return errorResponse(res, 400, 'Only pending applications can be approved');
    }

    let user = null;
    let generatedCredentials = null;

    if (partner.userId) {
      user = await User.findById(partner.userId).select('+password');
    }

    if (!user) {
      user = await User.findOne({
        $or: [
          { phone: normalizePhone(partner.phone) },
          { email: String(partner.email || '').trim().toLowerCase() }
        ]
      }).select('+password');
    }

    if (!user) {
      const temporaryPassword = generateTemporaryPassword();
      user = await User.create({
        name: partner.fullName,
        email: String(partner.email || '').trim().toLowerCase(),
        phone: normalizePhone(partner.phone),
        password: temporaryPassword,
        role: 'delivery_partner',
        isActive: true,
        isPhoneVerified: true
      });

      generatedCredentials = {
        phone: user.phone,
        email: user.email || '',
        password: temporaryPassword
      };
    } else {
      user.role = 'delivery_partner';
      user.isActive = true;
      user.isPhoneVerified = true;

      const temporaryPassword = generateTemporaryPassword();
      user.password = temporaryPassword;
      generatedCredentials = {
        phone: user.phone,
        email: user.email || '',
        password: temporaryPassword
      };

      await user.save();
    }

    partner.status = 'active';
    partner.userId = user._id;
    partner.reviewedBy = req.user._id;
    partner.reviewedAt = new Date();
    
    await partner.save();

    successResponse(res, 200, 'Partner approved successfully', {
      partner,
      credentials: generatedCredentials
    });
  } catch (error) {
    console.error('Approve partner error:', error);
    errorResponse(res, 500, 'Failed to approve partner', error.message);
  }
};

// @desc    Reject partner application (Admin)
// @route   PUT /api/admin/partners/:id/reject
// @access  Private/Admin
exports.rejectPartner = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return errorResponse(res, 400, 'Rejection reason is required');
    }

    const partner = await Partner.findById(req.params.id);

    if (!partner) {
      return errorResponse(res, 404, 'Partner application not found');
    }

    if (partner.status !== 'pending') {
      return errorResponse(res, 400, 'Only pending applications can be rejected');
    }

    partner.status = 'rejected';
    partner.rejectionReason = reason;
    partner.reviewedBy = req.user._id;
    partner.reviewedAt = new Date();
    
    await partner.save();

    // TODO: Send rejection email/SMS to partner with reason

    successResponse(res, 200, 'Partner rejected successfully', { partner });
  } catch (error) {
    console.error('Reject partner error:', error);
    errorResponse(res, 500, 'Failed to reject partner', error.message);
  }
};

// @desc    Delete partner application (Admin)
// @route   DELETE /api/admin/partners/:id
// @access  Private/Admin
exports.deletePartner = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);

    if (!partner) {
      return errorResponse(res, 404, 'Partner application not found');
    }

    // Delete documents from Cloudinary
    if (partner.documents) {
      if (partner.documents.photo?.cloudinaryId) {
        await cloudinary.uploader.destroy(partner.documents.photo.cloudinaryId);
      }
      if (partner.documents.drivingLicense?.cloudinaryId) {
        await cloudinary.uploader.destroy(partner.documents.drivingLicense.cloudinaryId);
      }
      if (partner.documents.aadharCard?.cloudinaryId) {
        await cloudinary.uploader.destroy(partner.documents.aadharCard.cloudinaryId);
      }
    }

    await Partner.findByIdAndDelete(req.params.id);

    successResponse(res, 200, 'Partner deleted successfully');
  } catch (error) {
    console.error('Delete partner error:', error);
    errorResponse(res, 500, 'Failed to delete partner', error.message);
  }
};

// @desc    Update partner status (Admin)
// @route   PUT /api/admin/partners/:id/status
// @access  Private/Admin
exports.updatePartnerStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'active', 'inactive'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, 400, 'Invalid status');
    }

    const partner = await Partner.findById(req.params.id);

    if (!partner) {
      return errorResponse(res, 404, 'Partner not found');
    }

    partner.status = status;
    await partner.save();

    successResponse(res, 200, 'Partner status updated successfully', { partner });
  } catch (error) {
    console.error('Update partner status error:', error);
    errorResponse(res, 500, 'Failed to update partner status', error.message);
  }
};
