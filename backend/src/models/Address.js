const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  street: {
    type: String
  },
  city: {
    type: String
  },
  state: {
    type: String
  },
  zipCode: {
    type: String
  },
  fullAddress: {
    type: String,
    trim: true
  },
  landmark: String,
  lat: {
    type: Number
  },
  lng: {
    type: Number
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    index: '2dsphere'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

addressSchema.index({ userId: 1 });

module.exports = mongoose.model('Address', addressSchema);