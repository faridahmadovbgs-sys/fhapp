import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import User from '../models/User.js';
import demoAuthService from '../services/demoAuth.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// JWT secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyD5x5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "fhapp-ca321.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "fhapp-ca321",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "fhapp-ca321.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// Register new user with Firebase Auth + MongoDB
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required')
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

    const { email, password, firstName, lastName, organizationName, ein } = req.body;

    console.log('🔄 Starting registration for:', email);

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
      console.log('⚠️ MongoDB not connected, using demo auth service');
      const result = demoAuthService.register(email, password, `${firstName} ${lastName}`);
      return res.status(result.success ? 201 : 400).json(result);
    }

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    console.log('🔥 Creating Firebase Auth user...');

    // Step 1: Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUid = userCredential.user.uid;

    console.log('✅ Firebase user created:', firebaseUid);

    // Check if this is the first user (make them admin)
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    console.log('💾 Saving user to MongoDB...');

    // Step 2: Save user profile to MongoDB
    const newUser = new User({
      uid: firebaseUid, // Link to Firebase Auth user
      email: email.toLowerCase(),
      firstName,
      lastName,
      role: isFirstUser ? 'admin' : 'user', // First user becomes admin
      organizationName: organizationName || null,
      ein: ein || null,
      isActive: true
    });

    const savedUser = await newUser.save();

    console.log('✅ User saved to MongoDB:', savedUser._id);

    if (isFirstUser) {
      console.log(`🔑 First user registered as admin: ${email}`);
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: savedUser._id,
        uid: firebaseUid,
        email: savedUser.email,
        role: savedUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user without sensitive data
    const userResponse = {
      id: savedUser._id,
      uid: firebaseUid,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      role: savedUser.role,
      organizationName: savedUser.organizationName,
      createdAt: savedUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully in both Firebase and MongoDB',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('❌ Registration error:', error);

    // If MongoDB save failed, we should clean up the Firebase user
    // But for now, just log the error

    let message = 'Registration failed';
    if (error.code === 'auth/email-already-in-use') {
      message = 'An account with this email already exists';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password should be at least 6 characters';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address';
    }

    res.status(500).json({
      success: false,
      message,
      error: error.message
    });
  }
});

// Sync Firebase user to MongoDB (called after Firebase Auth creates user)
router.post('/sync-firebase-user', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('uid').notEmpty().withMessage('Firebase UID is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').optional()
], async (req, res) => {
  try {
    console.log('📥 Received sync request:', req.body);
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, uid, firstName, lastName, organizationName, ein, role } = req.body;

    console.log('🔄 Syncing Firebase user to MongoDB:', email, 'UID:', uid, 'Role:', role || 'user');
    console.log('📋 Organization details - Name:', organizationName, 'EIN:', ein);

    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    // Check if user already exists in MongoDB
    const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { uid }] });
    if (existingUser) {
      console.log('ℹ️ User already exists in MongoDB:', existingUser._id);
      
      // Update role if provided and different
      if (role && existingUser.role !== role) {
        existingUser.role = role;
        existingUser.organizationName = organizationName || existingUser.organizationName;
        existingUser.ein = ein || existingUser.ein;
        await existingUser.save();
        console.log(`✅ Updated user role to: ${role}`);
      }
      
      return res.status(200).json({
        success: true,
        message: 'User already exists in MongoDB',
        user: {
          id: existingUser._id,
          uid: existingUser.uid,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          role: existingUser.role
        }
      });
    }

    // Check if this is the first user (make them admin)
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;
    
    // Determine the role: use provided role, or admin if first user, otherwise user
    let userRole = 'user';
    if (role) {
      userRole = role;
    } else if (isFirstUser) {
      userRole = 'admin';
    }

    console.log('💾 Saving Firebase user to MongoDB with role:', userRole);

    // Create user in MongoDB
    const newUser = new User({
      uid,
      email: email.toLowerCase(),
      firstName: firstName || 'User',
      lastName: lastName || '',
      role: userRole,
      organizationName: organizationName || null,
      ein: ein || null,
      isActive: true
    });

    const savedUser = await newUser.save();

    console.log('✅ Firebase user synced to MongoDB:', savedUser._id);

    if (isFirstUser) {
      console.log(`🔑 First user registered as admin: ${email}`);
    }

    // Create JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    const token = jwt.sign(
      {
        userId: savedUser._id,
        uid: savedUser.uid,
        email: savedUser.email,
        role: savedUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user without sensitive data
    const userResponse = {
      id: savedUser._id,
      uid: savedUser.uid,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      role: savedUser.role,
      organizationName: savedUser.organizationName,
      createdAt: savedUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Firebase user synced to MongoDB successfully',
      user: userResponse,
      token
    });

  } catch (error) {
    console.error('❌ Firebase user sync error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to sync Firebase user to MongoDB',
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