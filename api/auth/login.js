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
      console.log('Login request received:', {
        method: req.method,
        headers: req.headers,
        body: req.body
      });

      const { email, password } = req.body || {};
      
      if (!email || !password) {
        console.log('Missing email or password');
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      console.log('Login successful for:', email);
      const token = 'demo-jwt-token-' + Date.now();
      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: 'demo-user-id',
          email,
          name: email.split('@')[0]
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
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