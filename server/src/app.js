import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRouter from './routes/auth.js';
import invitationsRouter from './routes/invitations.js';
import usersRouter from './routes/users.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔥 FHApp Server with Firebase Auth + MongoDB');
console.log('📱 Using Firebase for authentication and MongoDB for data storage');
console.log('🎯 Full-stack integration: Auth + Database');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/integrant';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.log('⚠️ Server will continue with limited functionality');
  }
};

connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
})); // Enable CORSFa
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check route
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    success: true,
    message: 'FHApp Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      mongodb: dbStatus,
      firebase: 'configured'
    },
    status: dbStatus === 'connected' ? 'healthy' : 'degraded'
  });
});

// API routes
app.use('/api/auth', authRouter); // Authentication routes (Firebase + MongoDB)
app.use('/api/invitations', invitationsRouter);
app.use('/api/users', usersRouter); // User management routes

// Status route
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'Firebase Auth + MongoDB integration ready',
    features: {
      authentication: 'Firebase Auth',
      database: 'MongoDB with Firebase Auth integration',
      authorization: 'Role-based permissions',
      frontend: 'React with Context API'
    },
    database: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      firebase: 'configured'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableRoutes: [
      'GET /api/health',
      'GET /api/status',
      'GET /api/users'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`🔥 Firebase integration: Active`);
  console.log(`🎯 Authorization: Frontend Context + Firebase`);
});