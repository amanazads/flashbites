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
  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  deliveryTime: {
    type: String,
    default: '30-40 mins'
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
  }
}, { 
  timestamps: true 
});

// Create geospatial index for location-based queries
restaurantSchema.index({ location: '2dsphere' });
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
