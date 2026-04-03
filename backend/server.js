// server.js - Application Entry Point
const express = require('express');
const dotenv = require('dotenv');

// Load environment variables FIRST
dotenv.config();

const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('./src/config/passport');
const sanitizeInput = require('./src/middleware/sanitizeInput');

// Import database connection
const connectDB = require('./src/config/database');

// Import socket service
const { initializeSocket } = require('./src/services/socketService');

// Import keep alive
const keepAlive = require('./src/utils/keepAlive');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const restaurantRoutes = require('./src/routes/restaurantRoutes');
const menuRoutes = require('./src/routes/menuRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const partnerRoutes = require('./src/routes/partnerRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const couponRoutes = require('./src/routes/couponRoutes');
const deliveryPartnerRoutes = require('./src/routes/deliveryPartnerRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
const Restaurant = require('./src/models/Restaurant');

// Import error handler
const errorHandler = require('./src/middleware/errorHandler');

// Initialize Express app
const app = express();
app.disable('x-powered-by');

// Trust proxy - Required for Railway, Heroku, etc.
app.set('trust proxy', 1);

// Bootstrap: connect DB first, then start server
(async () => {
  await connectDB();

try {
  const [totalRestaurants, activeRestaurants, approvedRestaurants, sampleRestaurants] = await Promise.all([
    Restaurant.countDocuments({}),
    Restaurant.countDocuments({ isActive: true }),
    Restaurant.countDocuments({ isApproved: true }),
    Restaurant.find({})
      .select('name isActive isApproved address.city')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
  ]);

  console.log('🍽️ Restaurant debug snapshot:', JSON.stringify({
    totalRestaurants,
    activeRestaurants,
    approvedRestaurants,
    sampleRestaurants: sampleRestaurants.map((restaurant) => ({
      name: restaurant.name,
      city: restaurant.address?.city || '',
      isActive: restaurant.isActive,
      isApproved: restaurant.isApproved
    }))
  }, null, 2));
} catch (debugError) {
  console.warn('⚠️ Failed to load restaurant debug snapshot:', debugError.message);
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
})); // API server; CSP handled by frontend
// Note: express-mongo-sanitize v2.2.0 has compatibility issues with Express v5
// Consider using input validation instead or wait for library update
// app.use(mongoSanitize({ replaceWith: '_' })); // Sanitize data against NoSQL injection
// Note: xss-clean v0.1.4 also has compatibility issues with Express v5
// Use helmet's XSS protection and input validation instead
// app.use(xss()); // Prevent XSS attacks

// Rate limiting (global + sensitive routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  // Admin and auth have their own dedicated limiters.
  skip: (req) => req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 120 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many auth attempts. Please try again later.'
});

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 40 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many registration attempts. Please try again later.',
  keyGenerator: (req) => {
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    if (phone) return `register:phone:${phone}`;
    const safeIp = typeof rateLimit.ipKeyGenerator === 'function'
      ? rateLimit.ipKeyGenerator(req.ip)
      : req.ip;
    return `register:ip:${safeIp}`;
  }
});

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 25 : 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again later.',
  keyGenerator: (req) => {
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    if (phone) return `login:phone:${phone}`;
    const safeIp = typeof rateLimit.ipKeyGenerator === 'function'
      ? rateLimit.ipKeyGenerator(req.ip)
      : req.ip;
    return `login:ip:${safeIp}`;
  }
});

const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 60 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many payment requests. Please try again later.'
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 20 : 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many messages sent. Please try again later.'
});

app.use('/api/', globalLimiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://localhost',
  'https://flashbites.in',
  'https://www.flashbites.in',
  // Capacitor iOS/Android origins
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://api.razorpay.com',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Allow Capacitor schemes
    if (origin && (origin.startsWith('capacitor://') || origin.startsWith('ionic://'))) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow all localhost origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    console.warn(`⚠️  Blocked by CORS: ${origin}`);
    // Use null, false — NOT new Error() — to avoid generating 500 responses
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));
app.options('/{*any}', cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);

// Initialize Passport (JWT-only app; sessions are optional for OAuth flows)
app.use(passport.initialize());

const sessionsEnabled = process.env.ENABLE_SESSIONS === 'true';
if (sessionsEnabled) {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'flashbites-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));
  app.use(passport.session());
}

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentLimiter, paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/delivery', deliveryPartnerRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/location', locationRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FlashBites API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler (must be last)
app.use(errorHandler);

  // Start server
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`
  ╬═══════════════════════════════════════════╪
  ║   FlashBites Server Running              ║
  ║   Port: ${PORT}                            ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}              ║
  ║   Time: ${new Date().toLocaleString()}   ║
  ╚═══════════════════════════════════════════╝
  `);
    const io = initializeSocket(server);
    app.set('io', io);
    keepAlive();
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! ⚠️');
    console.error(err.name, err.message);
    if (process.env.NODE_ENV !== 'production') {
      server.close(() => process.exit(1));
    }
  });

  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => console.log('💥 Process terminated!'));
  });

})();

module.exports = app;
