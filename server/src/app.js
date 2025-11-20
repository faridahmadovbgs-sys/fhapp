import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import invitationsRouter from './routes/invitations.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🔥 Firebase-based FHApp Server');
console.log('📱 Using Firebase for authentication and database');
console.log('🎯 Authorization system integrated with frontend');

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
})); // Enable CORS
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
    database: 'Firebase',
    status: 'healthy'
  });
});

// API routes for Firebase integration
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'Firebase-based authorization system ready',
    features: {
      authentication: 'Firebase Auth',
      database: 'Firebase Firestore',
      authorization: 'Role-based permissions',
      frontend: 'React with Context API'
    }
  });
});

// Firebase user management endpoint (placeholder for Firebase integration)
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    message: 'Firebase user management handled by frontend',
    note: 'User permissions are managed through Firebase Firestore'
  });
});

// Invitations API routes
app.use('/api/invitations', invitationsRouter);

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