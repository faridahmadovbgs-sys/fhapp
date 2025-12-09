import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔥 FHApp Server with Firebase Only');
console.log('📱 Using Firebase for authentication and Firestore for data storage');
console.log('🎯 Firebase-only architecture');

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'FHApp Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      firebase: 'configured'
    },
    status: 'healthy'
  });
});

// Status route
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'Firebase-only architecture ready',
    features: {
      authentication: 'Firebase Auth',
      database: 'Firebase Firestore',
      authorization: 'Role-based permissions',
      frontend: 'React with Context API'
    },
    database: {
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
  console.log(`🎯 Frontend handles all auth via Firebase SDK`);
});