export default function handler(req, res) {
  // Enable CORS with more permissive settings
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      // Log the request for debugging
      console.log('Register request received:', {
        method: req.method,
        headers: req.headers,
        body: req.body
      });

      const { email, password, name } = req.body || {};
      
      if (!email || !password) {
        console.log('Missing email or password');
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      if (password.length < 6) {
        console.log('Password too short');
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      console.log('Registration successful for:', email);
      const token = 'demo-jwt-token-' + Date.now();
      res.status(200).json({
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
        message: 'Server error occurred',
        error: error.message
      });
    }
  } else {
    res.status(405).json({
      success: false,
      message: 'Method not allowed. Expected POST, got ' + req.method
    });
  }
}