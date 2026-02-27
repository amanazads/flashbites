# FlashBites - Quick Start Guide

## 🚀 Quick Start (Easiest Method)

### Step 1: Set up MongoDB

**Option A: MongoDB Atlas (Recommended)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Update `server/.env` file with your MongoDB URI

**Option B: Local MongoDB**
```bash
# If you have MongoDB installed locally
mongod
```

The default `.env` is already configured for local MongoDB: `mongodb://localhost:27017/flashbites`

### Step 2: Seed the Database

```bash
cd server
node seeder.js
```

You should see: `✅ Data Imported Successfully`

### Step 3: Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### Step 4: Open the App

Open your browser and visit: `http://localhost:3000`

## 🎯 What You'll See

1. **Home Page** with:
   - Location header (New York, NY)
   - Search bar
   - Category filters (Pizza, Burger, Sushi, Tacos, Noodles)
   - 50% Discount banner
   - 8 sample restaurants with images

2. **Features to Test**:
   - Click categories to filter restaurants
   - Search for restaurants
   - Click heart icon to add to wishlist
   - Click restaurant card to view details
   - Navigate using bottom navigation bar

## 🔧 Troubleshooting

### Port Already in Use

If port 3000 or 5000 is busy:

**Backend (port 5000):**
Edit `server/.env`:
```
PORT=5001
```

**Frontend (port 3000):**
Edit `client/vite.config.js`:
```js
server: {
  port: 3001,
}
```

### MongoDB Connection Error

Make sure:
- MongoDB is running (if using local)
- Connection string is correct in `server/.env`
- Your IP is whitelisted (if using MongoDB Atlas)

### Dependencies Issues

```bash
# Reinstall dependencies
cd server && rm -rf node_modules package-lock.json && npm install
cd ../client && rm -rf node_modules package-lock.json && npm install
```

## 📱 Testing the App

1. **Filter by Category**: Click "Pizza" to see only pizza restaurants
2. **Search**: Type "sushi" in search bar
3. **Wishlist**: Click heart icons on restaurant cards
4. **Details**: Click any restaurant to see full details
5. **Navigation**: Use bottom nav to explore different pages

## 🎨 Customization

### Change Primary Color

Edit `client/tailwind.config.js`:
```js
colors: {
  primary: '#FF6B35', // Change this to your color
}
```

### Add More Restaurants

Edit `server/seeder.js` and add more restaurants to the array, then run:
```bash
node seeder.js
```

## 📊 Sample Data Included

The seeder includes 8 restaurants:
- Papa Joe's Pizza (Pizza, Free Delivery)
- Burger Palace (Burger)
- Tokyo Sushi Bar (Sushi, Free Delivery)
- Taco Fiesta (Tacos)
- Noodle House (Noodles, Free Delivery)
- Mighty Slice (Pizza)
- Sushi Express (Sushi, Free Delivery)
- The Burger Joint (Burger)

## 🌟 Next Steps

- Add your own restaurants via the API
- Customize the UI colors and styling
- Add authentication (infrastructure is ready)
- Deploy to production

Enjoy your FlashBites app! 🍕🍔🍣
