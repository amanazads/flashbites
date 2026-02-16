const mongoose = require('mongoose');

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
    required: [true, 'Please provide item price'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: true,
    enum: ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Breads', 'Rice', 'Snacks']
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
  }
}, { timestamps: true });

menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });
menuItemSchema.index({ category: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);