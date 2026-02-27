# FlashBites Server

Backend API for FlashBites Food Delivery Application

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file in the server root directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

3. Seed the database with sample restaurants:
```bash
node seeder.js
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Restaurants
- `GET /api/restaurants` - Get all restaurants
- `GET /api/restaurants/:id` - Get single restaurant
- `GET /api/restaurants/category/:category` - Get restaurants by category
- `GET /api/restaurants/search?q=query` - Search restaurants
- `POST /api/restaurants` - Create new restaurant

### Users
- `POST /api/users/wishlist/:restaurantId` - Add/Remove from wishlist
- `GET /api/users/wishlist/:userId` - Get user wishlist

## Tech Stack
- Node.js
- Express.js
- MongoDB
- Mongoose
