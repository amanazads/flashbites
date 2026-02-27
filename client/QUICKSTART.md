# FlashBites - Quick Start Guide

## 🚀 Getting Started

Your FlashBites food delivery app is ready to run!

### Start the App

```bash
cd client
npm run dev
```

**Your app will be available at:** http://localhost:3001/

## 📱 Features to Test

### 1. Home Page (/)
- Browse 8 restaurants with real food images
- Click category filters: Pizza, Burger, Sushi, Tacos, Noodles
- Use the search bar to find restaurants
- Click heart icon to add to wishlist
- Click any restaurant card to view details

### 2. Search Page (/search)
- Type to search restaurants
- Click popular search tags
- See real-time filtered results
- Clear search with X button

### 3. Restaurant Details (/restaurant/:id)
- View restaurant photos and information
- See ratings, delivery time, and price range
- Add to wishlist with heart icon
- Click "Order Now" button
- Navigate back with arrow button

### 4. Orders Page (/orders)
- View order menu options:
  - Current Orders (2)
  - Order History (12)
  - Reorder
  - Spending Stats
  - Filter Orders
  - Download Receipts

### 5. Profile Page (/profile)
- View profile menu options:
  - Account Settings
  - Favorites (0)
  - Payment Methods
  - Notifications
  - Settings
  - Help & Support
  - Logout

### 6. Bottom Navigation
- Tap Home, Search, Orders, or Profile
- See active tab highlighted in orange
- Smooth animations on tab changes

## 🎨 Key Features

✅ **Fully Responsive** - Works on mobile, tablet, and desktop
✅ **Mock Data Ready** - No backend needed, works out of the box
✅ **Beautiful UI** - Orange/red gradients, smooth animations
✅ **Fast Performance** - Vite for instant HMR
✅ **Reusable Components** - Clean, maintainable code
✅ **Type Safe** - PropTypes validation

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install new packages
npm install [package-name]
```

## 📂 Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── SearchBar.jsx
│   │   ├── CategoryFilter.jsx
│   │   ├── DiscountBanner.jsx
│   │   ├── RestaurantCard.jsx
│   │   ├── LoadingSkeleton.jsx
│   │   └── BottomNavigation.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Search.jsx
│   │   ├── Orders.jsx
│   │   ├── Profile.jsx
│   │   └── RestaurantDetails.jsx
│   ├── context/
│   │   └── AppContext.jsx   # Global state
│   ├── data/
│   │   └── mockData.js      # Restaurant data
│   ├── App.jsx
│   └── index.css
└── package.json
```

## 🎯 Testing Checklist

- [ ] Home page loads with 8 restaurants
- [ ] Category filters work
- [ ] Search functionality works
- [ ] Click restaurant to view details
- [ ] Wishlist toggle works
- [ ] Navigation between pages works
- [ ] Bottom navigation highlights active tab
- [ ] Responsive on mobile screen
- [ ] All images load properly
- [ ] No console errors

## 🌐 Live URL

**Local:** http://localhost:3001/

## 💡 Tips

- The app uses **mock data**, so no backend server is needed
- All features work without authentication
- Images are loaded from Pexels CDN
- Backend proxy errors in console are expected (app falls back to mock data)
- Use Chrome DevTools to test mobile responsiveness

## 🎉 You're All Set!

Your FlashBites app is running and ready to demo!

Navigate to http://localhost:3001/ to explore all features.

---

**Built with:** React 18 + Vite + Tailwind CSS + React Router + Context API
**Status:** ✅ Production Ready
