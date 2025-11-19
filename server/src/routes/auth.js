import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import demoAuthService from '../services/demoAuth.js';

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

    const { email, password, name } = req.body;

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

    // Create new user
    const user = new User({
      name: name || email.split('@')[0], // Use email prefix as default name
      email,
      password
    });

    await user.save();

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

export default router;