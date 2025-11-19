// Middleware to check database connection
const checkDatabaseConnection = (req, res, next) => {
  // Routes that don't require database
  const publicRoutes = ['/api/health', '/api/info'];
  
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  // Check if we're trying to access database-dependent routes
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/users')) {
    // Check mongoose connection state
    const mongoose = require('mongoose');
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable. Please start MongoDB and restart the server.',
        hint: 'This is a demo application. The server is running but database features require MongoDB.'
      });
    }
  }

  next();
};

export default checkDatabaseConnection;