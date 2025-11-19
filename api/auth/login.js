export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
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

      // Check if this is login or register based on presence of name field
      const isRegister = name !== undefined;
      
      const token = 'demo-jwt-token-' + Date.now();
      res.status(200).json({
        success: true,
        message: isRegister ? 'Registration successful' : 'Login successful',
        user: {
          id: 'demo-user-id',
          email,
          name: name || email.split('@')[0]
        },
        token
      });
    } catch (error) {
      console.error('Auth error:', error);
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