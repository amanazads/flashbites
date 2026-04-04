const Partner = require('../models/Partner');
const cloudinary = require('../config/cloudinary');
const { successResponse, errorResponse } = require('../utils/responseHandler');

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

    // Check if partner already exists with this phone or email
    const existingPartner = await Partner.findOne({
      $or: [{ phone }, { email }],
    });

    if (existingPartner) {
      return errorResponse(res, 400, 'Application already exists with this phone or email');
    }

    // Upload documents to Cloudinary
    const documents = {};

    if (req.files) {
      if (req.files.photo) {
        const photoResult = await cloudinary.uploader.upload(req.files.photo[0].path, {
          folder: 'flashbites/partners/photos',
        });
        documents.photo = {
          url: photoResult.secure_url,
          cloudinaryId: photoResult.public_id,
        };
      }

      if (req.files.drivingLicense) {
        const licenseResult = await cloudinary.uploader.upload(req.files.drivingLicense[0].path, {
          folder: 'flashbites/partners/licenses',
        });
        documents.drivingLicense = {
          url: licenseResult.secure_url,
          cloudinaryId: licenseResult.public_id,
        };
      }

      if (req.files.aadharCard) {
        const aadharResult = await cloudinary.uploader.upload(req.files.aadharCard[0].path, {
          folder: 'flashbites/partners/aadhar',
        });
        documents.aadharCard = {
          url: aadharResult.secure_url,
          cloudinaryId: aadharResult.public_id,
        };
      }
    }

    // Parse JSON strings
    const parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
    const parsedBankAccount = typeof bankAccount === 'string' ? JSON.parse(bankAccount) : bankAccount;
    const parsedEmergencyContact = typeof emergencyContact === 'string' ? JSON.parse(emergencyContact) : emergencyContact;

    // Create partner application
    const partner = await Partner.create({
      fullName,
      email,
      phone,
      alternatePhone,
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
    errorResponse(res, 500, 'Failed to submit application', error.message);
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

    partner.status = 'approved';
    partner.reviewedBy = req.user._id;
    partner.reviewedAt = new Date();
    
    await partner.save();

    // TODO: Send approval email/SMS to partner
    // TODO: Create user account for partner with role 'delivery_partner'

    successResponse(res, 200, 'Partner approved successfully', { partner });
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
