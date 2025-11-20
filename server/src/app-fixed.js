import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import healthRoutes from './routes/health.js';
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import testRoutes from './routes/test.js';
import errorHandler from './middleware/errorHandler.js';
import checkDatabaseConnection from './middleware/checkDatabase.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database and setup
async function initializeApp() {
  try {
    // Connect to MongoDB
    const connected = await connectDB();
    
    if (connected) {
      console.log('✅ Database connected successfully');
      
      // Setup initial admin user
      try {
        const User = (await import('./models/User.js')).default;
        const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
        
        if (adminEmail) {
          const existingAdmin = await User.findOne({ email: adminEmail });
          if (existingAdmin && existingAdmin.role !== 'admin') {
            existingAdmin.role = 'admin';
            await existingAdmin.save();
            console.log(`✅ Promoted ${adminEmail} to admin`);
          } else if (!existingAdmin) {
            console.log(`⚠️ Admin user ${adminEmail} not found. Please register first.`);
          } else {
            console.log(`✅ Admin user ${adminEmail} already configured`);
          }
        }
        
        // Create demo user only in development
        if (process.env.NODE_ENV === 'development') {
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
        }
      } catch (error) {
        console.log('Initial user setup error:', error.message);
      }
    } else {
      console.log('⚠️ Database connection failed');
    }
  } catch (error) {
    console.log('Database initialization error:', error.message);
  }
}

// Initialize the database
initializeApp();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
})); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use('/api', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);

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
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});