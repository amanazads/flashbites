# 🍔 FLASHBITES - Food Delivery App

A modern, full-stack food delivery web application built with the MERN stack (MongoDB, Express.js, React.js, Node.js).

![FlashBites](https://img.shields.io/badge/MERN-Stack-green)
![Status](https://img.shields.io/badge/Status-Active-success)

## 🌟 Features

### Frontend
- ✅ Modern, responsive UI with Tailwind CSS
- ✅ Mobile-first design approach
- ✅ Category-based filtering
- ✅ Real-time search functionality
- ✅ Restaurant details page
- ✅ Wishlist management
- ✅ Bottom navigation bar
- ✅ Loading skeletons
- ✅ Clean, reusable components

### Backend
- ✅ RESTful API architecture
- ✅ MongoDB database integration
- ✅ Restaurant management
- ✅ Search & filter functionality
- ✅ Wishlist API endpoints
- ✅ Error handling middleware
- ✅ CORS enabled
- ✅ Environment variables configuration

## 🎨 Design Features

- **Primary Color**: #FF6B35 (Orange)
- **Background**: #F8F9FB (Light Gray)
- **Cards**: Rounded corners (20px) with soft shadows
- **Typography**: Inter font family
- **Icons**: React Icons library
- **Responsive**: Mobile, Tablet, and Desktop optimized

## 📂 Project Structure

```
flashbites/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   │   ├── Navbar.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── CategoryFilter.jsx
│   │   │   ├── DiscountBanner.jsx
│   │   │   ├── RestaurantCard.jsx
│   │   │   ├── BottomNavigation.jsx
│   │   │   └── LoadingSkeleton.jsx
│   │   ├── pages/         # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Search.jsx
│   │   │   ├── Orders.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── RestaurantDetails.jsx
│   │   ├── context/       # Global state
│   │   │   └── AppContext.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
│
└── server/                # Node.js Backend
    ├── config/
    │   └── db.js         # MongoDB connection
    ├── models/
    │   ├── User.js       # User schema
    │   └── Restaurant.js # Restaurant schema
    ├── controllers/
    │   ├── restaurantController.js
    │   └── userController.js
    ├── routes/
    │   ├── restaurantRoutes.js
    │   └── userRoutes.js
    ├── server.js         # Entry point
    ├── seeder.js         # Database seeder
    └── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB
- npm or yarn

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
NODE_ENV=development
```

4. Seed the database with sample data:
```bash
node seeder.js
```

5. Start the server:
```bash
npm run dev
```

Server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## 🔌 API Endpoints

### Restaurants
- `GET /api/restaurants` - Get all restaurants
- `GET /api/restaurants/:id` - Get single restaurant
- `GET /api/restaurants/category/:category` - Get by category
- `GET /api/restaurants/search?q=query` - Search restaurants
- `POST /api/restaurants` - Create new restaurant

### Users (Wishlist)
- `POST /api/users/wishlist/:restaurantId` - Toggle wishlist
- `GET /api/users/wishlist/:userId` - Get user wishlist

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router DOM** - Routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **React Icons** - Icon library
- **Context API** - State management

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **dotenv** - Environment variables
- **cors** - CORS middleware

## 📱 Pages

1. **Home** - Browse restaurants, categories, and promotions
2. **Search** - Search for restaurants and cuisines
3. **Orders** - View order history
4. **Profile** - User profile and settings
5. **Restaurant Details** - Detailed restaurant information

## 🎯 Key Components

- **Navbar** - Location display and notifications
- **SearchBar** - Restaurant search with debouncing
- **CategoryFilter** - Horizontal scrolling category pills
- **DiscountBanner** - Promotional banner
- **RestaurantCard** - Restaurant display with ratings, time, and wishlist
- **BottomNavigation** - Mobile-friendly bottom nav bar

## 🌐 Environment Variables

### Server (.env)
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/flashbites
JWT_SECRET=your_super_secret_jwt_key
NODE_ENV=development
```

## 📦 Database Models

### Restaurant
- name
- image
- cuisine
- priceRange ($, $$, $$$, $$$$)
- rating (0-5)
- deliveryTime
- isFreeDelivery
- category
- description
- location

### User
- name
- email
- password (hashed)
- wishlist (array of restaurant IDs)
- timestamps

## 🔐 Authentication (Skipped)

Authentication features are prepared but skipped as per requirements. The infrastructure includes:
- JWT token generation
- Password hashing with bcrypt
- User model with authentication methods
- Protected route middleware (ready to implement)

## 🎨 Design System

- **Primary Color**: `#FF6B35`
- **Secondary**: Light orange shades
- **Background**: `#F8F9FB`
- **Border Radius**: `20px` for cards
- **Shadows**: Soft, layered shadows
- **Font**: Inter (Google Fonts)

## 📄 License

This project is open source and available under the MIT License.

## 👨‍💻 Author

Built with ❤️ using the MERN Stack

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⭐ Show your support

Give a ⭐️ if you like this project!

---

**Happy Coding! 🚀**
