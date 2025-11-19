import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import healthRoutes from './routes/health.js';
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import errorHandler from './middleware/errorHandler.js';
import checkDatabaseConnection from './middleware/checkDatabase.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB and setup demo user
let dbConnected = false;
connectDB().then(async (connected) => {
  dbConnected = connected;
  
  if (connected) {
    // Create demo user if it doesn't exist
    try {
      const User = (await import('./models/User.js')).default;
      const existingUser = await User.findOne({ email: 'demo@example.com' });
      
      if (!existingUser) {
        const demoUser = new User({
          name: 'Demo User',
          email: 'demo@example.com',
          password: 'demo123'
        });
        await demoUser.save();
        console.log('Demo user created: demo@example.com / demo123');
      } else {
        console.log('Demo user already exists: demo@example.com / demo123');
      }
    } catch (error) {
      console.log('Demo user setup skipped:', error.message);
    }
  }
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use('/api', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

// Error handling middleware (should be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});