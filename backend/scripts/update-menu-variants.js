#!/usr/bin/env node
/**
 * Update AMAZING PIZZA menu with variants (Half/Full, Regular/Medium/Large)
 * and add Pizza Mania section
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MenuItem = require('../src/models/MenuItem');
const Restaurant = require('../src/models/Restaurant');

const MONGO_URI = process.env.MONGO_URI;

async function updateMenuWithVariants() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find AMAZING PIZZA restaurant
    const restaurant = await Restaurant.findOne({ 
      name: { $regex: /amazing pizza/i },
      'address.city': 'Sidhauli'
    });

    if (!restaurant) {
      console.log('❌ AMAZING PIZZA restaurant not found');
      process.exit(1);
    }

    console.log(`✅ Found restaurant: ${restaurant.name}\n`);

    // Delete old pizza items without variants
    await MenuItem.deleteMany({
      restaurantId: restaurant._id,
      name: { $regex: /pizza.*\(.*\)/i }
    });

    console.log('🗑️  Removed old pizza items\n');

    // Add Pizza items with size variants
    const pizzaItems = [
      {
        name: 'Onion Pizza',
        description: 'Fresh onion topping with cheese and special sauce',
        category: 'Main Course',
        tags: ['Pizza'],
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
        isVeg: true,
        prepTime: 25,
        hasVariants: true,
        variants: [
          { name: 'Regular (7")', price: 99, isAvailable: true },
          { name: 'Medium (9")', price: 159, isAvailable: true },
          { name: 'Large (12")', price: 249, isAvailable: true }
        ]
      },
      {
        name: 'Tomato Pizza',
        description: 'Fresh tomato slices with cheese and herbs',
        category: 'Main Course',
        tags: ['Pizza'],
        image: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f',
        isVeg: true,
        prepTime: 25,
        hasVariants: true,
        variants: [
          { name: 'Regular (7")', price: 99, isAvailable: true },
          { name: 'Medium (9")', price: 159, isAvailable: true },
          { name: 'Large (12")', price: 249, isAvailable: true }
        ]
      },
      {
        name: 'Capsicum Pizza',
        description: 'Fresh capsicum with cheese and Italian seasonings',
        category: 'Main Course',
        tags: ['Pizza'],
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
        isVeg: true,
        prepTime: 25,
        hasVariants: true,
        variants: [
          { name: 'Regular (7")', price: 109, isAvailable: true },
          { name: 'Medium (9")', price: 179, isAvailable: true },
          { name: 'Large (12")', price: 279, isAvailable: true }
        ]
      },
      {
        name: 'Corn Pizza',
        description: 'Sweet corn kernels with cheese',
        category: 'Main Course',
        tags: ['Pizza'],
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e',
        isVeg: true,
        prepTime: 25,
        hasVariants: true,
        variants: [
          { name: 'Regular (7")', price: 119, isAvailable: true },
          { name: 'Medium (9")', price: 189, isAvailable: true },
          { name: 'Large (12")', price: 299, isAvailable: true }
        ]
      },
      {
        name: 'Paneer Pizza',
        description: 'Cottage cheese cubes with special sauce',
        category: 'Main Course',
        tags: ['Pizza'],
        image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e',
        isVeg: true,
        prepTime: 27,
        hasVariants: true,
        variants: [
          { name: 'Regular (7")', price: 129, isAvailable: true },
          { name: 'Medium (9")', price: 199, isAvailable: true },
          { name: 'Large (12")', price: 319, isAvailable: true }
        ]
      },
      {
        name: 'Mushroom Pizza',
        description: 'Fresh mushrooms with cheese and herbs',
        category: 'Main Course',
        tags: ['Pizza'],
        image: 'https://images.unsplash.com/photo-1572448862527-d3c904757de6',
        isVeg: true,
        prepTime: 27,
        hasVariants: true,
        variants: [
          { name: 'Regular (7")', price: 139, isAvailable: true },
          { name: 'Medium (9")', price: 219, isAvailable: true },
          { name: 'Large (12")', price: 339, isAvailable: true }
        ]
      }
    ];

    // Add Pizza Mania items (budget-friendly small pizzas)
    const pizzaManiaItems = [
      {
        name: 'Margherita Mania',
        description: 'Classic tomato sauce, mozzarella cheese and basil',
        category: 'Pizza Mania',
        tags: ['Pizza Mania', 'Budget'],
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
        isVeg: true,
        prepTime: 15,
        price: 79
      },
      {
        name: 'Corn & Cheese Mania',
        description: 'Sweet corn with double cheese',
        category: 'Pizza Mania',
        tags: ['Pizza Mania', 'Budget'],
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e',
        isVeg: true,
        prepTime: 15,
        price: 89
      },
      {
        name: 'Paneer Tikka Mania',
        description: 'Spicy paneer tikka with onions and capsicum',
        category: 'Pizza Mania',
        tags: ['Pizza Mania', 'Budget'],
        image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e',
        isVeg: true,
        prepTime: 18,
        price: 99
      },
      {
        name: 'Veggie Supreme Mania',
        description: 'Loaded with onion, capsicum, tomato and mushroom',
        category: 'Pizza Mania',
        tags: ['Pizza Mania', 'Budget'],
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
        isVeg: true,
        prepTime: 18,
        price: 99
      }
    ];

    // Add items with Half/Full variants (like Chinese dishes)
    const chineseItems = [
      {
        name: 'Veg Chowmein',
        description: 'Stir-fried noodles with vegetables',
        category: 'Main Course',
        tags: ['Chinese', 'Noodles'],
        image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246',
        isVeg: true,
        prepTime: 20,
        hasVariants: true,
        variants: [
          { name: 'Half', price: 79, isAvailable: true },
          { name: 'Full', price: 129, isAvailable: true }
        ]
      },
      {
        name: 'Paneer Chowmein',
        description: 'Noodles with cottage cheese and vegetables',
        category: 'Main Course',
        tags: ['Chinese', 'Noodles'],
        image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841',
        isVeg: true,
        prepTime: 20,
        hasVariants: true,
        variants: [
          { name: 'Half', price: 99, isAvailable: true },
          { name: 'Full', price: 159, isAvailable: true }
        ]
      },
      {
        name: 'Veg Fried Rice',
        description: 'Aromatic fried rice with mixed vegetables',
        category: 'Rice',
        tags: ['Chinese', 'Fried Rice'],
        image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b',
        isVeg: true,
        prepTime: 20,
        hasVariants: true,
        variants: [
          { name: 'Half', price: 89, isAvailable: true },
          { name: 'Full', price: 149, isAvailable: true }
        ]
      },
      {
        name: 'Paneer Fried Rice',
        description: 'Fried rice with paneer cubes',
        category: 'Rice',
        tags: ['Chinese', 'Fried Rice'],
        image: 'https://images.unsplash.com/photo-1516684669134-de6f7c473a2a',
        isVeg: true,
        prepTime: 22,
        hasVariants: true,
        variants: [
          { name: 'Half', price: 109, isAvailable: true },
          { name: 'Full', price: 179, isAvailable: true }
        ]
      }
    ];

    // Create all items
    const allItems = [
      ...pizzaItems.map(item => ({ ...item, restaurantId: restaurant._id })),
      ...pizzaManiaItems.map(item => ({ ...item, restaurantId: restaurant._id })),
      ...chineseItems.map(item => ({ ...item, restaurantId: restaurant._id }))
    ];

    // Delete old Chinese items without variants
    await MenuItem.deleteMany({
      restaurantId: restaurant._id,
      $or: [
        { name: 'Veg Chowmein' },
        { name: 'Paneer Chowmein' },
        { name: 'Veg Fried Rice' },
        { name: 'Paneer Fried Rice' }
      ]
    });

    await MenuItem.insertMany(allItems);

    console.log('✅ Menu updated with variants!\n');
    console.log(`   📦 ${pizzaItems.length} Pizza items with 3 size variants each`);
    console.log(`   🎉 ${pizzaManiaItems.length} Pizza Mania items (budget-friendly)`);
    console.log(`   🍜 ${chineseItems.length} Chinese items with Half/Full variants`);
    console.log('\n═══════════════════════════════════════════════════');
    console.log('🎉 Update Complete!');
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateMenuWithVariants();
