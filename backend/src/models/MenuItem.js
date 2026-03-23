const mongoose = require('mongoose');

const ALLOWED_MENU_CATEGORIES = [
  'Starters',
  'Main Course',
  'Desserts',
  'Beverages',
  'Breads',
  'Rice',
  'Snacks',
  'Fast Food',
  'Pizza',
  'Burger',
  'South Indian',
  'North Indian',
  'Chinese',
  'Paneer',
  'Cake',
  'Biryani',
  'Veg Meal',
  'Noodles',
  'Sandwich',
  'Dosa',
  'Italian',
  'Momos',
  'Chaap',
  'Fries',
  'Shakes',
  'Coffee'
];

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
    validate: {
      validator: function(v) {
        // Allow up to 500 words
        return !v || v.trim().split(/\s+/).length <= 500;
      },
      message: 'Description cannot exceed 500 words'
    }
  },
  price: {
    type: Number,
    required: [true, 'Please provide item price'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: false,
    enum: ALLOWED_MENU_CATEGORIES
  },
  categories: {
    type: [String],
    required: true,
    default: [],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'At least one category is required'
    },
    enum: ALLOWED_MENU_CATEGORIES
  },
  variants: [{
    name: {
      type: String, // e.g., 'Regular', 'Large', 'Half', 'Full'
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Variant price cannot be negative']
    }
  }],
  image: {
    type: String,
    required: false
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
menuItemSchema.index({ categories: 1 });

menuItemSchema.pre('validate', function() {
  if ((!this.categories || this.categories.length === 0) && this.category) {
    this.categories = [this.category];
  }

  if ((!this.category || this.category.trim() === '') && Array.isArray(this.categories) && this.categories.length > 0) {
    this.category = this.categories[0];
  }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);