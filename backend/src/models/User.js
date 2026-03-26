const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [[true, 'Password is required']],
    minlength: [6, 'Password must be at least 6 characters'],
    validate: {
      validator: function (v) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/.test(v);
      },
      message: 'Password must have at least one uppercase letter, one lowercase letter, and one special character'
    },
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  googleId: {
    type: String,
    default: null,
    sparse: true
  },
  role: {
    type: String,
    enum: ['user', 'restaurant_owner', 'admin', 'delivery_partner'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isOnDuty: {
    type: Boolean,
    default: false
  },
  dutyStatusUpdatedAt: {
    type: Date,
    default: null
  },
  refreshToken: {
    type: String,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  otp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: null
  },
  fcmToken: {
    type: String,
    default: null
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  lastLocationUpdate: {
    type: Date,
    default: null
  },
  deliveryPayoutOverride: {
    isActive: {
      type: Boolean,
      default: false
    },
    perOrder: {
      type: Number,
      min: 0,
      default: 0
    },
    bonusThreshold: {
      type: Number,
      min: 1,
      default: 13
    },
    bonusAmount: {
      type: Number,
      min: 0,
      default: 0
    }
  }
}, { 
  timestamps: true 
});


// Hash password before saving
userSchema.pre('save', async function() {
  // Only hash password if it's modified or new
  if (!this.isModified('password')) {
    return;
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Indexes
userSchema.index({ email: 1 }, { unique: true, sparse: true }); // Sparse allows multiple null values
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
