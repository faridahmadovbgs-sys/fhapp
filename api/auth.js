import express from 'express';
import cors from 'cors';

// For serverless deployment, we'll create a simple response for now
const app = express();

// Middleware
app.use(cors({
  origin: ['https://fhapp-client-1pcdknm92-farids-projects-0239e101.vercel.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'FH App API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Temporary forgot password endpoint that returns the reset URL
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Generate a demo token (in production, this would be stored in database)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetUrl = `https://fhapp-client-1pcdknm92-farids-projects-0239e101.vercel.app/reset-password?token=${resetToken}&email=${email}`;

    // For now, return the reset URL directly (temporary solution)
    res.json({
      success: true,
      message: 'Password reset instructions sent to your email',
      resetUrl, // Temporary: return URL directly for testing
      note: 'Copy and paste this URL in your browser to reset password (temporary demo)'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// Temporary reset password endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, email, password } = req.body;
    
    if (!token || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token, email, and new password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // For demo purposes, accept any valid token format
    if (token.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// Demo login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Demo authentication
    if (email && password) {
      const token = 'demo-jwt-token-' + Date.now();
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: 'demo-user-id',
          email,
          name: email.split('@')[0]
        },
        token
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// Demo register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const token = 'demo-jwt-token-' + Date.now();
    res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: 'demo-user-id',
        email,
        name: name || email.split('@')[0]
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

export default app;