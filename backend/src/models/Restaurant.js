const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  cuisines: [{
    type: String,
    trim: true
  }],
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    landmark: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  deliveryZone: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]],
      default: undefined
    }
  },
  image: {
    type: String,
    default: 'default-restaurant.png'
  },
  images: [{
    type: String
  }],
  timing: {
    open: {
      type: String,
      default: '09:00'
    },
    close: {
      type: String,
      default: '22:00'
    }
  },
  deliveryTime: {
    type: String,
    default: '30-40 mins'
  },
  prepTimeMinutes: {
    type: Number,
    default: 20,
    min: 5,
    max: 120
  },
  deliveryRadiusKm: {
    type: Number,
    default: 20,
    min: 1,
    max: 100
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  acceptingOrders: {
    type: Boolean,
    default: true
  },
  isPureVeg: {
    type: Boolean,
    default: false
  },
  fssaiLicense: {
    type: String,
    trim: true
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  onboardingDocuments: {
    panCard: {
      url: String,
      cloudinaryId: String,
      fileName: String,
      mimeType: String
    },
    fssaiDocument: {
      url: String,
      cloudinaryId: String,
      fileName: String,
      mimeType: String
    },
    menuDocument: {
      url: String,
      cloudinaryId: String,
      fileName: String,
      mimeType: String
    },
    menuImage: {
      url: String,
      cloudinaryId: String,
      fileName: String,
      mimeType: String
    },
    profileFoodImage: {
      url: String,
      cloudinaryId: String,
      fileName: String,
      mimeType: String
    }
  },
  onboardingMeta: {
    menuDetailsText: {
      type: String,
      trim: true,
      default: ''
    },
    hasGst: {
      type: Boolean,
      default: false
    },
    partnerContract: {
      accepted: {
        type: Boolean,
        default: false
      },
      signerName: {
        type: String,
        trim: true,
        default: ''
      },
      acceptedAt: {
        type: Date,
        default: null
      },
      contractVersion: {
        type: String,
        default: 'v1'
      }
    },
    onboardingStatus: {
      type: String,
      enum: ['pending_documents', 'under_review', 'verified'],
      default: 'pending_documents'
    },
    loginReferenceId: {
      type: String,
      trim: true,
      default: ''
    },
    latestGeneratedCredentials: {
      username: {
        type: String,
        trim: true,
        default: ''
      },
      tempPassword: {
        type: String,
        default: ''
      },
      generatedAt: {
        type: Date,
        default: null
      },
      generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      }
    },
    loginPortal: {
      type: String,
      default: '/accounts/restaurant/login'
    }
  },
  documents: {
    fssai: String,
    gst: String,
    panCard: String
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String
  },
  payoutRateOverride: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  feeOverrides: {
    deliveryFee: {
      type: Number,
      min: 0,
      default: null
    },
    platformFee: {
      type: Number,
      min: 0,
      default: null
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 1,
      default: null
    },
    commissionPercent: {
      type: Number,
      min: 0,
      max: 90,
      default: null
    }
  },
  feeTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeTemplate',
    default: null
  }
}, { 
  timestamps: true 
});

// Create geospatial index for location-based queries
restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ deliveryZone: '2dsphere' });
restaurantSchema.index({ cuisines: 1 });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ isActive: 1, isApproved: 1 });

// Method to calculate average rating from reviews
restaurantSchema.methods.calculateAverageRating = async function() {
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    {
      $match: { restaurantId: this._id }
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    this.rating = Math.round(stats[0].avgRating * 10) / 10; // Round to 1 decimal
    this.totalReviews = stats[0].totalReviews;
  } else {
    this.rating = 0;
    this.totalReviews = 0;
  }

  await this.save();
  return this.rating;
};

module.exports = mongoose.model('Restaurant', restaurantSchema);
