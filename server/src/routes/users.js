import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// Middleware to check if user is admin (you might want to implement proper JWT middleware)
const requireAdmin = async (req, res, next) => {
  try {
    // For now, we'll check a simple header or implement your auth logic
    // In a real app, you'd validate JWT and check user role
    const userId = req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    req.currentUser = user;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

// GET /api/users - Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/users - Create new user
router.post('/', [
  body('name').notEmpty().trim().withMessage('Name is required'),
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

    const { name, email, password } = req.body;

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
      name,
      email,
      password
    });

    await user.save();

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/users/uid/:uid - Get user by Firebase UID
router.get('/uid/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user._id,
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationName: user.organizationName,
        organizationId: user.organizationId,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// PATCH /api/users/uid/:uid - Update user by Firebase UID
router.patch('/uid/:uid', async (req, res) => {
  try {
    const { organizationId, organizationName, ein } = req.body;
    
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (organizationId !== undefined) user.organizationId = organizationId;
    if (organizationName !== undefined) user.organizationName = organizationName;
    if (ein !== undefined) user.ein = ein;

    await user.save();

    console.log(`✅ Updated user ${user.email} with organizationId: ${organizationId}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        uid: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationName: user.organizationName,
        organizationId: user.organizationId,
        ein: user.ein,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/users/:id/permissions - Get user permissions
router.get('/:id/permissions', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Default permissions based on role
    const defaultPermissions = {
      user: {
        pages: {
          home: true,
          about: true,
          profile: true,
          admin: false,
          users: false,
          reports: false,
          settings: false
        },
        actions: {
          create_user: false,
          edit_user: false,
          delete_user: false,
          view_users: false,
          manage_roles: false,
          export_data: false,
          view_analytics: false,
          system_settings: false
        }
      },
      moderator: {
        pages: {
          home: true,
          about: true,
          profile: true,
          admin: false,
          users: true,
          reports: true,
          settings: false
        },
        actions: {
          create_user: false,
          edit_user: true,
          delete_user: false,
          view_users: true,
          manage_roles: false,
          export_data: true,
          view_analytics: true,
          system_settings: false
        }
      },
      admin: {
        pages: {
          home: true,
          about: true,
          profile: true,
          admin: true,
          users: true,
          reports: true,
          settings: true
        },
        actions: {
          create_user: true,
          edit_user: true,
          delete_user: true,
          view_users: true,
          manage_roles: true,
          export_data: true,
          view_analytics: true,
          system_settings: true
        }
      }
    };
    
    const permissions = user.permissions || defaultPermissions[user.role] || defaultPermissions.user;
    
    res.json({
      success: true,
      data: {
        role: user.role,
        permissions: permissions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// PUT /api/users/:id/permissions - Update user permissions (Admin only)
router.put('/:id/permissions', requireAdmin, [
  body('permissions').isObject().withMessage('Permissions must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.permissions = req.body.permissions;
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    
    res.json({
      success: true,
      message: 'User permissions updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// PUT /api/users/:id/role - Update user role (Admin only)
router.put('/:id/role', requireAdmin, [
  body('role').isIn(['user', 'moderator', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from changing their own role
    if (user._id.equals(req.currentUser._id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    user.role = req.body.role;
    // Clear custom permissions when role changes (use role-based defaults)
    user.permissions = undefined;
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    
    res.json({
      success: true,
      message: 'User role updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// PUT /api/users/:id/status - Toggle user active status (Admin only)
router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (user._id.equals(req.currentUser._id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own status'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    
    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/users/firebase-users - Get Firebase users (Admin only)
router.get('/firebase-users', async (req, res) => {
  try {
    // Since we don't have Firebase Admin SDK set up, we'll create a demo response
    // In production, this would fetch from Firebase Admin SDK
    
    const demoUsers = [
      {
        id: 'current-admin-user',
        email: 'admin@example.com',
        name: 'System Admin',
        emailVerified: true,
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastSignIn: new Date().toISOString(),
        photoURL: null
      },
      {
        id: 'demo-user-1', 
        email: 'user@example.com',
        name: 'Demo User',
        emailVerified: true,
        role: 'user',
        isActive: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastSignIn: new Date(Date.now() - 3600000).toISOString(),
        photoURL: null
      },
      {
        id: 'demo-moderator',
        email: 'moderator@example.com', 
        name: 'Demo Moderator',
        emailVerified: true,
        role: 'moderator',
        isActive: true,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        lastSignIn: new Date(Date.now() - 7200000).toISOString(),
        photoURL: null
      }
    ];

    res.json({
      success: true,
      data: demoUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/users/promote-to-admin - Promote current user to admin (for initial setup)
router.post('/promote-to-admin', async (req, res) => {
  try {
    const { email, userID } = req.body;
    
    if (!email && !userID) {
      return res.status(400).json({
        success: false,
        message: 'Email or User ID is required'
      });
    }

    // For Firebase users, we'll just return a success response
    // In a real app, this would update Firebase custom claims
    
    const promotedUser = {
      id: userID || 'firebase-user-id',
      email: email || 'promoted@example.com',
      name: email ? email.split('@')[0] : 'Promoted User',
      role: 'admin',
      emailVerified: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastSignIn: new Date().toISOString(),
      message: 'User has been promoted to admin successfully'
    };

    res.json({
      success: true,
      message: 'User promoted to admin successfully',
      data: promotedUser
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