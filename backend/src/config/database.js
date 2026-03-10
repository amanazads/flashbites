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
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 8000,  // Fail fast — 8s not 30s
      socketTimeoutMS: 30000,
      connectTimeoutMS: 8000,
      maxIdleTimeMS: 30000,
      autoIndex: true,
      family: 4,                        // Force IPv4 — faster on most hosts
      heartbeatFrequencyMS: 5000,       // Check connection health every 5s
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
    
    // Retry connection after 5 seconds (was 10)
    setTimeout(() => {
      console.log('🔄 Retrying MongoDB connection...');
      connectDB();
    }, 5000);
  }
};

module.exports = connectDB;