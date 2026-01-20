const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const menuItemSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide item name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide item description'],
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: true,
    enum: ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Breads', 'Rice', 'Snacks', 'Pizza Mania']
  },
  subCategory: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Please provide item image']
  },
  isVeg: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  tags: [String],
  prepTime: {
    type: Number, // in minutes
    default: 20
  },
  spiceLevel: {
    type: String,
    enum: ['Mild', 'Medium', 'Hot', 'Extra Hot'],
    default: 'Medium'
  },
  // Variants for items with multiple sizes/portions
  hasVariants: {
    type: Boolean,
    default: false
  },
  variants: [variantSchema]
}, { timestamps: true });

menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });
menuItemSchema.index({ category: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);