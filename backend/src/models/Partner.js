const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema({
  // Personal Information
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number'],
  },
  alternatePhone: {
    type: String,
    trim: true,
    default: null,
    validate: {
      validator: (value) => !value || /^[0-9]{10}$/.test(value),
      message: 'Please enter a valid 10-digit phone number',
    },
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
  aadharNumber: {
    type: String,
    required: [true, 'Aadhar number is required'],
    match: [/^[0-9]{12}$/, 'Please enter a valid 12-digit Aadhar number'],
  },

  // Address
  address: {
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
      match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit ZIP code'],
    },
  },

  // Vehicle Information
  vehicleType: {
    type: String,
    enum: ['bike', 'bicycle', 'car'],
    required: true,
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    uppercase: true,
    trim: true,
  },
  vehicleModel: {
    type: String,
    required: [true, 'Vehicle model is required'],
  },
  licenseNumber: {
    type: String,
    required: [true, 'Driving license number is required'],
    uppercase: true,
    trim: true,
  },

  // Bank Details
  bankAccount: {
    accountNumber: {
      type: String,
      required: true,
    },
    ifscCode: {
      type: String,
      required: true,
      uppercase: true,
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Please enter a valid IFSC code'],
    },
    accountHolderName: {
      type: String,
      required: true,
    },
  },

  // Emergency Contact
  emergencyContact: {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number'],
    },
    relation: {
      type: String,
      required: true,
    },
  },

  // Documents
  documents: {
    photo: {
      url: String,
      cloudinaryId: String,
    },
    drivingLicense: {
      url: String,
      cloudinaryId: String,
    },
    aadharCard: {
      url: String,
      cloudinaryId: String,
    },
  },

  // Application Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'inactive'],
    default: 'pending',
  },
  
  // If rejected, reason
  rejectionReason: {
    type: String,
  },

  // Approval/Rejection date and admin
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },

  // If approved and becomes active user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Stats (once active)
  stats: {
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
    },
    cancelledDeliveries: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
  },

  // Availability
  isAvailable: {
    type: Boolean,
    default: false,
  },

  // Current location (when active)
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
    },
  },
}, {
  timestamps: true,
});

// Index for location queries
partnerSchema.index({ currentLocation: '2dsphere' });
partnerSchema.index({ status: 1 });
partnerSchema.index({ phone: 1 });
partnerSchema.index({ email: 1 });

const Partner = mongoose.model('Partner', partnerSchema);

module.exports = Partner;
