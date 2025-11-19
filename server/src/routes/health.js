import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running successfully!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
router.get('/info', (req, res) => {
  res.json({
    success: true,
    name: 'FH App API',
    version: '1.0.0',
    description: 'Full-stack web application API',
    endpoints: [
      'GET /api/health - Health check',
      'GET /api/info - API information',
      'GET /api/users - Get all users',
      'POST /api/users - Create new user'
    ]
  });
});

export default router;