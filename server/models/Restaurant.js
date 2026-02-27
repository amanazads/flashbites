import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a restaurant name'],
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Please add an image URL'],
    },
    cuisine: {
      type: String,
      required: [true, 'Please add cuisine type'],
    },
    priceRange: {
      type: String,
      enum: ['$', '$$', '$$$', '$$$$'],
      default: '$$',
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    deliveryTime: {
      type: String,
      default: '25-35 min',
    },
    isFreeDelivery: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      enum: ['Pizza', 'Burger', 'Sushi', 'Tacos', 'Noodles', 'Dessert', 'Drinks', 'All'],
    },
    description: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: 'New York, NY',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

export default Restaurant;
