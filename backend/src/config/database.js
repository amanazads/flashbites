const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    // Check if MONGO_URI is defined
    if (!process.env.MONGO_URI) {
      console.error(`
      ╔═══════════════════════════════════════════╗
      ║   ❌ MONGO_URI NOT CONFIGURED            ║
      ║                                           ║
      ║   Please add MONGO_URI environment       ║
      ║   variable in your Railway dashboard     ║
      ╚═══════════════════════════════════════════╝
      `);
      throw new Error('MONGO_URI environment variable is not defined');
    }

    // Log connection attempt (hide password)
    const uriForLog = process.env.MONGO_URI.replace(/:([^:@]{8})[^:@]*@/, ':****@');
    console.log('🔄 Attempting MongoDB connection to:', uriForLog);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Options for better connection handling
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxIdleTimeMS: 30000,
      autoIndex: process.env.NODE_ENV !== 'production',
      family: 4 // Force IPv4
    });

    console.log(`
    ╔═══════════════════════════════════════════╗
    ║   MongoDB Connected Successfully         ║
    ║   Host: ${conn.connection.host}          ║
    ║   Database: ${conn.connection.name}      ║
    ╚═══════════════════════════════════════════╝
    `);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    // Don't exit process - allow server to start and handle errors gracefully
    console.warn('⚠️  Server will start but database operations will fail until MongoDB is connected');
    
    // Retry connection after 10 seconds
    setTimeout(() => {
      console.log('🔄 Retrying MongoDB connection...');
      connectDB();
    }, 10000);
  }
};

module.exports = connectDB;