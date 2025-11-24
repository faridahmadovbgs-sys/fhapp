import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import demoAuthService from '../services/demoAuth.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// JWT secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password, name, organizationName, ein } = req.body;

    // Validate EIN format if provided
    if (ein) {
      const einPattern = /^\d{2}-?\d{7}$/;
      const cleanEin = ein.replace(/-/g, '');
      if (!einPattern.test(cleanEin)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid EIN format. Must be XX-XXXXXXX (9 digits)'
        });
      }
    }

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Use demo auth service
      const result = demoAuthService.register(email, password, name);
      return res.status(result.success ? 201 : 400).json(result);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if this is the first user (make them admin)
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    // Create new user
    const user = new User({
      name: name || email.split('@')[0], // Use email prefix as default name
      email,
      password,
      role: isFirstUser ? 'admin' : 'user', // First user becomes admin
      organizationName: organizationName || null,
      ein: ein || null
    });

    await user.save();

    if (isFirstUser) {
      console.log(`🔑 First user registered as admin: ${email}`);
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user without password
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Use demo auth service
      const result = demoAuthService.login(email, password);
      return res.status(result.success ? 200 : 401).json(result);
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user without password
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

// Get current user (protected route)
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Get demo users (for development)
router.get('/demo-users', (req, res) => {
  try {
    let demoUsers;
    
    if (mongoose.connection.readyState !== 1) {
      // Get demo users from in-memory store
      demoUsers = demoAuthService.getDemoUsers();
    } else {
      // Default demo users when database is available
      demoUsers = [
        { email: 'demo@example.com', password: 'demo123' },
        { email: 'test@example.com', password: 'test123' }
      ];
    }

    res.json({
      success: true,
      message: 'Available demo users',
      users: demoUsers,
      note: 'These are demo credentials for testing the application'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting demo users',
      error: error.message
    });
  }
});

// Forgot password - Send reset email
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Demo mode - simulate sending reset email
      console.log(`\n📧 DEMO: Password reset requested for ${email}`);
      console.log('Reset URL: http://localhost:3000/reset-password?token=demo-reset-token&email=' + email);
      
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive reset instructions.',
        demo: true
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // Always return success message for security (don't reveal if email exists)
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive reset instructions.'
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send reset email
    const emailResult = await emailService.sendPasswordResetEmail(
      user.email, 
      resetToken, 
      user.name
    );

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Password reset instructions have been sent to your email.',
        ...(process.env.NODE_ENV === 'development' && { resetUrl: emailResult.resetUrl })
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again.'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while processing request'
    });
  }
});

// Reset password with token
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { token, email, password } = req.body;

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      // Demo mode - simulate password reset
      if (token === 'demo-reset-token') {
        return res.json({
          success: true,
          message: 'Password has been reset successfully! (Demo mode)',
          demo: true
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Check if token is valid
    if (!user.isResetTokenValid(token)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while resetting password'
    });
  }
});

export default router;