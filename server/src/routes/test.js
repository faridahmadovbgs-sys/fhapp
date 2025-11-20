import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Test endpoint to create sample users with different roles
router.post('/create-test-users', async (req, res) => {
  try {
    // Create sample users for testing
    const testUsers = [
      {
        name: 'Test User',
        email: 'user@test.com',
        password: 'password123',
        role: 'user'
      },
      {
        name: 'Test Moderator', 
        email: 'moderator@test.com',
        password: 'password123',
        role: 'moderator'
      },
      {
        name: 'Test Admin',
        email: 'admin@test.com', 
        password: 'password123',
        role: 'admin'
      }
    ];

    const createdUsers = [];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        createdUsers.push({
          name: user.name,
          email: user.email,
          role: user.role
        });
      }
    }

    res.json({
      success: true,
      message: 'Test users created successfully',
      users: createdUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating test users',
      error: error.message
    });
  }
});

// Get current user info for testing
router.get('/me', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID header required'
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

export default router;