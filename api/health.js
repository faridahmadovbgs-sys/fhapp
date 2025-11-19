export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ 
      status: 'success', 
      message: 'FH App API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production'
    });
  } else if (req.method === 'POST') {
    // Handle login
    try {
      const { email, password } = req.body;
      
      // Demo authentication
      if (email && password) {
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
  } else {
    res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
}