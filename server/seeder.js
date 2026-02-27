import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Restaurant from './models/Restaurant.js';
import connectDB from './config/db.js';

dotenv.config();

// Sample restaurant data
const restaurants = [
  {
    name: "Papa Joe's Pizza",
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
    cuisine: 'Italian, Pizza',
    priceRange: '$$',
    rating: 4.8,
    deliveryTime: '25-35 min',
    isFreeDelivery: true,
    category: 'Pizza',
    description: 'Authentic Italian pizza with fresh ingredients',
  },
  {
    name: 'Burger Palace',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
    cuisine: 'American, Burgers',
    priceRange: '$',
    rating: 4.6,
    deliveryTime: '20-30 min',
    isFreeDelivery: false,
    category: 'Burger',
    description: 'Juicy burgers and crispy fries',
  },
  {
    name: 'Tokyo Sushi Bar',
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600&q=80',
    cuisine: 'Japanese, Sushi',
    priceRange: '$$$',
    rating: 4.9,
    deliveryTime: '30-40 min',
    isFreeDelivery: true,
    category: 'Sushi',
    description: 'Fresh sushi and traditional Japanese cuisine',
  },
  {
    name: 'Taco Fiesta',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80',
    cuisine: 'Mexican, Tacos',
    priceRange: '$',
    rating: 4.5,
    deliveryTime: '15-25 min',
    isFreeDelivery: false,
    category: 'Tacos',
    description: 'Authentic Mexican street tacos',
  },
  {
    name: 'Noodle House',
    image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600&q=80',
    cuisine: 'Asian, Noodles',
    priceRange: '$$',
    rating: 4.7,
    deliveryTime: '25-35 min',
    isFreeDelivery: true,
    category: 'Noodles',
    description: 'Traditional Asian noodle dishes',
  },
  {
    name: 'Mighty Slice',
    image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96ca4?w=600&q=80',
    cuisine: 'Pizza, Italian',
    priceRange: '$$',
    rating: 4.4,
    deliveryTime: '30-40 min',
    isFreeDelivery: false,
    category: 'Pizza',
    description: 'New York style pizza slices',
  },
  {
    name: 'Sushi Express',
    image: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=600&q=80',
    cuisine: 'Japanese, Sushi',
    priceRange: '$$',
    rating: 4.6,
    deliveryTime: '20-30 min',
    isFreeDelivery: true,
    category: 'Sushi',
    description: 'Quick and fresh sushi rolls',
  },
  {
    name: 'The Burger Joint',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80',
    cuisine: 'American, Fast Food',
    priceRange: '$',
    rating: 4.3,
    deliveryTime: '15-25 min',
    isFreeDelivery: false,
    category: 'Burger',
    description: 'Classic American burgers',
  },
];

// Import data
const importData = async () => {
  try {
    await connectDB();
    
    // Clear existing data
    await Restaurant.deleteMany();
    
    // Insert sample data
    await Restaurant.insertMany(restaurants);
    
    console.log('✅ Data Imported Successfully');
    process.exit();
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await connectDB();
    await Restaurant.deleteMany();
    
    console.log('✅ Data Destroyed Successfully');
    process.exit();
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
};

// Run from command line
if (process.argv[2] === '-d') {
  deleteData();
} else {
  importData();
}
